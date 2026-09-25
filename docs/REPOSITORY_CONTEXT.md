# Repository Context

## 1. Repository Identity

- **Name:** `ai-branding-platform` / `oxenn` (اوژن) [VERIFIED CURRENT]
- **Version:** `0.1.0` [VERIFIED CURRENT]
- **Primary Domain & Purpose:** Brand intelligence and SEO analysis platform designed for AI-driven search engines (AEO/GEO - Answer Engine Optimization / Generative Engine Optimization). Monitors, analyzes, and optimizes brand visibility across Large Language Models (LLMs) and generative search engines. [VERIFIED CURRENT]
- **Target Audience:** SEO professionals, marketing managers, and technical growth teams requiring deep analytics on how AI search models perceive brand content and authority. [VERIFIED CURRENT]
- **Primary Language & Localization:** Bilingual platform supporting Persian (`fa`, default locale) and English (`en`), with Right-to-Left (RTL) layout support. [VERIFIED CURRENT]

---

## 2. Technology Stack

### Core Frameworks & Runtime
- **Runtime Environment:** Node.js (`v22.22.1`) [VERIFIED CURRENT]
- **Package Manager:** `pnpm` (version `10.30.3`, lockfile: `pnpm-lock.yaml`) [VERIFIED CURRENT]
- **Full-Stack Framework:** Next.js `16.2.11` (App Router architecture with React 19) [VERIFIED CURRENT]
- **React Version:** `19.2.4` [VERIFIED CURRENT]
- **Language:** TypeScript `^5.9.3` (`tsconfig.json` using `"moduleResolution": "bundler"`, `"target": "ES2017"`, and `@/*` alias pointing to `./src/*`) [VERIFIED CURRENT]

### Database & ORM
- **Database Engine:** PostgreSQL with Row-Level Security (RLS) and `pgvector` extension support [VERIFIED CURRENT]
- **ORM:** Drizzle ORM `^0.45.2` with Drizzle Kit `^0.31.10` [VERIFIED CURRENT]
- **PostgreSQL Client Driver:** `pg` `^8.22.0` (`@types/pg` `^8.20.0`) [VERIFIED CURRENT]

### Frontend & Styling
- **Styling Engine:** Tailwind CSS `^4` configured via `@tailwindcss/postcss` in `postcss.config.mjs` and `@import "tailwindcss";` in `src/app/globals.css` [VERIFIED CURRENT]
- **UI Libraries:** `@base-ui/react` `^1.6.0`, `lucide-react` `^1.26.0`, `framer-motion` `^12.42.2` [VERIFIED CURRENT]
- **Data Visualization & Graphs:** `recharts` `^3.10.1`, `@xyflow/react` `^12.11.2` [VERIFIED CURRENT]
- **Utility Libraries:** `class-variance-authority` `^0.7.1`, `clsx` `^2.1.1`, `tailwind-merge` `^3.6.0`, `dompurify` `^3.4.14` [VERIFIED CURRENT]

### AI & Data Acquisition
- **AI SDK:** `@ai-sdk/google` `^4.0.24`, `ai` `^7.0.37` (Gemini-1.5-Pro / Gemini integration) [VERIFIED CURRENT]
- **Web Crawling:** `@mendable/firecrawl-js` `^4.31.1`, `cheerio` `^1.2.0`, `html-to-text` `^10.0.0` [VERIFIED CURRENT]

### Infrastructure & Services
- **Background Job Orchestration:** `inngest` `^4.18.1` [VERIFIED CURRENT]
- **Caching & KV Store:** `@upstash/redis` `^1.38.2` [VERIFIED CURRENT]
- **Transactional Email:** `resend` `^6.25.0` [VERIFIED CURRENT]
- **Security & Hashing:** `argon2` `^0.45.1` [VERIFIED CURRENT]
- **Validation:** `zod` `^4.4.3` [VERIFIED CURRENT]
- **Analytics:** `@vercel/analytics` `1.6.1` [VERIFIED CURRENT]

---

## 3. Repository Structure

