import * as cheerio from "cheerio";
import { resolveCrawlPolicy } from "../../features/acquisition/domain/policy";
import { safeFetch } from "../../features/acquisition/infrastructure/http/safe-fetcher";
import { CrawlError } from "../../features/acquisition/domain/errors";

/**
 * Parses the HTML of a seed URL, extracts links, resolves relative paths,
 * filters links by matching the seed's hostname, removes duplicates, and returns a list of unique absolute URLs.
 * Falls back to hardcoded mock links if URL contains "mock.com" or USE_MOCK_CRAWLER=true.
 */
export async function extractSeedLinks(
  seedUrl: string,
  maxLinks: number = 5
): Promise<string[]> {
  const useMock =
    process.env.USE_MOCK_CRAWLER === "true" ||
    seedUrl.toLowerCase().includes("mock.com");

  if (useMock) {
    // Generate realistic mock URLs based on the hostname of the seed URL
    let base = "https://mock.com";
    try {
      const parsedSeed = new URL(seedUrl);
      base = `${parsedSeed.protocol}//${parsedSeed.hostname}`;
    } catch {
      // Keep mock.com if seedUrl parsing fails
    }

    const mockPaths = ["/news/1", "/blog/2", "/articles/3", "/about", "/contact"];
    const mockUrls = mockPaths.map((path) => `${base}${path}`);
    return mockUrls.slice(0, maxLinks);
  }

  try {
    const seedParsed = new URL(seedUrl);
    const seedHostname = seedParsed.hostname.toLowerCase();

    const policy = resolveCrawlPolicy({
      maxRedirects: 3,
      followRedirects: true,
      requestTimeoutMs: 10000,
      allowedContentTypes: [
        "text/html",
        "application/xhtml+xml",
        "application/xml",
        "text/xml"
      ]
    });

    // Support injection of test-only options like hostValidator or resolver for unit testing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testOptions = (globalThis as any).__CRAWLER_TEST_OPTIONS__ || {};

    const response = await safeFetch(seedUrl, {
      policy,
      ...testOptions
    });

    const html = response.body.toString("utf-8");
    const $ = cheerio.load(html);
    const discoveredUrlsSet = new Set<string>();

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href")?.trim();
      if (!href) return;

      try {
        // Resolve relative links relative to the seed URL base
        const absoluteUrl = new URL(href, seedUrl).toString();
        const parsedUrl = new URL(absoluteUrl);

        // Ensure we only process http and https protocols
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return;
        }

        // Enforce strict hostname match to avoid crawling other websites
        if (parsedUrl.hostname.toLowerCase() === seedHostname) {
          // Normalize URL: remove hash/fragment to ensure uniqueness
          parsedUrl.hash = "";
          discoveredUrlsSet.add(parsedUrl.toString());
        }
      } catch {
        // Ignore invalid hrefs
      }
    });

    return Array.from(discoveredUrlsSet).slice(0, maxLinks);
  } catch (error) {
    if (error instanceof CrawlError) {
      if (error.code === "SSRF_BLOCKED") {
        throw new Error(`SSRF Blocked: URL ${seedUrl} is not allowed.`);
      }
      throw new Error(`LinkDiscoveryError: Failed to extract links from ${seedUrl}. Details: ${error.message}`);
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`LinkDiscoveryError: Failed to extract links from ${seedUrl}. Details: ${errorMsg}`);
  }
}

export class LinkDiscoveryService {
  /**
   * Instance wrapper of extractSeedLinks
   */
  public async extractSeedLinks(url: string, maxLinks: number = 5): Promise<string[]> {
    return extractSeedLinks(url, maxLinks);
  }
}
