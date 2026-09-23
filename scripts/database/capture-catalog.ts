import fs from "fs";
import path from "path";
import { captureDatabaseCatalog } from "../../src/core/database/catalog-capture";

async function main() {
  console.log("=========================================================================");
  console.log("DB-001: READ-ONLY DATABASE CATALOG & MIGRATION TRUTH CAPTURE");
  console.log("=========================================================================\n");

  const snapshot = await captureDatabaseCatalog();

  console.log(`Classification        : ${snapshot.classification.toUpperCase()}`);
  console.log(`Classification Reason : ${snapshot.classificationReason}`);
  console.log(`Target Identity       : ${snapshot.targetIdentity.normalizedIdentity || "Unavailable"}`);
  console.log(`Connected Role        : ${snapshot.targetIdentity.connectedRole || "N/A"}`);
  console.log(`Role SuperUser        : ${snapshot.targetIdentity.isSuperUser ?? "N/A"}`);
  console.log(`Role Bypass RLS       : ${snapshot.targetIdentity.bypassesRls ?? "N/A"}`);
  console.log(`Role RLS Safe         : ${snapshot.targetIdentity.isRlsSafe ?? "N/A"}`);
  console.log(`Lineage Reconciled    : ${snapshot.lineageReconciled}`);
  console.log(`Drizzle Records Count : ${snapshot.drizzleMigrationRecords.length}`);
  console.log(`Journal Entries Count : ${snapshot.canonicalJournalEntries.length}`);
  console.log(`Legacy Artifacts      : ${snapshot.legacyArtifactsDetected ? snapshot.legacyArtifactDetails.join("; ") : "None"}`);
  console.log(`Public Tables Count   : ${snapshot.tables.length}`);
  console.log(`RLS Policies Count    : ${snapshot.policies.length}`);
  console.log(`Extensions Count      : ${snapshot.extensions.length}`);

  if (snapshot.unknownOrInconsistencyReasons.length > 0) {
    console.log("\nInconsistencies / Warnings:");
    snapshot.unknownOrInconsistencyReasons.forEach((r) => console.log(`  - ${r}`));
  }

  const reportsDir = path.resolve(process.cwd(), "official_audits/database/reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const jsonReportPath = path.join(reportsDir, "report_catalog_capture.json");
  const txtReportPath = path.join(reportsDir, "report_catalog_capture.txt");

  fs.writeFileSync(jsonReportPath, JSON.stringify(snapshot, null, 2), "utf-8");

  const txtContent = `DB-001 CATALOG CAPTURE REPORT
Date: ${new Date().toISOString()}

CLASSIFICATION: ${snapshot.classification.toUpperCase()}
REASON: ${snapshot.classificationReason}

TARGET IDENTITY: ${snapshot.targetIdentity.normalizedIdentity || "Unavailable"}
CONNECTED ROLE: ${snapshot.targetIdentity.connectedRole || "N/A"}
SUPERUSER: ${snapshot.targetIdentity.isSuperUser ?? "N/A"}
BYPASS RLS: ${snapshot.targetIdentity.bypassesRls ?? "N/A"}
RLS SAFE: ${snapshot.targetIdentity.isRlsSafe ?? "N/A"}

LINEAGE RECONCILED: ${snapshot.lineageReconciled}
DRIZZLE MIGRATIONS COUNT: ${snapshot.drizzleMigrationRecords.length}
CANONICAL JOURNAL ENTRIES: ${snapshot.canonicalJournalEntries.length}
LEGACY ARTIFACTS: ${snapshot.legacyArtifactsDetected ? snapshot.legacyArtifactDetails.join("; ") : "None"}

PUBLIC TABLES (${snapshot.tables.length}):
${snapshot.tables.map((t) => `  - ${t}`).join("\n")}

EXTENSIONS (${snapshot.extensions.length}):
${snapshot.extensions.map((e) => `  - ${e.extName} (${e.extVersion})`).join("\n")}

INCONSISTENCY REASONS:
${snapshot.unknownOrInconsistencyReasons.map((r) => `  - ${r}`).join("\n") || "None"}
`;

  fs.writeFileSync(txtReportPath, txtContent, "utf-8");

  console.log(`\nReport saved to: ${jsonReportPath}`);
  console.log(`Report saved to: ${txtReportPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Catalog capture script error:", err);
    process.exit(1);
  });
}