```
.
├── .circleci/                      # CI/CD configurations [VERIFIED CURRENT]
├── components/                     # Supplementary UI components (e.g. live-analytics, navigation, ui) [VERIFIED CURRENT]
├── database/                       # Database layer definitions, schemas, and migrations [VERIFIED CURRENT]
│   ├── drizzle/                    # Drizzle migration files (SQL) and metadata snapshots [VERIFIED CURRENT]
│   ├── migrations/                 # Hand-written or legacy migration scripts [VERIFIED CURRENT]
│   └── schema/                     # TypeScript schema definitions [VERIFIED CURRENT]
│       ├── admin/                  # System & admin schemas [VERIFIED CURRENT]
│       ├── index.ts                # Main schema barrel & inline schemas [VERIFIED CURRENT]
│       └── *.ts                    # Modular table definitions [VERIFIED CURRENT]
├── docs/                           # Architecture specs, task reports, and technical documentation [VERIFIED CURRENT]
│   ├── api/                        # API specifications [VERIFIED CURRENT]
│   ├── architecture/               # System architecture and design docs [VERIFIED CURRENT]
│   ├── lint/                       # Linting baseline and remediation reports [VERIFIED CURRENT]
│   ├── product/                    # Product documentation [VERIFIED CURRENT]
│   ├── security/                   # Security and RBAC models [VERIFIED CURRENT]
│   ├── services/                   # Service documentation [VERIFIED CURRENT]
│   ├── tasks_reports/              # Execution and audit reports [VERIFIED CURRENT]
│   └── user-guides/                # End-user guides [VERIFIED CURRENT]
├── font/                           # Custom local font assets [VERIFIED CURRENT]
├── lib/                            # Root-level utility re-export (`lib/utils.ts`) [VERIFIED CURRENT]
├── official_audits/                # Authoritative forensic audit records [VERIFIED CURRENT]
│   ├── database/                   # Database audit reports and raw evidence [VERIFIED CURRENT]
│   └── front-end/                  # Frontend baseline audit [VERIFIED CURRENT]
├── public/                         # Static web assets [VERIFIED CURRENT]
├── scripts/                        # Maintenance, crawl workers, and database guard scripts [VERIFIED CURRENT]
├── src/                            # Application source code [VERIFIED CURRENT]
│   ├── app/                        # Next.js App Router (pages, actions, api routes) [VERIFIED CURRENT]
│   │   ├── [locale]/               # Localized route tree (fa, en) [VERIFIED CURRENT]
│   │   ├── actions/                # Server Actions for auth, audits, intelligence [VERIFIED CURRENT]
│   │   ├── api/                    # REST API endpoints & Inngest webhooks [VERIFIED CURRENT]
│   │   └── globals.css             # Tailwind CSS import, themes, & utility directives [VERIFIED CURRENT]
│   ├── components/                 # Canonical React UI components & providers [VERIFIED CURRENT]
│   ├── config/                     # Application configuration objects [VERIFIED CURRENT]
│   ├── core/                       # Core infrastructure (container, tenant context, events, cache) [VERIFIED CURRENT]
│   ├── data/                       # Static/mock data definitions [VERIFIED CURRENT]
│   ├── features/                   # Domain feature modules (acquisition, admin, ai-intelligence, billing, monitoring, public-api, recommendations) [VERIFIED CURRENT]
│   ├── inngest/                    # Background function definitions [VERIFIED CURRENT]
│   ├── lib/                        # Core utilities (utils, auth, crawler, credits, redis, safe-action) [VERIFIED CURRENT]
│   ├── proxy.ts                    # Next.js request routing proxy (redirects / to /fa) [VERIFIED CURRENT]
│   ├── schemas/                    # Zod validation schemas [VERIFIED CURRENT]
│   ├── services/                   # Domain services (ai, analytics, crawler, diagnostic-engine, intelligence, etc.) [VERIFIED CURRENT]
│   └── types/                      # TypeScript type definitions [VERIFIED CURRENT]
├── tests/                          # Automated test suites (unit, integration, feature) [VERIFIED CURRENT]
├── AGENTS.md                       # Agent operating contract & rules [VERIFIED CURRENT]
├── BLUEPRINT.md                    # Engineering lifecycle governance [VERIFIED CURRENT]
├── drizzle.config.ts               # Drizzle Kit configuration [VERIFIED CURRENT]
├── eslint.config.mjs               # Flat ESLint configuration [VERIFIED CURRENT]
├── lint-wrapper.js                 # Custom ESLint runner script [VERIFIED CURRENT]
├── next.config.ts                  # Next.js configuration [VERIFIED CURRENT]
├── package.json                    # Project dependencies and script declarations [VERIFIED CURRENT]
├── postcss.config.mjs              # PostCSS configuration for Tailwind v4 [VERIFIED CURRENT]
├── README.md                       # Project overview documentation (Persian) [VERIFIED CURRENT]
├── SKILL.md                        # Task execution procedures [VERIFIED CURRENT]
├── SPEC.md                         # Target system specification [VERIFIED CURRENT]
└── tsconfig.json                   # TypeScript configuration [VERIFIED CURRENT]
```

---

## 4. Application Architecture

- **Pattern:** Domain-Driven Layered Architecture with Modular Monolith structure in `src/features/` and `src/services/`. [VERIFIED CURRENT]
- **Execution Lifecycle:**
  1. Requests enter via Next.js App Router (`src/app/[locale]/`).
  2. Root routing is forwarded via `src/proxy.ts` (redirecting `/` to `/fa`). [VERIFIED CURRENT]
  3. Interactive operations are executed via Server Actions (`src/app/actions/`) wrapped with `next-safe-action` (`src/lib/safe-action.ts`) or API endpoints (`src/app/api/`). [VERIFIED CURRENT]
  4. Tenant context is injected per-request using `AsyncLocalStorage` in `TenantContextManager` (`src/core/database/tenant-context/index.ts`). [VERIFIED CURRENT]
  5. Asynchronous background jobs and scheduled workflows run via Inngest (`src/inngest/functions/` and `src/app/api/inngest/route.ts`). [VERIFIED CURRENT]

---

## 5. Database Architecture

### Schema & Tables Structure
Database schemas are defined in `database/schema/`. The main barrel file `database/schema/index.ts` re-exports modular tables and defines core tables inline. [VERIFIED CURRENT]

Key Tables:
- **Organizations (`organizations`):** Workspace/tenant identity records (`id`, `name`, `slug`, `plan`, `settings`, `created_at`). [VERIFIED CURRENT]
- **Users (`users`):** Account identities (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `status`). [VERIFIED CURRENT]
- **Organization Members (`organization_members`):** Maps users to workspaces with RBAC roles (`owner`, `admin`, `member`, `viewer`). [VERIFIED CURRENT]
- **API Keys (`api_keys`):** Workspace API tokens (`id`, `organization_id`, `name`, `key_hash`, `scopes`, `last_used_at`). [VERIFIED CURRENT]
- **Credits & Credit Transactions (`credits`, `credit_transactions`):** Workspace token balance and audit trail of resource consumption. [VERIFIED CURRENT]
- **Auth Locks (`auth_locks`):** Brute-force prevention and account lockout tracking by IP or email. [VERIFIED CURRENT]
- **Unauthenticated Rate Limits (`unauthenticated_rate_limits`):** Rate limits for public endpoints. [VERIFIED CURRENT]
- **Audit & Intelligence Tables:** `aivisibilityaudits`, `aeo_analyses`, `brand_intelligence`, `citation_intelligence`, `prompt_intelligence`, `keyword_intelligence`, `competitive_seo_findings`, `competitor_changes`, `recommendations`. [VERIFIED CURRENT]
- **Knowledge Graph & Vector Store:** `kg_entities`, `kg_relationships`, `document_embeddings` (uses `vector(768)` custom type). [VERIFIED CURRENT]
- **Crawl Acquisition & Monitoring:** `crawl_jobs`, `crawl_results`, `crawl_cache`, `monitoring_configs`, `crawl_snapshots`, `monitoring_alerts`. [VERIFIED CURRENT]

### Multi-Tenancy & Row-Level Security (RLS)
- **Isolation Policy:** All tenant-scoped tables use UUID `organization_id` (or text `tenant_id` for crawl worker tables) with PostgreSQL Row-Level Security enabled. [VERIFIED CURRENT]
- **Policy Standard:** Standard RLS policies use `current_setting('app.current_tenant_id', true)::uuid`. [VERIFIED CURRENT]
- **Tenant Context Injection:** Managed at runtime via `TenantContextManager.runWithTenant(tenantId, callback)` inside `src/core/database/tenant-context/index.ts`, executing `SET LOCAL app.current_tenant_id = '...'` on the database client session. [VERIFIED CURRENT]

### Migrations & Snapshot Journal
- Migration files are output to `database/drizzle/` (`0000_reflective_loa.sql` through `0005_unauthenticated_rate_limits.sql`). [VERIFIED CURRENT]
- Snapshot metadata is tracked in `database/drizzle/meta/_journal.json`. [VERIFIED CURRENT]
- Migration execution is handled via `src/core/database/migrator.ts` (`pnpm db:migrate`). [VERIFIED CURRENT]
- Safeguard against direct unvetted schema pushes is implemented in `scripts/database/db-push-guard.ts` (`pnpm db:push`). [VERIFIED CURRENT]

---

## 6. Authentication and Authorization

### Authentication Model
- **Credentials:** Password authentication using `argon2id` (`argon2` package). [VERIFIED CURRENT]
- **Session Management:** Stateless, cryptographically signed HTTP-only secure cookies (`seorchable_session`). [VERIFIED CURRENT]
- **Payload:** HMAC SHA-256 signed payload containing `userId`, `organizationId`, and `expiresAt`. [VERIFIED CURRENT]
- **Providers:** Implemented in `AuthProvider` (`src/components/AuthProvider.tsx`) and `src/services/auth/session.ts`. [VERIFIED CURRENT]

### Authorization & RBAC
- **Roles:** Defined in `src/services/auth/authorization.ts` as `owner`, `admin`, `member`, `viewer`. [VERIFIED CURRENT]
- **Permissions:** Declarative permission mapping (`workspace:manage`, `billing:manage`, `audit:create`, `audit:read`, `member:invite`, etc.). [VERIFIED CURRENT]
- **Guard Layer:** `ProtectedRoute` component (`src/components/ProtectedRoute.tsx`) and server action permission checks. [VERIFIED CURRENT]

---

## 7. Frontend Architecture

### UI Framework & Styling
- **App Router Routing:** Localized route tree under `src/app/[locale]/`. Sub-trees include `/dashboard`, `/services`, `/profile`, `/settings`, `/billing`, `/pricing`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/solutions`, `/features`, `/industries`, `/contact`, `/about`, `/blog`, `/docs`, `/resources`. [VERIFIED CURRENT]
- **Tailwind v4 Setup:** Imports `@import "tailwindcss";` in `src/app/globals.css` with `@custom-variant dark (&:where(.dark, .dark *));`. [VERIFIED CURRENT]
- **Design Tokens:** Semantic system tokens (`--color-sys-bg`, `--color-sys-primary`, `--font-sys-sans`, etc.) declared under `@theme` mapping to CSS custom properties (`--sys-background`, `--sys-primary`, etc.) defined in `:root` (dark mode default) and `:root.light`. [VERIFIED CURRENT]
- **Typography:** Custom font variables loaded in `src/app/[locale]/layout.tsx`: `YekanBakh` (Primary/Sans), `Peyda` (Display/Headings), and English Title font. Utility classes defined via `@utility heading-xl`, `@utility body-md`, `@utility numeric`, etc. [VERIFIED CURRENT]
- **Localization & Directionality:** Handled via Next.js locale routing and `ThemeProvider` (`src/components/ThemeProvider.tsx`). HTML tag dynamically receives `dir="rtl"` and `lang="fa"` when the locale is `fa`. Utility logical CSS properties used where appropriate. [VERIFIED CURRENT]

### Component Infrastructure
- **Core Components:** Located in `src/components/`: `Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`, `Dialog.tsx`, `Dropdown.tsx`, `Tabs.tsx`, `GlassCard.tsx`, `DashboardShell.tsx`, `Breadcrumb.tsx`. [VERIFIED CURRENT]
- **Utility Import:** Canonical `cn()` and `cva` pattern exported from `src/lib/utils.ts`. (Note: duplicate `lib/utils.ts` exists at root). [VERIFIED CURRENT]

---

## 8. Backend Architecture

### Server Actions
- Server actions are located in `src/app/actions/`:
  - `auth.ts`: Registration, login, logout, password reset. [VERIFIED CURRENT]
  - `workspace.ts`: Workspace creation, switching, settings, and member management. [VERIFIED CURRENT]
  - `audit.ts`: Free audit trigger and status checking. [VERIFIED CURRENT]
  - `ai-visibility-audit.ts`, `aeo-content-intelligence.ts`, `brand-intelligence.ts`, `citation-intelligence.ts`, `keyword-intelligence.ts`, `prompt-intelligence.ts`, `prompts.ts`, `recommendations.ts`, `site-architecture.ts`, `technical-seo.ts`, `dashboard.ts`, `ingestion.ts`, `query.ts`. [VERIFIED CURRENT]

### REST API Endpoints
- Public and internal endpoints under `src/app/api/`:
  - `src/app/api/v1/crawl/route.ts`: Web crawl job creation API. [VERIFIED CURRENT]
  - `src/app/api/v1/docs/route.ts`: Serves generated documentation payload. [VERIFIED CURRENT]
  - `src/app/api/inngest/route.ts`: Inngest webhook endpoint. [VERIFIED CURRENT]
  - `src/app/api/webhooks/payment/route.ts`: Payment gateway webhook handler. [VERIFIED CURRENT]

### Background Tasks & Crawl Engine
- **Inngest Workflow:** Functions defined in `src/inngest/functions/ai-visibility.ts` for handling heavy AI analysis pipelines. [VERIFIED CURRENT]
- **Crawl Worker:** Autonomous worker script at `scripts/crawl-worker.ts` for polling and processing crawl jobs using Firecrawl and fallback fetchers. [VERIFIED CURRENT]

---

## 9. Infrastructure and Deployment

- **Deployment Target:** Vercel (or Node.js container environments). [VERIFIED CURRENT]
- **CI/CD Pipeline:** CircleCI setup in `.circleci/`. [VERIFIED CURRENT]
- **Build Process:** Executed via `pnpm build`, which runs `tsx scripts/generate-docs-data.ts` prior to `next build`. [VERIFIED CURRENT]
- **Database Migrations:** Executed via `pnpm db:migrate` against `DATABASE_URL` / `MIGRATION_DATABASE_URL`. [VERIFIED CURRENT]

---

## 10. Configuration and Environment

Required Environment Variables (`.env` / `.env.example`):
- `DATABASE_URL`: Primary PostgreSQL connection string (runtime connection). [VERIFIED CURRENT]
- `MIGRATION_DATABASE_URL`: Dedicated migration connection string (privileged DDL user). [VERIFIED CURRENT]
- `STAGING_MIGRATION_DATABASE_URL`: Staging environment migration URL. [VERIFIED CURRENT]
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL for caching and rate limiting. [VERIFIED CURRENT]
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST API Token. [VERIFIED CURRENT]
- `FIRECRAWL_API_KEY`: Firecrawl API key for web page crawling. [VERIFIED CURRENT]
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google Gemini API key for AEO/GEO analysis. [VERIFIED CURRENT]
- `RESEND_API_KEY`: Resend API key for transactional emails. [VERIFIED CURRENT]
- `DATA_SOURCE`: Source provider (`db` / `mock`). [VERIFIED CURRENT]

---

## 11. Testing and Validation

- **Test Framework:** Direct TypeScript test execution using `tsx` (no Jest/Vitest runner in `package.json`). Individual test suites executed via `npx tsx <path-to-test-file>`. [VERIFIED CURRENT]
- **Key Test Suites (`tests/`):**
  - `tests/features/acquisition/run-all.ts` (suite wrapper, script target `pnpm test:acquisition`). [VERIFIED CURRENT]
  - `tests/features/admin/security/auth.test.ts` [VERIFIED CURRENT]
  - `tests/features/admin/tenant-isolation-behavior.test.ts` [VERIFIED CURRENT]
  - `tests/core/database/tenant-context.test.ts` [VERIFIED CURRENT]
  - `tests/scripts/database/db-push-guard.test.ts` [VERIFIED CURRENT]
  - `tests/inngest/inngest-integration.test.ts` [VERIFIED CURRENT]
  - `tests/services/auth/session.test.ts` [VERIFIED CURRENT]
- **Linting:** Wrapped via `node lint-wrapper.js` (`pnpm run lint`). [VERIFIED CURRENT]
- **Secret Hygiene Guard:** Script `scripts/security/secret-hygiene.ts` (`pnpm security:secrets`). [VERIFIED CURRENT]

---

## 12. Build and Development Commands

- **Development Server:** `pnpm dev` (`next dev`) [VERIFIED CURRENT]
- **Production Build:** `pnpm build` (`npx tsx scripts/generate-docs-data.ts && next build`) [VERIFIED CURRENT]
- **Start Production Server:** `pnpm start` (`next start`) [VERIFIED CURRENT]
- **Linting:** `pnpm run lint` (`node lint-wrapper.js`) [VERIFIED CURRENT]
- **Acquisition Feature Tests:** `pnpm test:acquisition` (`tsx tests/features/acquisition/run-all.ts`) [VERIFIED CURRENT]
- **Generate Database Migrations:** `pnpm db:generate` (`drizzle-kit generate`) [VERIFIED CURRENT]
- **Apply Database Migrations:** `pnpm db:migrate` (`tsx src/core/database/migrator.ts`) [VERIFIED CURRENT]
- **Push Database Schema (Guard Enforced):** `pnpm db:push` (`tsx scripts/database/db-push-guard.ts && drizzle-kit push`) [VERIFIED CURRENT]
- **Check Secret Hygiene:** `pnpm security:secrets` (`tsx scripts/security/secret-hygiene.ts`) [VERIFIED CURRENT]

---

## 13. Repository Conventions

- **Agent Operating Rules:** Defined in `AGENTS.md` and `BLUEPRINT.md`. Requires strict read-only inspection, mandatory plan approval, minimality of edits, and evidence-first claims. [VERIFIED CURRENT]
- **Remote Procedures:** `AGENTS.md` requires fetching external procedures from `https://jules-prompts.wecanuseai.com/prompts.json` when applicable. [VERIFIED CURRENT]
- **Code Formatting & Utility Usage:** Utility functions imported from `@/lib/utils` (using `cn()` for Tailwind merging and `cva` for variant composition). [VERIFIED CURRENT]
- **Localization:** Multi-language routes structured under `src/app/[locale]/`. RTL handled via dynamic `dir` attribute on layout root and CSS logical properties. [VERIFIED CURRENT]

---

## 14. Important Constraints

1. **Scope Control:** Edits must be strictly limited to files authorized in approved execution plans. [VERIFIED CURRENT]
2. **Database Migration Safety:** Direct `drizzle-kit push` is guarded by `scripts/database/db-push-guard.ts`. Migrations must be hand-verified or generated through proper Drizzle Kit scripts. [VERIFIED CURRENT]
3. **Secret Security:** Secrets must never be committed or printed in logs/reports (`scripts/security/secret-hygiene.ts`). [VERIFIED CURRENT]
4. **Tenant Isolation:** All database queries touching tenant data must go through `TenantContextManager` to guarantee `SET LOCAL app.current_tenant_id` is set. [VERIFIED CURRENT]
5. **Node.js Modules Execution:** Running `node lint-wrapper.js` requires installed dependencies (`node_modules`) via `pnpm install`. [VERIFIED CURRENT]

---

## 15. Known Issues

- **Authentication Audit Finding F-01 (DoS via `progressiveDelay`):** `src/app/actions/auth.ts` implements an inline `progressiveDelay()` up to 60 minutes on failed login attempts, keeping server action handlers open and exposing the server to request/connection exhaustion DoS. [HISTORICAL] / [VERIFIED CURRENT]
- **Authentication Audit Finding F-02 (Missing Password Reset Endpoint):** `requestPasswordResetAction` in `src/app/actions/auth.ts` creates ephemeral reset tokens without saving them to the database, and the route `/[locale]/reset-password` is missing. [HISTORICAL] / [VERIFIED CURRENT]
- **Missing Token Persistence Tables:** `users` schema lacks persistent columns for `reset_token`, `reset_token_expires`, `verification_token`, or `email_verified_at`. [HISTORICAL] / [VERIFIED CURRENT]
- **ESLint Baseline Violations:** ESLint baseline scan recorded 681 total violations (343 errors, 338 warnings) across 142 affected files. [HISTORICAL]

---

## 16. Known Technical Debt

- **Duplicate `utils.ts`:** `lib/utils.ts` (root) and `src/lib/utils.ts` both exist. `src/lib/utils.ts` includes `cva` re-exports, whereas `lib/utils.ts` only exports `cn()`. [VERIFIED CURRENT]
- **Legacy Components in `components/` vs `src/components/`:** Duplicate component directories exist (`components/` at root vs `src/components/`). [VERIFIED CURRENT]
- **Unclean Workspace Artifacts:** Legacy files present in source tree (e.g., `database/schema/index.ts.tmp2`, `src/app/actions/citation-intelligence.ts.orig`, `src/app/actions/citation-intelligence.ts.rej`). [VERIFIED CURRENT]
- **Schema Barrel Inconsistency:** `database/schema/index.ts` re-exports modular files but also contains extensive inline table declarations, creating architectural overlap with modular files. [VERIFIED CURRENT]

---

## 17. Verified Architectural Decisions

- **App Router Locale Scope:** All user-facing pages reside under `src/app/[locale]/` to support Persian and English seamlessly. [VERIFIED CURRENT]
- **Next.js 16 Request Proxy:** `src/proxy.ts` is configured as the root proxy redirecting `/` to `/fa`. [VERIFIED CURRENT]
- **Tailwind v4 PostCSS Migration:** `@tailwindcss/postcss` and `@theme` CSS directives in `globals.css` replace legacy `tailwind.config.ts`. [VERIFIED CURRENT]
- **PostgreSQL RLS Multi-Tenancy:** Row-Level Security policies natively filter tenant rows via `app.current_tenant_id`. [VERIFIED CURRENT]

---

## 18. Migration and Historical Context

- **Database RLS Evolution:** Migration `0004_rls_isolation.sql` introduced Row-Level Security across tenant-scoped tables. Migration `0005_unauthenticated_rate_limits.sql` added unauthenticated rate limit tracking. [HISTORICAL] / [VERIFIED CURRENT]
- **Frontend Transformation:** Phase 1 established design system tokens in `globals.css` and updated core UI components to use `cn()` and `cva`. [HISTORICAL]

---

## 19. Previous Audit Findings

- **Database Audit (`docs/tasks_reports/database/database_audit.md` & `official_audits/database/v1.0.0.md`):** Identified Column/Type/Default discrepancies between Drizzle schema, snapshots, and raw SQL migrations. [HISTORICAL]
- **Frontend Audit (`official_audits/front-end/v1.0.0.md`):** Identified manual hardcoded Tailwind classes in legacy components and recommended migration to unified CVA primitives and CSS logical properties. [HISTORICAL]
- **Auth Audit (`docs/authentication_tasks_reports/authentication_audit_report.md`):** Highlighted critical `progressiveDelay` DoS risk, unpersisted tokens, and missing reset routes. [HISTORICAL]
- **Lint Audit (`docs/lint/LINT-BASELINE-REPORT.md`):** Detailed historical snapshot of 681 lint violations across 142 files. [HISTORICAL]

---

## 20. Open Questions and Unresolved Areas

- **`node_modules` Presence in Sandbox:** Local dependencies (`node_modules`) are unpopulated by default in fresh sandbox sessions; `pnpm install` must be executed to run `node lint-wrapper.js` or build tasks. [VERIFIED CURRENT]
- **Cleanup of Discarded Patch Artifacts:** Files like `.orig`, `.rej`, and `.tmp2` remain in the working tree. Determination needed on safe removal procedures. [UNRESOLVED]
- **Consolidation of Root `components/` and `lib/`:** Migration timing to deprecate root `components/` and `lib/` in favor of `src/` requires future planning. [UNRESOLVED]

---

## 21. Last Verified Repository State

- **Verification Date:** March 2025 [VERIFIED CURRENT]
- **Git Commit / Branch:** Inspected live repository state on current working branch. [VERIFIED CURRENT]
- **Repository Health:** Clean build configuration, valid Next.js App Router structure, intact Drizzle schema and migration history. [VERIFIED CURRENT]
