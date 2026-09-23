# Executive Summary

**Verdict: BLOCKER.** The supplied repository snapshot is not production-ready as a database system. PostgreSQL and Drizzle are still the right foundation, but the repository currently contains multiple incompatible schema authorities, a broken executable migration chain, application queries shaped for a different schema family, incomplete authentication and payment persistence, unproven tenant isolation, and production paths that can fall back to local or in-memory behavior.

The audit inspected the supplied archive for the requested repository reference, `https://github.com/DiabloNova/exonn.ir`. The archive root is `oxenn.ir-main`, contains 722 files, has no `.git` metadata or remote, and therefore does not prove the upstream commit or the deployed database state. No repository file, migration, dependency, or database was modified. No live PostgreSQL connection was made and no test suite was executed.

The load-bearing findings are:

1. **The runtime migration authority is `database/drizzle`, not `database/migrations`.** This is a FACT from `drizzle.config.ts:3-9`, `src/core/database/migrator.ts:19-27`, and `package.json:10-13`. The environment file documents `MIGRATION_DATABASE_URL`, but executable migration code never reads it; migration and runtime access both use `DATABASE_URL`.
2. **The first provable migration artifact divergence is `database/drizzle/0004_rls_isolation.sql`.** Its SQL contains only RLS changes, but `meta/0004_snapshot.json` records table, column, index, foreign-key, primary-key, policy, unique-constraint, and check-constraint changes. The SQL first references `automated_recommendations` at `0004_rls_isolation.sql:591`, although no prior Drizzle SQL creates that table. A clean Drizzle replay therefore fails at `0004` before `0005` can apply.
3. **The current effective TypeScript source declares 71 unique SQL table names, while the final Drizzle snapshot has 67 and the generated SQL creates 66 unique tables.** Four source-only objects are especially important: `api_keys`, `audits`, `auth_locks`, and `credits`. `credit_transactions` is declared twice with incompatible columns in `database/schema/index.ts:184-195` and `database/schema/credit-transactions.ts:39-51`.
4. **Authentication persistence is incomplete.** `registerAction` inserts `email_verified` and `email_verified_at` at `src/app/actions/auth.ts:217`, but those columns are absent from the executable Drizzle users table. Verification and password-reset tokens are generated and discarded. Sessions are signed cookies, not server-side records; logout deletes cookies but cannot revoke a copied cookie. `SESSION_SECRET` silently falls back to a random process-local secret at `src/services/auth/session.ts:14-20`.
5. **The intended progressive lockout policy is not implemented.** The code records failures atomically, but only applies a lock/challenge at 6+ failures in `src/app/actions/auth.ts:105-125`. The intended 3rd, 4th, and 5th failure windows, normalized email/IP failure window, and `auth_locks` persistence are not present in the executable database path.
6. **Payment and credit accounting is not one model.** The payment webhook accepts a shared header secret, client-supplied workspace ID, amount, and event at `src/app/api/webhooks/payment/route.ts:4-48`, then calls the source-only `credits` model. `SubscriptionService` uses `tenant_quotas` and the generated `credit_transactions` model. No payment, invoice, provider-event, webhook-event, or refund table exists. Replaying a valid `payment_success` can credit repeatedly.
7. **Tenant isolation is strong in intent but not proven in deployment and is bypassed by parts of the API surface.** RLS SQL exists for an intended 57-table final state, but `0004` is not replayable, role privileges and `BYPASSRLS` are not defined, parent tenant identity is not part of ordinary foreign keys, and multiple routes read `x-tenant-id` and `x-user-id` directly, for example `src/app/api/v1/ai/chunk/route.ts:27-35` and `src/app/api/v1/audit/aeo-insight/route.ts:13-43`.
8. **The repository tests do not prove PostgreSQL correctness.** There are 74 test files, but most database-labelled tests use static maps, `Pool.prototype.query` interception, cookie mocks, or handcrafted SQL dispatchers. The only credible live-Postgres candidate is conditional on `DATABASE_URL` and is not wired into the package-wide test or CI path.
9. **The evidence-grounded knowledge model is only partial.** Sources, crawl snapshots, evidence excerpts, entities, edges, timestamps, confidence fields, and JSON provenance fragments exist. There is no first-class claim, universal evidence, normalized provenance chain, generic verification state, or assert/retract/supersede event model. PostgreSQL can support the missing layer; a graph database is not justified by current query evidence.

**Release decision:** do not deploy the current migration chain, auth lifecycle, payment/credit path, or tenant-sensitive API surface. Establish the actual target database catalog and migration journal first, then repair the schema forward without rewriting history blindly.

# Verified Repository Database Architecture

| Concern | Verified implementation | Finding |
|---|---|---|
| ORM and dialect | `drizzle.config.ts:3-8` | Drizzle ORM, PostgreSQL dialect. Preserve. |
| Declared schema entry | `drizzle.config.ts:4`, `database/schema/index.ts` | The entry re-exports several competing modules and also declares a monolithic schema. It is the intended authority, not yet a coherent one. |
| Executable migrations | `src/core/database/migrator.ts:19-27` | Only `database/drizzle` is executed through `public.__drizzle_migrations`. `database/migrations` is not referenced. |
| Runtime DB URL | `src/core/database/migrator.ts:6-9`, `src/features/admin/infrastructure/persistence/postgres/index.ts:52-60`, `src/core/config/index.ts:18-25` | `DATABASE_URL` is used, with local fallback in runtime adapters. |
| Migration DB URL | `.env.example:1-3`, `README.md:112-114` | `MIGRATION_DATABASE_URL` is documented but not used by executable migration code. |
| Tenant context | `src/core/database/tenant-context/index.ts:73-104,185-275` | `AsyncLocalStorage`, leased client, `BEGIN`, transaction-local `set_config('app.current_tenant_id', ..., true)`, commit/rollback. Good mechanism when every query uses the same client and context. |
| Application SQL guard | `src/core/database/tenant-context/index.ts:20-71`, `src/features/admin/infrastructure/persistence/postgres/index.ts:86-103,173-214` | Lexical table-name detection, not a substitute for RLS. It omits several tenant-sensitive tables and Drizzle calls can bypass it. |
| DB push guard | `scripts/database/db-push-guard.ts:35-151`, `package.json:13` | Fail-closed by environment, URL heuristics, explicit flags, and catalog emptiness. It protects `db:push` but does not repair migrations or prove schema compatibility. |
| Application role | No `CREATE ROLE`, `ALTER ROLE ... BYPASSRLS`, or application `GRANT` setup found. | Deployed role behavior is an OPEN QUESTION. Legacy crawl functions grant execution to `crawler` at `database/migrations/0004_crawl_acquisition.sql:262-267`, but the role is not created here. |
| Pooling | `PostgresClient` pool max 20 at `src/features/admin/infrastructure/persistence/postgres/index.ts:52-61`; migrator pool max 1 at `src/core/database/migrator.ts:12-15`; crawl worker creates another pool at `scripts/crawl-worker.ts:146-155`. | Multiple connection abstractions make transaction and tenant-context guarantees adapter-dependent. |
| Build/start/deploy | `package.json:7-13`, `.circleci/config.yml:5-70` | Build runs docs generation and `next build`; start runs `next start`; CI does not run migrations or the database integration suite; deploy is a placeholder. |

# Complete Database Inventory

The repository contains three object populations, not one inventory:

- **Effective TypeScript source:** 72 `pgTable` declarations and 71 unique SQL table names when all modules re-exported by `database/schema/index.ts` are included. `credit_transactions` is declared twice.
- **Generated Drizzle SQL:** 66 unique `CREATE TABLE` objects across `0000` through `0005`; the final snapshot claims 67 tables because `0004` metadata introduces `automated_recommendations` without corresponding `CREATE TABLE` SQL.
- **Legacy hand-authored SQL:** 44 `CREATE TABLE` instances across 19 files and 41 unique table names. Monitoring tables are deliberately recreated in `0017`.

The current source-only objects absent from the generated final snapshot are `api_keys`, `audits`, `auth_locks`, and `credits`. The generated and legacy streams contain additional variants of many objects, including AEO, citation, diagnostics, monitoring, prompt, page, keyword, competitor, and graph tables.

The effective source domains are:

| Domain | Tables |
|---|---|
| Identity and tenancy | `users`, `auth_locks`, `organizations`, `organization_members`, `organization_invitations` |
| Governance | `roles`, `permissions`, `admin_users`, `audit_records`, `feature_flags`, `system_configurations` |
| Billing and quota | `tenant_quotas`, `tenant_subscriptions`, `credit_transactions`, source-only `credits` |
| AI provider | `ai_provider_configs`, `ai_engines` |
| Brand and entity graph | `brands`, `entities`, `entity_relationships`, `kg_entities`, `kg_relationships` |
| Website and SEO | `websites`, `pages`, `keywords`, `topics`, `competitors`, `historical_metrics`, five join tables |
| Diagnostics and audits | `diagnostic_findings`, `diagnostic_finding_relationships`, `technical_audits`, `competitive_analyses`, `premium_audits` |
| Prompt and observation | `prompts`, `prompt_definitions`, `prompt_schedules`, `prompt_executions`, `position_observations`, `ai_observations` |
| Citation and intelligence | `competitor_mentions`, `brand_mentions`, `citations`, `citation_sources`, `citation_occurrences`, `visibility_scores`, `recommendations`, `brand_associations`, `recommendation_observations` |
| AEO and competitive intelligence | `ai_visibility_audits`, `audit_prompts`, `aeo_analyses`, `faq_opportunities`, `kg_alignments`, `automated_recommendations`, `competitor_changes`, `competitive_seo_findings` |
| Acquisition and monitoring | `crawl_jobs`, `crawl_results`, `crawl_cache`, `monitoring_configs`, `crawl_snapshots`, `monitoring_alerts` |
| Vector and rate limiting | `document_embeddings`, `unauthenticated_audit_rate_limits` |
| API credentials | source-only `api_keys` |
| Audit workflow | source-only `audits` |

Source-level key and contract highlights:

- Identity is split between current `database/schema/organization.ts:46-61` UUID users and generated `database/drizzle/0001_illegal_grey_gargoyle.sql:24-33` text users. `database/schema/index.ts.tmp2:103-121` preserves an older text-user variant.
- `organization_members.role` and `organization_invitations.role/status` are text without database checks or enums.
- `tenant_quotas` and `tenant_subscriptions` have tenant indexes but no unique tenant constraint in the active TypeScript source at `database/schema/index.ts:163-212`.
- Source-only `credits` has one row intended per organization via a unique index at `database/schema/credits.ts:37-47`, but no executable migration creates it.
- Source-only `audits` uses `workspace_id` at `database/schema/audits.ts:38-54`, while other tenant tables use `organization_id` or `tenant_id`.
- `document_embeddings.embedding` is `vector(768)` at `database/schema/index.ts:1054-1064`; the HNSW index exists only in legacy `database/migrations/0001_optimus_vector_kg.sql:14-18`.
- JSONB, text arrays, soft-delete fields, version fields, and timestamps are widespread, but JSON shape, score range, currency semantics, and many status values are not database-constrained.

The following appendix is the full variant-by-variant SQL inventory, including columns, nullability, defaults, primary keys, checks, and variant differences across both migration streams.

## SQL table inventory (parsed from CREATE TABLE)

The same table can have multiple variants; each variant is listed by migration path. `NN` means NOT NULL; `PK` marks inline primary key; defaults/checks/FKs are summarized in the constraint column.

### `admin_users`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `email`:text [NN], `full_name`:text [NN], `role_id`:uuid [NN], `is_active`:boolean [NN, d=true], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- constraints: CONSTRAINT "admin_users_email_unique" UNIQUE("email")
### `aeo_analyses`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `url`:text [NN], `target_keyword`:text [NN], `overall_aeo_score`:integer [NN], `answerability_score`:integer [NN], `entity_coverage_score`:integer [NN], `semantic_coverage_score`:integer [NN], `question_coverage_score`:integer [NN], `citation_readiness_score`:integer [NN], `structured_answer_quality_score`:integer [NN], `analysis_details`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0011_aeo_content_intelligence.sql**
- columns: `id`:UUID [PK], `organization_id`:UUID [NN], `page_id`:UUID [NN], `overall_score`:DOUBLE [NN], `answerability`:JSONB [NN], `entity_coverage`:JSONB [NN], `semantic_coverage`:JSONB [NN], `question_coverage`:JSONB [NN], `citation_readiness`:JSONB [NN], `structured_answer_quality`:JSONB [NN], `kg_alignment`:JSONB [NN], `scoring_version`:TEXT [NN], `analyzer_version`:TEXT [NN], `provenance`:JSONB [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `ai_engines`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `name`:text [NN], `provider`:text [NN], `version`:text [NN], `capabilities`:text[] [NN], `is_active`:boolean [NN, d=true], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version_num`:integer [NN, d=1]
### `ai_observations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `prompt_id`:uuid [NN], `engine_id`:uuid [NN], `raw_response_text`:text [NN], `parsed_sentiment`:text [NN], `position_rank`:integer, `observed_at`:timestamp with time zone [NN, d=NOW()], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `ai_provider_configs`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `provider_name`:text [NN], `endpoint_url`:text [NN], `api_key_masked`:text [NN], `is_active`:boolean [NN, d=true], `failover_provider_id`:uuid, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `ai_visibility_audits`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `target_brand_name`:text [NN], `target_domain`:text [NN], `overall_score`:integer [NN], `brand_authority_score`:integer [NN], `ai_search_share_score`:integer [NN], `sentiment_score`:integer [NN], `citation_reliability_score`:integer [NN], `recommendation_share_score`:integer [NN], `dimensions_json`:jsonb [NN], `audited_engine_ids`:text[] [NN], `audited_prompts_count`:integer [NN], `raw_observations_count`:integer [NN], `status`:text [NN, d='completed'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0007_ai_visibility_audit.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `brand_id`:UUID [NN], `status`:TEXT [NN, d='PENDING'], `overall_score`:INTEGER, `metrics`:JSONB [NN, d='{}'::jsonb], `prompts_coverage`:JSONB [NN, d='{}'::jsonb], `evidence_summary`:JSONB [NN, d='{}'::jsonb], `scoring_version`:TEXT [NN, d='1.0.0'], `analyzer_version`:TEXT [NN, d='1.0.0'], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `api_keys`
- **database/migrations/0015_api_keys.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `name`:text [NN], `prefix`:text [NN], `hash`:text [NN], `is_active`:boolean [NN, d=true], `expires_at`:timestamp with time zone, `last_used_at`:timestamp with time zone, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `revoked_at`:timestamp with time zone
- constraints: CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix")
### `audit_prompts`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `audit_id`:uuid [NN], `organization_id`:uuid [NN], `prompt_text`:text [NN], `category`:text [NN], `weight`:double [NN, d=1], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0007_ai_visibility_audit.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `audit_id`:UUID [NN], `prompt_text`:TEXT [NN], `category`:TEXT [NN], `target_entity`:TEXT [NN], `locale`:TEXT [NN], `status`:TEXT [NN, d='PENDING'], `error_message`:TEXT, `latency_ms`:INTEGER, `executed_at`:TIMESTAMP WITH TIME ZONE, `response_text`:TEXT, `analysis`:JSONB [NN, d='{}'::jsonb], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `audit_records`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `timestamp`:timestamp with time zone [NN, d=NOW()], `actor_id`:text [NN], `actor_email`:text [NN], `actor_role`:text [NN], `action`:text [NN], `resource_type`:text [NN], `resource_id`:text [NN], `ip_address`:text [NN], `user_agent`:text [NN], `payload_before`:text, `payload_after`:text, `status`:text [NN], `error_details`:text
### `automated_recommendations`
- **database/migrations/0018_automated_recommendations.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `website_id`:uuid, `title`:text [NN], `description`:text [NN], `type`:text [NN], `priority_score`:integer [NN], `status`:text [NN, d='pending'], `recommended_action`:jsonb [NN, d='{}'::jsonb], `dedup_key`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `brand_associations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `brand_id`:uuid [NN], `attribute_name`:text [NN], `association_score`:double [NN, d=0], `mention_count`:integer [NN, d=0], `sample_excerpts`:text[] [NN, d='{}'::text[]], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0010_brand_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `brand_id`:UUID [NN], `entity_name`:TEXT [NN], `relationship_type`:TEXT [NN], `occurrence_count`:INTEGER [NN, d=1], `first_seen_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `last_seen_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `supporting_context`:TEXT [NN], `confidence`:DOUBLE [NN, d=1.0], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `brand_mentions`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `observation_id`:uuid [NN], `brand_id`:uuid [NN], `mention_context`:text [NN], `is_recommended`:boolean [NN, d=false], `sentiment_score`:double [NN, d=0], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `brands`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `name`:text [NN], `canonical_domain`:text [NN], `aliases`:text[] [NN, d='{}'::text[]], `industry`:text [NN], `target_markets`:text[] [NN, d='{}'::text[]], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `citation_occurrences`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `source_id`:uuid [NN], `engine_id`:text [NN], `prompt_text`:text [NN], `citation_position`:integer [NN, d=1], `excerpt_text`:text, `sentiment_score`:double [NN, d=0], `is_brand_mentioned`:boolean [NN, d=false], `occurred_at`:timestamp with time zone [NN, d=NOW()], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0009_citation_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `source_id`:UUID [NN], `audit_id`:UUID, `execution_id`:UUID, `prompt_id`:UUID, `observation_id`:UUID, `url`:TEXT [NN], `title`:TEXT, `snippet`:TEXT, `position`:INTEGER, `confidence`:DOUBLE [NN, d=1.0], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `citation_sources`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `url`:text [NN], `domain`:text [NN], `publisher_name`:text, `publisher_category`:text [NN, d='General'], `authority_score`:integer [NN, d=50], `is_verified_domain`:boolean [NN, d=false], `metadata`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0009_citation_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `domain`:TEXT [NN], `canonical_url`:TEXT, `classification`:TEXT [NN], `quality_score`:INTEGER [NN], `authority_score`:INTEGER [NN], `first_seen_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `last_seen_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `occurrence_count`:INTEGER [NN, d=0], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `citations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `observation_id`:uuid [NN], `url`:text [NN], `domain`:text [NN], `anchor_text`:text, `citation_order`:integer [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `competitive_analyses`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `user_url`:text [NN], `competitor_urls`:text[] [NN], `overall_score`:integer [NN], `market_position`:text [NN], `comparison_data`:jsonb [NN], `advantages`:jsonb [NN], `gaps`:jsonb [NN], `opportunities`:jsonb [NN], `created_at`:timestamp with time zone [d=NOW()]
- **database/migrations/0003_competitive_analyses.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `user_url`:TEXT [NN], `competitor_urls`:TEXT[] [NN], `overall_score`:INTEGER [NN], `market_position`:TEXT [NN], `comparison_data`:JSONB [NN], `advantages`:JSONB [NN], `gaps`:JSONB [NN], `opportunities`:JSONB [NN], `created_at`:TIMESTAMP [d=NOW()]
### `competitive_seo_findings`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `competitor_id`:uuid, `finding_type`:text [NN], `severity`:text [NN], `title`:text [NN], `description`:text [NN], `evidence`:jsonb [NN, d='{}'::jsonb], `recommendation`:text [NN], `impact_score`:integer [NN, d=0], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "competitive_seo_findings_finding_type_check" CHECK (finding_type IN ( 'technical_gap', 'content_gap', 'keyword_gap', 'topic_gap', 'structural_difference', 'ai_visibility_gap', 'citation_gap', 'prompt_gap', 'brand_mention_gap', 'ai_recommendation_gap', 'citation_overlap' ))
- **database/migrations/0013_competitive_seo_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `competitor_id`:UUID [NN], `finding_type`:TEXT [NN], `comparison_scope`:TEXT [NN], `competitive_position`:TEXT [NN], `tenant_value`:TEXT, `competitor_value`:TEXT, `difference`:DOUBLE, `difference_direction`:TEXT [NN], `severity`:TEXT [NN], `evidence`:JSONB [NN, d='{}'::jsonb], `source_reference`:TEXT, `calculation_metadata`:JSONB [NN, d='{}'::jsonb], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `version`:INTEGER [NN, d=1]
### `competitor_changes`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `competitor_id`:uuid [NN], `change_type`:text [NN], `severity`:text [NN], `summary`:text [NN], `details`:jsonb [NN, d='{}'::jsonb], `detected_at`:timestamp with time zone [NN, d=NOW()], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0012_competitor_discovery.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `competitor_id`:UUID [NN], `changed_field`:TEXT [NN], `previous_value`:TEXT, `new_value`:TEXT, `change_type`:TEXT [NN], `observed_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `competitor_mentions`
- **database/drizzle/0003_yellow_winter_soldier.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `observation_id`:uuid [NN], `competitor_id`:uuid [NN], `mention_context`:text [NN], `is_recommended`:boolean [NN, d=false], `sentiment_score`:double [NN, d=0], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `competitors`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `name`:text [NN], `domain`:text [NN], `normalized_url`:text [NN], `is_direct`:boolean [NN, d=true], `metadata`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `name`:TEXT [NN], `domain`:TEXT [NN], `status`:TEXT [NN, d='active'], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `crawl_cache`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:text [NN], `cache_scope`:text [NN, d='tenant'], `cache_key`:text [NN], `normalized_result`:jsonb [NN], `expires_at`:timestamp with time zone [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "crawl_cache_scope_check" CHECK (cache_scope = 'tenant')
- **database/migrations/0004_crawl_acquisition.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `tenant_id`:TEXT [NN], `cache_scope`:TEXT [NN, d='tenant' CONSTRAINT crawl_cache_scope_check], `cache_key`:TEXT [NN], `normalized_result`:JSONB [NN], `expires_at`:TIMESTAMPTZ [NN], `created_at`:TIMESTAMPTZ [NN, d=NOW()], `updated_at`:TIMESTAMPTZ [NN, d=NOW()]
### `crawl_jobs`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:text [NN], `requested_url`:text [NN], `normalized_url`:text [NN], `policy`:jsonb [NN], `dedup_key`:text [NN], `cache_key`:text [NN], `priority`:integer [NN, d=0], `status`:text [NN, d='PENDING'], `provider_id`:text, `provider_job_id`:text, `attempts`:integer [NN, d=0], `max_attempts`:integer [NN], `scheduled_for`:timestamp with time zone, `claimed_at`:timestamp with time zone, `heartbeat_at`:timestamp with time zone, `lease_expires_at`:timestamp with time zone, `worker_id`:text, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `started_at`:timestamp with time zone, `completed_at`:timestamp with time zone, `duration_ms`:integer, `page_count`:integer, `bytes_processed`:bigint, `cache_outcome`:text, `error`:jsonb, `cancelled_at`:timestamp with time zone, `cancellation_reason`:text, `cancellation_requested_by`:text, `result_ref`:uuid, `correlation_id`:text, `request_id`:text, `trace_id`:text, `version`:integer [NN, d=1]
- constraints: CONSTRAINT "crawl_jobs_status_check" CHECK (status IN ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED')); CONSTRAINT "crawl_jobs_attempts_check" CHECK (attempts >= 0); CONSTRAINT "crawl_jobs_max_attempts_check" CHECK (max_attempts > 0); CONSTRAINT "crawl_jobs_cache_outcome_check" CHECK (cache_outcome IS NULL OR cache_outcome IN ('HIT', 'MISS', 'STALE', 'BYPASS')); CONSTRAINT "crawl_jobs_version_check" CHECK (version > 0)
- **database/migrations/0004_crawl_acquisition.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `tenant_id`:TEXT [NN], `requested_url`:TEXT [NN], `normalized_url`:TEXT [NN], `policy`:JSONB [NN], `dedup_key`:TEXT [NN], `cache_key`:TEXT [NN], `priority`:INTEGER [NN, d=0], `status`:TEXT [NN, d='PENDING'], `provider_id`:TEXT, `provider_job_id`:TEXT, `attempts`:INTEGER [NN, d=0], `max_attempts`:INTEGER [NN], `scheduled_for`:TIMESTAMPTZ, `claimed_at`:TIMESTAMPTZ, `heartbeat_at`:TIMESTAMPTZ, `lease_expires_at`:TIMESTAMPTZ, `worker_id`:TEXT, `created_at`:TIMESTAMPTZ [NN, d=NOW()], `updated_at`:TIMESTAMPTZ [NN, d=NOW()], `started_at`:TIMESTAMPTZ, `completed_at`:TIMESTAMPTZ, `duration_ms`:INTEGER, `page_count`:INTEGER, `bytes_processed`:BIGINT, `cache_outcome`:TEXT, `error`:JSONB, `cancelled_at`:TIMESTAMPTZ, `cancellation_reason`:TEXT, `cancellation_requested_by`:TEXT, `result_ref`:UUID, `correlation_id`:TEXT, `request_id`:TEXT, `trace_id`:TEXT, `version`:INTEGER [NN, d=1]
### `crawl_results`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:text [NN], `job_id`:uuid [NN], `result`:jsonb [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0004_crawl_acquisition.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `tenant_id`:TEXT [NN], `job_id`:UUID [NN], `result`:JSONB [NN], `created_at`:TIMESTAMPTZ [NN, d=NOW()]
- constraints: CONSTRAINT crawl_results_job_unique UNIQUE (job_id); CONSTRAINT crawl_results_tenant_job_unique UNIQUE (tenant_id, job_id)
### `crawl_snapshots`
- **database/drizzle/0003_yellow_winter_soldier.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `monitoring_config_id`:uuid [NN], `crawl_job_id`:uuid [NN], `captured_at`:timestamp with time zone [NN, d=NOW()], `content_hash`:text, `extracted_content`:text, `snapshot_metadata`:jsonb [NN, d='{}'::jsonb]
- **database/migrations/0016_website_monitoring.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `monitoring_config_id`:UUID [NN], `crawl_job_id`:UUID [NN], `captured_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `content_hash`:TEXT, `extracted_content`:TEXT, `snapshot_metadata`:JSONB [NN, d='{}'::jsonb]
- **database/migrations/0017_website_monitoring_v2.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `monitoring_config_id`:uuid [NN], `website_id`:uuid [NN], `captured_at`:timestamp with time zone [NN, d=NOW()], `pages`:jsonb [NN], `total_pages`:integer [NN], `indexable_pages`:integer [NN], `non_indexable_pages`:integer [NN], `error_4xx_count`:integer [NN], `error_5xx_count`:integer [NN], `robots_txt_available`:boolean [NN], `sitemap_available`:boolean [NN]
### `credit_transactions`
- **database/drizzle/0002_soft_jimmy_woo.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `amount`:integer [NN], `transaction_type`:text [NN], `description`:text, `reference_id`:text, `created_at`:timestamp with time zone [NN, d=NOW()]
### `diagnostic_finding_relationships`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `parent_finding_id`:uuid [NN], `child_finding_id`:uuid [NN], `relationship_type`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0006_diagnostic_engine_model.sql**
- columns: `organization_id`:UUID [NN], `source_finding_id`:UUID [NN], `target_finding_id`:UUID [NN], `relationship_type`:TEXT [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
- constraints: PRIMARY KEY (source_finding_id, target_finding_id, relationship_type)
### `diagnostic_findings`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `domain`:text [NN], `finding_type`:text [NN], `severity`:text [NN], `confidence`:double [NN], `title`:text [NN], `description`:text [NN], `evidence`:jsonb [NN, d='{}'::jsonb], `recommendation`:text [NN], `impact_score`:integer [NN, d=0], `status`:text [NN, d='open'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0006_diagnostic_engine_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `website_id`:UUID [NN], `category`:TEXT [NN], `code`:TEXT [NN], `title`:TEXT [NN], `explanation`:TEXT [NN], `severity`:TEXT [NN], `confidence`:TEXT [NN], `status`:TEXT [NN, d='active'], `affected_resource`:TEXT [NN], `evidence`:JSONB [NN, d='{}'::jsonb], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `document_embeddings`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `content_chunk`:text [NN], `metadata`:jsonb [NN, d='{}'::jsonb], `embedding`:vector(768) [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0001_optimus_vector_kg.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `tenant_id`:UUID [NN], `content_chunk`:TEXT [NN], `metadata`:JSONB [NN, d='{}'::jsonb], `embedding`:VECTOR(768) [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `entities`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `name`:text [NN], `entity_type`:text [NN], `description`:text, `properties`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `entity_relationships`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `source_entity_id`:uuid [NN], `target_entity_id`:uuid [NN], `relationship_type`:text [NN], `weight`:double [NN, d=1], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `faq_opportunities`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `aeo_analysis_id`:uuid [NN], `question_text`:text [NN], `user_intent`:text [NN, d='Informational'], `opportunity_score`:integer [NN, d=50], `suggested_answer`:text, `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0011_aeo_content_intelligence.sql**
- columns: `id`:UUID [PK], `organization_id`:UUID [NN], `page_id`:UUID [NN], `question`:TEXT [NN], `source_type`:TEXT [NN], `evidence_source_id`:UUID, `priority`:TEXT [NN], `impact_score`:INTEGER [NN], `status`:TEXT [NN, d='active'], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `feature_flags`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `key`:text [NN], `name`:text [NN], `description`:text [NN], `is_enabled_globally`:boolean [NN, d=false], `tenant_overrides`:text [NN, d='{}'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
### `historical_metrics`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `entity_type`:text [NN], `entity_id`:uuid [NN], `metric_name`:text [NN], `metric_value`:double [NN], `dimensions`:jsonb [NN, d='{}'::jsonb], `recorded_at`:timestamp with time zone [NN, d=NOW()], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `target_type`:TEXT [NN], `target_id`:UUID [NN], `metric_name`:TEXT [NN], `metric_value`:DOUBLE [NN], `dimensions`:JSONB [NN, d='{}'::jsonb], `timestamp`:TIMESTAMP WITH TIME ZONE [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `version`:INTEGER [NN, d=1]
### `keywords`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `term`:text [NN], `normalized_term`:text [NN], `language`:text [NN, d='en'], `intent`:text, `search_volume`:integer, `cpc`:double, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `name`:TEXT [NN], `display_name`:TEXT [NN], `language`:TEXT [NN, d='en'], `intent`:TEXT, `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `keywords_topics`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `keyword_id`:uuid [NN], `topic_id`:uuid [NN], `organization_id`:uuid [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "keywords_topics_keyword_id_topic_id_pk" PRIMARY KEY("keyword_id","topic_id")
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `organization_id`:UUID [NN], `keyword_id`:UUID [NN], `topic_id`:UUID [NN]
- constraints: PRIMARY KEY (keyword_id, topic_id)
### `kg_alignments`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `aeo_analysis_id`:uuid [NN], `entity_name`:text [NN], `entity_type`:text [NN], `wikidata_id`:text, `alignment_status`:text [NN, d='unmapped'], `confidence`:double [NN, d=0], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0011_aeo_content_intelligence.sql**
- columns: `id`:UUID [PK], `organization_id`:UUID [NN], `page_id`:UUID [NN], `alignment_type`:TEXT [NN], `entity_name`:TEXT [NN], `property_name`:TEXT, `expected_value`:TEXT, `actual_value`:TEXT, `status`:TEXT [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `kg_entities`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `name`:text [NN], `type`:text [NN], `properties`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0001_optimus_vector_kg.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `tenant_id`:UUID [NN], `name`:TEXT [NN], `type`:TEXT [NN], `properties`:JSONB [NN, d='{}'::jsonb], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `kg_relationships`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `source_entity_id`:uuid [NN], `target_entity_id`:uuid [NN], `relationship_type`:text [NN], `properties`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0001_optimus_vector_kg.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `tenant_id`:UUID [NN], `source_entity_id`:UUID [NN], `target_entity_id`:UUID [NN], `relationship_type`:TEXT [NN], `properties`:JSONB [NN, d='{}'::jsonb], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `monitoring_alerts`
- **database/drizzle/0003_yellow_winter_soldier.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `monitoring_config_id`:uuid [NN], `crawl_snapshot_id`:uuid, `alert_type`:text [NN], `severity`:text [NN], `message`:text [NN], `event_metadata`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `dedup_key`:text [NN]
- **database/migrations/0016_website_monitoring.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `monitoring_config_id`:UUID [NN], `crawl_snapshot_id`:UUID, `alert_type`:TEXT [NN], `severity`:TEXT [NN], `message`:TEXT [NN], `event_metadata`:JSONB [NN, d='{}'::jsonb], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `dedup_key`:TEXT [NN]
- **database/migrations/0017_website_monitoring_v2.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `monitoring_config_id`:uuid [NN], `snapshot_id`:uuid [NN], `category`:text [NN], `severity`:text [NN], `type`:text [NN], `fingerprint`:text [NN], `url`:text, `message`:text [NN], `previous_value`:jsonb, `current_value`:jsonb, `status`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `resolved_at`:timestamp with time zone
### `monitoring_configs`
- **database/drizzle/0003_yellow_winter_soldier.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `website_id`:uuid [NN], `target_url`:text [NN], `enabled`:boolean [NN, d=true], `crawl_policy`:jsonb [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0016_website_monitoring.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `website_id`:UUID [NN], `target_url`:TEXT [NN], `enabled`:BOOLEAN [NN, d=true], `crawl_policy`:JSONB [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
- **database/migrations/0017_website_monitoring_v2.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `website_id`:uuid [NN], `enabled`:boolean [NN, d=true], `schedule`:text [NN], `crawl_url`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `organization_invitations`
- **database/drizzle/0001_illegal_grey_gargoyle.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `email`:text [NN], `role`:text [NN], `token_hash`:text [NN], `expires_at`:timestamp with time zone [NN], `status`:text [NN, d='pending'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `organization_members`
- **database/drizzle/0001_illegal_grey_gargoyle.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `user_id`:text [NN], `role`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `organizations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `name`:text [NN], `slug`:text [NN], `plan`:text [NN, d='free'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- constraints: CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
### `pages`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `website_id`:uuid [NN], `url`:text [NN], `normalized_url`:text [NN], `path`:text [NN], `title`:text, `meta_description`:text, `http_status`:integer [NN, d=200], `content_type`:text, `content_hash`:text, `word_count`:integer [NN, d=0], `canonical_url`:text, `robots_directives`:text[] [NN, d='{}'::text[]], `inlink_count`:integer [NN, d=0], `outlink_count`:integer [NN, d=0], `last_crawled_at`:timestamp with time zone, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `website_id`:UUID [NN], `url`:TEXT [NN], `normalized_url`:TEXT [NN], `path`:TEXT [NN], `status_code`:INTEGER, `indexability`:TEXT [NN], `title`:TEXT, `description`:TEXT, `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `pages_entities`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `page_id`:uuid [NN], `entity_id`:uuid [NN], `organization_id`:uuid [NN], `salience`:double [NN, d=1], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "pages_entities_page_id_entity_id_pk" PRIMARY KEY("page_id","entity_id")
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `organization_id`:UUID [NN], `page_id`:UUID [NN], `entity_id`:UUID [NN]
- constraints: PRIMARY KEY (page_id, entity_id)
### `pages_keywords`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `page_id`:uuid [NN], `keyword_id`:uuid [NN], `organization_id`:uuid [NN], `is_primary`:boolean [NN, d=false], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "pages_keywords_page_id_keyword_id_pk" PRIMARY KEY("page_id","keyword_id")
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `organization_id`:UUID [NN], `page_id`:UUID [NN], `keyword_id`:UUID [NN]
- constraints: PRIMARY KEY (page_id, keyword_id)
### `pages_topics`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `page_id`:uuid [NN], `topic_id`:uuid [NN], `organization_id`:uuid [NN], `score`:double [NN, d=1], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "pages_topics_page_id_topic_id_pk" PRIMARY KEY("page_id","topic_id")
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `organization_id`:UUID [NN], `page_id`:UUID [NN], `topic_id`:UUID [NN]
- constraints: PRIMARY KEY (page_id, topic_id)
### `permissions`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `role_id`:uuid [NN], `permission_key`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
### `position_observations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `source_execution_id`:uuid [NN], `subject_entity_id`:text [NN], `presence`:text [NN], `numeric_position`:integer, `evidence_excerpt`:text [NN], `evidence_structure`:text [NN], `confidence`:double [NN], `analyzer_version`:text [NN, d='1.0.0'], `created_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0008_prompt_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `source_execution_id`:UUID [NN], `subject_entity_id`:TEXT [NN], `presence`:TEXT [NN], `numeric_position`:INTEGER, `evidence_excerpt`:TEXT [NN], `evidence_structure`:TEXT [NN], `confidence`:DOUBLE [NN], `analyzer_version`:TEXT [NN, d='1.0.0'], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `premium_audits`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `url`:text [NN], `score`:integer [NN], `grade`:text [NN], `pages_analyzed`:integer [NN], `metrics`:jsonb [NN], `issues`:jsonb [NN], `recommendations`:jsonb [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
### `prompt_definitions`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `brand_id`:uuid [NN], `name`:text [NN], `prompt_template`:text [NN], `category`:text [NN], `intent`:text [NN], `locale`:text [NN], `is_active`:boolean [NN, d=true], `variables`:jsonb [NN], `competitors`:text[] [NN], `tags`:text[] [NN], `notes`:text, `version`:integer [NN, d=1], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `opt_version`:integer [NN, d=1]
- **database/migrations/0008_prompt_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `brand_id`:UUID [NN], `name`:TEXT [NN], `prompt_template`:TEXT [NN], `category`:TEXT [NN], `intent`:TEXT [NN], `locale`:TEXT [NN], `is_active`:BOOLEAN [NN, d=TRUE], `variables`:JSONB [NN, d='[]'::jsonb], `competitors`:TEXT[] [NN, d='{}'::text[]], `tags`:TEXT[] [NN, d='{}'::text[]], `notes`:TEXT, `version`:INTEGER [NN, d=1], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `opt_version`:INTEGER [NN, d=1]
### `prompt_executions`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `prompt_id`:uuid [NN], `prompt_version`:integer [NN], `resolved_prompt_text`:text [NN], `variables_values`:jsonb [NN], `status`:text [NN, d='queued'], `provider`:text [NN], `model`:text [NN], `model_version`:text, `response_text`:text, `latency_ms`:integer, `error_message`:text, `attempts`:integer [NN, d=0], `max_attempts`:integer [NN, d=3], `scheduled_for`:timestamp with time zone, `executed_at`:timestamp with time zone, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "prompt_executions_status_check" CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled'))
- **database/migrations/0008_prompt_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `prompt_id`:UUID [NN], `prompt_version`:INTEGER [NN], `resolved_prompt_text`:TEXT [NN], `variables_values`:JSONB [NN, d='{}'::jsonb], `status`:TEXT [NN, d='queued'], `provider`:TEXT [NN], `model`:TEXT [NN], `model_version`:TEXT, `response_text`:TEXT, `latency_ms`:INTEGER, `error_message`:TEXT, `attempts`:INTEGER [NN, d=0], `max_attempts`:INTEGER [NN, d=3], `scheduled_for`:TIMESTAMP WITH TIME ZONE, `executed_at`:TIMESTAMP WITH TIME ZONE, `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `prompt_schedules`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `prompt_id`:uuid [NN], `enabled`:boolean [NN, d=true], `cron_expression`:text [NN], `timezone`:text [NN, d='UTC'], `next_execution_at`:timestamp with time zone, `last_execution_at`:timestamp with time zone, `status`:text [NN, d='IDLE'], `failure_reason`:text, `schedule_version`:integer [NN, d=1], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0008_prompt_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `prompt_id`:UUID [NN], `enabled`:BOOLEAN [NN, d=TRUE], `cron_expression`:TEXT [NN], `timezone`:TEXT [NN, d='UTC'], `next_execution_at`:TIMESTAMP WITH TIME ZONE, `last_execution_at`:TIMESTAMP WITH TIME ZONE, `status`:TEXT [NN, d='IDLE'], `failure_reason`:TEXT, `schedule_version`:INTEGER [NN, d=1], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `prompts`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `brand_id`:uuid [NN], `query_text`:text [NN], `category`:text [NN], `buying_intent`:text [NN], `is_active`:boolean [NN, d=true], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `recommendation_observations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `brand_id`:uuid [NN], `category`:text [NN], `recommended_action`:text [NN], `engine_id`:text [NN], `frequency`:integer [NN, d=1], `confidence_score`:double [NN, d=0], `metadata`:jsonb [NN, d='{}'::jsonb], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- **database/migrations/0010_brand_intelligence.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `brand_id`:UUID [NN], `execution_id`:UUID, `prompt_id`:UUID, `observation_id`:UUID [NN], `recommendation_status`:TEXT [NN], `position`:INTEGER, `evidence_excerpt`:TEXT [NN], `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()]
### `recommendations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `brand_id`:uuid [NN], `category`:text [NN], `priority`:text [NN], `impact_score`:integer [NN], `title`:text [NN], `description`:text [NN], `action_plan`:jsonb [NN], `status`:text [NN, d='open'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `roles`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `name`:text [NN], `hierarchy_rank`:integer [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "roles_name_unique" UNIQUE("name")
### `system_configurations`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `key`:text [NN], `value`:text [NN], `category`:text [NN], `is_encrypted`:boolean [NN, d=false], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "system_configurations_key_unique" UNIQUE("key")
### `technical_audits`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `url`:text [NN], `technical_score`:integer [NN], `grade`:text [NN], `pages_analyzed`:integer [NN], `categories`:jsonb [NN], `critical_issues`:jsonb [NN], `quick_wins`:jsonb [NN], `performance_metrics`:jsonb [NN], `created_at`:timestamp with time zone [d=NOW()]
- **database/migrations/0002_technical_audits.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `url`:TEXT [NN], `technical_score`:INTEGER [NN], `grade`:TEXT [NN], `pages_analyzed`:INTEGER [NN], `categories`:JSONB [NN], `critical_issues`:JSONB [NN], `quick_wins`:JSONB [NN], `performance_metrics`:JSONB [NN], `created_at`:TIMESTAMP [d=NOW()]
### `tenant_quotas`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `max_users`:integer [NN], `max_brands`:integer [NN], `max_prompts`:integer [NN], `max_observations_per_month`:integer [NN], `max_crawl_jobs_per_day`:integer [NN], `monthly_token_limit`:integer [NN], `monthly_cost_limit_usd`:integer [NN], `used_observations_this_month`:integer [NN, d=0], `used_tokens_this_month`:integer [NN, d=0], `used_crawl_jobs_today`:integer [NN, d=0], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `tenant_subscriptions`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `tenant_id`:uuid [NN], `plan`:text [NN], `status`:text [NN], `billing_cycle`:text [NN], `start_date`:timestamp with time zone [NN], `end_date`:timestamp with time zone [NN], `price_amount`:integer [NN], `currency`:text [NN, d='USD'], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `topics`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `name`:text [NN], `description`:text, `language`:text [NN, d='en'], `parent_topic_id`:uuid, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `name`:TEXT [NN], `description`:TEXT, `language`:TEXT [NN, d='en'], `parent_topic_id`:UUID, `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]
### `topics_entities`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `topic_id`:uuid [NN], `entity_id`:uuid [NN], `organization_id`:uuid [NN], `created_at`:timestamp with time zone [NN, d=NOW()]
- constraints: CONSTRAINT "topics_entities_topic_id_entity_id_pk" PRIMARY KEY("topic_id","entity_id")
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `organization_id`:UUID [NN], `topic_id`:UUID [NN], `entity_id`:UUID [NN]
- constraints: PRIMARY KEY (topic_id, entity_id)
### `unauthenticated_audit_rate_limits`
- **database/drizzle/0005_unauthenticated_rate_limits.sql**
- columns: `identifier`:text [PK, NN], `short_window_start`:timestamp with time zone [NN, d=NOW()], `short_window_count`:integer [NN, d=0], `daily_window_start`:timestamp with time zone [NN, d=NOW()], `daily_window_count`:integer [NN, d=0], `updated_at`:timestamp with time zone [NN, d=NOW()]
### `users`
- **database/drizzle/0001_illegal_grey_gargoyle.sql**
- columns: `id`:text [PK, NN], `name`:text [NN], `email`:text [NN], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `deleted_at`:timestamp with time zone
- constraints: CONSTRAINT "users_email_unique" UNIQUE("email")
### `visibility_scores`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `brand_id`:uuid [NN], `engine_id`:uuid [NN], `overall_score`:integer [NN], `presence_rate`:double [NN], `avg_position`:double, `net_sentiment`:double [NN], `recorded_at`:timestamp with time zone [NN, d=NOW()], `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
### `websites`
- **database/drizzle/0000_reflective_loa.sql**
- columns: `id`:uuid [PK, NN, d=gen_random_uuid()], `organization_id`:uuid [NN], `domain`:text [NN], `normalized_url`:text [NN], `status`:text [NN, d='active'], `cms_type`:text, `last_crawled_at`:timestamp with time zone, `last_analyzed_at`:timestamp with time zone, `created_at`:timestamp with time zone [NN, d=NOW()], `updated_at`:timestamp with time zone [NN, d=NOW()], `created_by`:text [NN, d='system'], `updated_by`:text [NN, d='system'], `deleted_at`:timestamp with time zone, `version`:integer [NN, d=1]
- **database/migrations/0005_unified_intelligence_model.sql**
- columns: `id`:UUID [PK, d=gen_random_uuid()], `organization_id`:UUID [NN], `domain`:TEXT [NN], `normalized_url`:TEXT [NN], `status`:TEXT [NN, d='active'], `last_crawled_at`:TIMESTAMP WITH TIME ZONE, `last_analyzed_at`:TIMESTAMP WITH TIME ZONE, `created_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `updated_at`:TIMESTAMP WITH TIME ZONE [NN, d=NOW()], `created_by`:TEXT [NN, d='system'], `updated_by`:TEXT [NN, d='system'], `deleted_at`:TIMESTAMP WITH TIME ZONE, `version`:INTEGER [NN, d=1]

# Canonical Schema

## What is actually canonical

The repository declares `database/schema/index.ts` as the Drizzle entry point, but that file is a composition of a large monolithic schema plus re-exports from `organization.ts`, `api-keys.ts`, `audits.ts`, `credits.ts`, `credit-transactions.ts`, and `unauthenticated-rate-limits.ts` at `database/schema/index.ts:1-8`. It also contains a duplicate `export * from "./audits"` and a duplicate SQL table definition for `credit_transactions`.

The other files under `database/schema/` are not one consistent second source. Many are `TableDefinition` metadata objects with embedded hand-authored SQL, for example `database/schema/entity.ts`, `database/schema/kg.ts`, and `database/schema/aeo-content-intelligence.ts`. `database/schema/index.ts.tmp2` is a stale competing Drizzle source and is materially different from `index.ts`. This is source assembly drift, not a safe modular schema.

## Canonical-source facts

- **FACT:** Drizzle Kit reads `database/schema/index.ts` and writes `database/drizzle` (`drizzle.config.ts:3-8`).
- **FACT:** Current source has UUID users, boolean `is_active`, integer `challenge_required`, `auth_locks`, `credits`, and `audits` (`database/schema/organization.ts:46-80`, `database/schema/credits.ts:37-47`, `database/schema/audits.ts:38-54`).
- **FACT:** Generated migrations have text users with no password or verification columns, no `auth_locks`, no `credits`, and no `audits` (`database/drizzle/0001_illegal_grey_gargoyle.sql:14-47`; absence confirmed across `database/drizzle/*.sql`).
- **FACT:** The current source monitoring model is v2 (`database/schema/index.ts:1177-1237`), while `meta/0005_snapshot.json` retains the older monitoring columns.
- **STRONGLY SUPPORTED INFERENCE:** The current source was changed without a complete, valid migration regeneration and application cycle. The local shell artifacts `replace_schema.sh`, `replace_schema_credit_transactions.sh`, and `replace_schema_credits.sh` show mechanical schema patching, but the archive does not prove when or whether those scripts were executed.

## Relationship inventory

| Relationship | Database enforcement | Application enforcement | Assessment |
|---|---|---|---|
| `organization_members.organization_id -> organizations.id` | FK, cascade | Workspace actions | Database-enforced edge, but RLS/system-role behavior is not proven. |
| `organization_members.user_id -> users.id` | FK in generated SQL | Login/workspace actions | Generated edge is text-based; current source expects UUID. |
| `organization_invitations.organization_id -> organizations.id` | FK, cascade | Invite/accept actions | Acceptance is read-insert-update without a row lock. |
| `pages.website_id -> websites.id` | FK, cascade | Page repositories | Parent organization is not part of the FK. Cross-tenant association is structurally possible if the ID is known. |
| Join tables to page/keyword/topic/entity | ID-only composite PK and FKs | Tenant predicates in repositories | The join row has its own tenant key, but no composite tenant-plus-parent FK. |
| `entity_relationships` and `kg_relationships` endpoints | Endpoint FKs | Service filters and RLS on relationship tenant column | Tenant equality between relationship and both endpoints is not DB-enforced. |
| Audit/prompt/AEO child rows | Several ID-only FKs vary by stream | Repository/application filters | Generated and legacy versions use different parent columns; orphan and cross-tenant states differ by migration path. |
| API credentials to organization | Legacy `api_keys` FK only | `ApiService` and repository | Legacy-only, no creator-user FK, no service-principal model. |
| Payment to workspace | No payment table or FK | Webhook trusts payload `workspaceId` | Application-only and replayable. |
| Source/evidence/claim | No universal claim/evidence graph | JSON fields and domain repositories | Partial, fragmented, not a canonical knowledge graph. |

# Canonical Migration Chain

## Executable Drizzle chain

`database/drizzle/meta/_journal.json` contains six entries, indexes `0..5`, tags matching the six SQL filenames, unique IDs, matching `prevId` values in snapshots, PostgreSQL version 7 metadata, and no enum/schema/view/sequence/role objects. Its links are structurally coherent. The SQL semantics are not.

| Order | File | Direct operations | Result / issue |
|---|---|---|---|
| 0000 | `database/drizzle/0000_reflective_loa.sql` | Creates 57 tables, 103 indexes, 81 FKs, five composite PKs, named unique and check constraints, and baseline RLS/policies. | The SQL and `0000_snapshot.json` agree on the baseline object set. The snapshot metadata does not represent the SQL RLS enable state faithfully. |
| 0001 | `database/drizzle/0001_illegal_grey_gargoyle.sql` | Creates `organization_invitations`, `organization_members`, and text-ID `users`; adds 3 FKs, 4 indexes, 8 policies, and a users email uniqueness constraint. | SQL/snapshot delta is coherent. It does not create password, verification, or session persistence. |
| 0002 | `database/drizzle/0002_soft_jimmy_woo.sql` | Creates `credit_transactions`; adds `tenant_quotas.credits_balance`, one index, and four policies. | SQL/snapshot delta is coherent, but no `credits` table exists and the ledger shape conflicts with source-only billing code. |
| 0003 | `database/drizzle/0003_yellow_winter_soldier.sql` | Creates `competitor_mentions`, `crawl_snapshots`, `monitoring_alerts`, and `monitoring_configs`; adds 11 FKs, 11 indexes, and 16 policies. | SQL/snapshot delta is coherent for the old monitoring model. |
| 0004 | `database/drizzle/0004_rls_isolation.sql` | 57 `ALTER TABLE ... ENABLE`, 57 `FORCE`, 228 `DROP POLICY`, and 228 `CREATE POLICY`; zero table/column/index/FK DDL and zero statement-breakpoint markers. | Snapshot claims broad object changes and adds `automated_recommendations` metadata. SQL first references that missing table at lines 591-603. Crawl policies cast text tenant columns to UUID. |
| 0005 | `database/drizzle/0005_unauthenticated_rate_limits.sql` | Creates `unauthenticated_audit_rate_limits` only. | Its snapshot inherits 0004's malformed names and stale monitoring model. The file has zero statement-breakpoint markers despite journal `breakpoints: true`. |

## Legacy hand-authored chain

The 19 files under `database/migrations/` are not called by `src/core/database/migrator.ts`.

| Migration | Main objects and operations |
|---|---|
| 0001 | Enables `vector`; creates `document_embeddings`, `kg_entities`, `kg_relationships`; creates HNSW vector index and RLS/FORCE. |
| 0002 | Creates `technical_audits`. |
| 0003 | Creates `competitive_analyses` with RLS/FORCE. |
| 0004 | Creates crawl jobs/results/cache, checks, unique and partial indexes, RLS/FORCE, `SECURITY DEFINER` lease functions, crawler grants. |
| 0005 | Creates websites, pages, keywords, topics, competitors, historical metrics, and five join tables. |
| 0006 | Creates diagnostic findings and relationship tables with legacy composite relationship PK. |
| 0007 | Creates AI visibility audits and audit prompts. |
| 0008 | Creates prompt definitions, schedules, executions, and observations with checks and a scheduled-run unique index. |
| 0009 | Creates citation sources/occurrences, including a source-domain unique index and occurrence idempotency unique index. |
| 0010 | Creates brand associations and recommendation observations with unique tenant-scoped indexes. |
| 0011 | Creates a second AEO content model with page-based JSON columns. |
| 0012 | Adds competitor discovery/change columns. |
| 0013 | Creates a second competitive SEO findings model. |
| 0014 | Replaces the competitive finding type check with 11 text values. |
| 0015 | Creates `api_keys`, RLS, organization FK, and prefix uniqueness. No FORCE RLS. |
| 0016 | Creates old monitoring tables. |
| 0017 | Drops old monitoring tables with `CASCADE` and recreates monitoring v2. |
| 0018 | Creates `automated_recommendations`. |
| 0019 | Adds password and lock fields to `users`, but not email verification fields. |

Applying both chains is not valid. They redefine many same-named tables with different columns, parent references, checks, indexes, and lifecycle semantics.

# Migration Forensic Timeline

| Migration | Expected schema from journal/snapshot | Actual SQL/repository state | Divergence | Evidence classification |
|---|---|---|---|---|
| 0000 | 57-table baseline | SQL creates 57 tables and 0000 snapshot lists 57 | Baseline SQL/snapshot object set is coherent, but current source later changed several contracts | FACT for replay; source drift is separate |
| 0001 | Add identity tables with text `users.id` | SQL creates text `users.id` and text `organization_members.user_id` | Current `organization.ts` declares UUID IDs and security fields | FACT; exact source-change point is OPEN QUESTION |
| 0002 | Add ledger and quota balance | SQL adds `credit_transactions.tenant_id` and `credits_balance` | Source-only `credits` path and standalone `organization_id` ledger diverge | FACT |
| 0003 | Add old monitoring v1 tables | SQL and snapshot add old monitoring v1 | Current source declares monitoring v2 fields | FACT; legacy 0017 is the only inspected SQL transition |
| 0004 | Snapshot claims broad schema rewrite and a new `automated_recommendations` table | SQL only rewrites RLS policies; first `ALTER TABLE automated_recommendations` targets an absent table | Snapshot and SQL are not representations of the same schema state; text/UUID policy type mismatch is introduced | FACT, first provable artifact divergence |
| 0005 | Add rate-limit table on top of 0004 state | SQL adds only rate-limit table | Snapshot retains malformed underscore-stripped names and stale monitoring structure | FACT |
| 0015 legacy | Add API credentials | SQL creates `api_keys` | Runtime migrator never applies the file; current source still imports and uses the table | FACT |
| 0017 legacy | Replace monitoring v1 with v2 | SQL drops three tables `CASCADE`, then recreates them | Not executable through the runtime runner; destructive and no rollback exists | FACT |
| 0019 legacy | Add auth security fields | SQL adds password/lock columns only | Not executable through runtime runner and does not add `email_verified` or `email_verified_at` used by registration | FACT |

# First Point of Divergence

## Earliest provable artifact divergence

**FACT:** The earliest provable generated migration divergence is `0004`.

`database/drizzle/0004_rls_isolation.sql` has 114 `ALTER TABLE` statements, 228 policy drops, and 228 policy creates, but no `CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`, `ADD CONSTRAINT`, or `DROP TABLE`. In contrast, `meta/0004_snapshot.json` changes the table set by adding five names and removing four, rekeys dozens of columns and indexes, changes 97 foreign-key keys versus 95 removed keys, replaces five composite-primary-key names, changes policies, unique constraints, and checks, and adds `automated_recommendations`.

Four table names are visibly underscore-stripped in the snapshot: `ai_provider_configs -> aiproviderconfigs`, `ai_visibility_audits -> aivisibilityaudits`, `competitive_seo_findings -> competitiveseofindings`, and `diagnostic_finding_relationships -> diagnosticfindingrelationships`. It also changes `structured_answer_quality_score` to `structuredanswerquality_score` and strips underscores from five tenant-quota columns. No matching rename or table DDL exists in 0004 SQL.

## What caused it

**FACT:** The repository contains duplicate schema sources, a stale `index.ts.tmp2`, separate `TableDefinition` modules with embedded SQL, shell scripts that mechanically patch schemas, and two migration directories.

**STRONGLY SUPPORTED INFERENCE:** `0004_snapshot.json` was generated from a schema state or naming transformation different from the SQL artifact that was committed, or the SQL was later reduced to an RLS-only patch without regenerating the snapshot. The underscore stripping and the `automated_recommendations` metadata entry make a simple hand-authored RLS change insufficient to explain the snapshot.

**OPEN QUESTION:** The archive has no Git history, commit IDs, or migration execution logs. The exact human/process event that created the mismatch cannot be proven.

## Downstream consequences

- A clean database applying only `database/drizzle` fails at `ALTER TABLE automated_recommendations` before 0005.
- If that failure is bypassed, 0004 applies UUID-cast policies to `crawl_jobs`, `crawl_results`, and `crawl_cache.tenant_id`, which are text columns. The earlier text-safe policies in 0000 and legacy 0004 do not cast.
- Future Drizzle generation against 0005 metadata can treat real underscored tables/columns as missing or renamed and propose dangerous rename/drop/recreate operations.
- The current v2 monitoring source cannot be obtained from the executable Drizzle chain. Legacy 0017 supplies it only through a dead and destructive stream.
- Auth/API/credit runtime paths remain unsupported even if 0004 is repaired because their required tables and columns are absent or differently typed.

# Schema Integrity Findings

## Primary keys, foreign keys, and tenant identity

Most ordinary IDs are UUIDs with `gen_random_uuid()`. The exceptions that matter are text `users.id` in generated SQL, text tenant IDs in crawl tables, and text rate-limit identifiers. The current source changes user IDs to UUID without a migration.

The dominant FK problem is not missing IDs; it is missing tenant equality. Foreign keys such as `pages.website_id -> websites.id`, `entity_relationships.source_entity_id -> entities.id`, `kg_relationships.source_entity_id -> kg_entities.id`, and every join-table parent edge are single-column references. A child can carry tenant A while pointing at a known parent ID from tenant B. RLS checks the child tenant column, not the tenant of the referenced parent. The repository needs composite tenant-plus-ID parent keys or an equivalent database trigger/invariant before treating RLS as complete.

Concrete missing or weak FK coverage includes:

- `document_embeddings.tenant_id` has no organization FK in generated or legacy SQL.
- `crawl_jobs`, `crawl_results`, and `crawl_cache` use duplicated text tenant IDs without an organization FK; `crawl_results.tenant_id` is not constrained to equal its job tenant.
- `admin_users.role_id`, `ai_provider_configs.failover_provider_id`, and `audit_records.actor_id` are not reliably FK-bound to the intended principals.
- Source-only `audits`, `credits`, and `auth_locks` have no executable DDL.
- Generated `technical_audits` and `competitive_analyses` are tenant-filtered but do not receive the same parent FK coverage as core organization-owned tables.

## Unique constraints and indexes

The source uses partial unique indexes for soft-deleted objects, but some declarations also use unconditional `.unique()`. `organizations.slug` is declared unique and also gets a partial unique index at `database/schema/organization.ts:85-99`; the unconditional unique constraint prevents slug reuse after soft delete, contrary to the partial-index intent. Similar redundant unique-plus-ordinary indexes exist for roles, feature flags, system configuration keys, admin email, and API-key prefixes.

`tenant_quotas` and `tenant_subscriptions` have non-unique tenant indexes. `SubscriptionService.getEffectiveSubscription()` therefore uses `LIMIT 1` at `src/features/billing/services/subscription-service.ts:19-23`, which is nondeterministic when duplicate rows exist. `allocateCredits()` has a read-then-insert race at `:155-177`.

The current graph tables have no canonical unique edge constraint. `GraphStoreService` check-then-inserts relationships at `src/services/knowledge-graph/graph-store.ts:147-195`. The separate `entity_relationships` repository uses an `ON CONFLICT (source_entity_id,target_entity_id,relationship_type)` contract at `src/features/ai-intelligence/repositories/index.ts:3270-3287`, but the canonical table has only a surrogate `id` and no matching unique constraint.

## Nullability, checks, status, and ranges

Checks are concentrated in crawl status/attempt/version/cache outcome, prompt execution status, and competitive finding type. Many scores, confidence values, counts, prices, credit amounts, status fields, and JSON shapes have no checks. There is no database guarantee that:

- credit balances and ledger amounts are nonnegative where intended;
- `amount` is positive for allocations or negative for consumption;
- score fields are between 0 and 100;
- `failed_login_attempts`, challenge flags, or quota counters are nonnegative;
- membership roles are limited to `super_admin`, `workspace_admin`, or `viewer`;
- invitations use a valid lifecycle state;
- only one active subscription or quota row exists per tenant;
- financial integers represent a documented currency minor unit.

## Cascades and deletion

The generated baseline uses broad `ON DELETE CASCADE` relationships across organization-owned data, graph endpoints, monitoring history, audit children, membership rows, and credentials. This conflicts with the widespread use of `deleted_at` and soft-delete repository methods. A hard organization delete can physically remove evidence, graph edges, observations, and audit history. Legacy monitoring 0017 explicitly drops three tables with `CASCADE` at `database/migrations/0017_website_monitoring_v2.sql:1-5`. There is no end-to-end cascade or retention test.

## Financial and security data types

Financial and credit fields are integer-based: `price_amount`, quota cost limits, quota balances, and ledger amounts. There is no documented currency minor-unit contract, precision policy, refund model, or database immutability rule. Security fields include password hashes, API-key hashes, token hashes, IP arrays, and masked provider keys, but the database does not validate hash formats, ownership actor identity, or encryption of fields marked `is_encrypted`.

# Application â†” Database Contract Findings

## Critical table contracts

| Table/domain | Actual create/read/update/delete paths | Contract result |
|---|---|---|
| Users | `src/app/actions/auth.ts:44-159,202-235` raw SELECT/INSERT/UPDATE | Registration inserts absent verification columns; current UUID source conflicts with text migration; lock fields are not in executable SQL. |
| Organizations/memberships | `src/app/actions/workspace.ts:12-235` | System-context writes and reads occur with null tenant context while generated RLS targets organizations, memberships, and invitations. Actual role privilege behavior is OPEN. |
| Invitations | `src/app/actions/workspace.ts:64-152` | Token is hashed and persisted, but acceptance is not a single transaction and role is unconstrained. |
| API keys | `src/features/public-api/services/api-service.ts:13-88`, `src/features/public-api/repositories/api-key-repository.ts:11-74` | Uses legacy-only `api_keys`; lookup in system context depends on RLS role behavior; creator identity is only free text. |
| AEO and intelligence | `src/features/ai-intelligence/repositories/index.ts:671-933,992-1158` | Raw SQL targets the legacy 0011 shape: `organization_id`, `page_id`, JSON score columns, and legacy `ON CONFLICT` keys. The active generated AEO tables use `tenant_id`, URL/keyword, and integer score columns. |
| Credits/quota | `src/lib/credits.ts:8-104`, `src/features/billing/services/subscription-service.ts:101-185` | Two incompatible balance/ledger models are live in code. Payment uses source-only `credits`; subscription service uses `tenant_quotas` and generated `credit_transactions`. |
| Monitoring | `src/features/monitoring/services/ai-visibility-monitoring-service.ts:17-162`, repository code | Runtime repository fallback can return memory schedules when DB context/query fails; source monitoring columns are v2 while final Drizzle snapshot is v1. |
| Crawl | `scripts/crawl-worker.ts:40-155`, legacy `0004_crawl_acquisition.sql` | Lease SQL is the strongest concurrency design in the repository, but it belongs to the dead hand-authored stream and uses a separate pool. |
| Sessions | `src/services/auth/session.ts:46-149` | No session table; signed cookie is the only durable-looking state. |
| Payment | `src/app/api/webhooks/payment/route.ts:4-48` | No payment persistence, provider event identity, signature verification, or invoice relationship. |

## Raw-query shape mismatch

The AI intelligence repository is a direct contract failure, not merely a missing index. For example, `saveAnalysis()` inserts `aeo_analyses (id, organization_id, page_id, overall_score, answerability, ...)` and uses `ON CONFLICT (page_id, analyzer_version, scoring_version)` at `src/features/ai-intelligence/repositories/index.ts:689-705`. The generated table created by `database/drizzle/0000_reflective_loa.sql:14-29` has `tenant_id`, `url`, `target_keyword`, integer score columns, and no `page_id`, `analyzer_version`, or `scoring_version`. The same pattern appears in FAQ opportunities, KG alignments, visibility audits, audit prompts, diagnostic findings, and historical metrics.

The repository catches many of these SQL failures and continues with process-local maps. That means the code can look operational while the database remains unchanged.

## Identity header bypass

The central `authorizeApiRequest()` function exists at `src/services/auth/authorization.ts:110-138`, but several API routes do not use it. They directly read client-controlled headers and establish tenant context:

- `src/app/api/v1/ai/chunk/route.ts:27-35` accepts `x-tenant-id` and defaults to `tenant-pipeline-a`.
- `src/app/api/v1/ai/sentiment/route.ts:25-36` accepts the same pattern.
- `src/app/api/v1/optimization/technical/route.ts:47-80` trusts `x-user-id` and `x-tenant-id`.
- `src/app/api/v1/audit/aeo-insight/route.ts:11-43` does the same, then queries graph data.
- `src/app/api/v1/analytics/summary/route.ts:4-18` trusts both headers and returns hard-coded analytics.

This directly violates the intended rejection of client-provided identity headers. It is a CRITICAL tenant/auth boundary defect.

## Silent fallback behavior

`PostgresClient.query()` catches pool failures and returns an empty SELECT-shaped result at `src/features/admin/infrastructure/persistence/postgres/index.ts:199-214`. The AI repositories then catch errors and write/read memory maps. `VectorStoreService.insertEmbedding()` returns a synthetic successful result when no row is returned at `src/services/knowledge-graph/vector-store.ts:47-69`. `AIVisibilityMonitoringService` fetches schedules before tenant context at `src/features/monitoring/services/ai-visibility-monitoring-service.ts:17-24`; its repository can catch the context error and return an in-memory schedule set at `src/features/ai-intelligence/repositories/index.ts:1393-1417`.

These behaviors are unacceptable for production persistence. A database outage must be an error, not an empty result or durable-looking success.

# Authentication Persistence Findings

| Requirement | Actual repository state | Evidence and consequence |
|---|---|---|
| Argon2id memory 19456/time 2 | Partially implemented | `src/app/actions/auth.ts:12-16` sets Argon2id, memoryCost 19456, timeCost 2, but does not explicitly set parallelism `p=1`. |
| Email verification | Not persisted | `registerAction` writes absent columns at `src/app/actions/auth.ts:214-217`; token is generated after commit at `:238-244`; verification UI is simulated at `src/app/[locale]/verify-email/page.tsx:59-97`. |
| Password reset | Not functional | `requestPasswordResetAction` creates an ephemeral UUID and sends it at `src/app/actions/auth.ts:166-188`; there is no reset-token table or completion action/route. Existing and missing-user paths also differ in mail behavior and timing. |
| Failure policy 0-2/3/4/5/6+ | Not implemented | Only an atomic increment and a 6+ challenge/60-minute lock exist at `src/app/actions/auth.ts:105-125`. No 20-second or 5-minute state exists. |
| Email/IP failure window | Not implemented | No `auth_locks` query or update appears in `src/app/actions/auth.ts`; source-only `auth_locks` is `database/schema/organization.ts:70-80`. No expiry window check is persisted. |
| Failure counter constraints | Missing | `failed_login_attempts` has no nonnegative check in source or executable migration. |
| Email normalization | Inconsistent | Login/register normalize, password reset queries raw input at `src/app/actions/auth.ts:173`, and invitation email matching is exact. The database only has an unconditional exact email uniqueness constraint. |
| Session secret | Fails open in production | `src/services/auth/session.ts:14-20` uses a random process-local fallback when `SESSION_SECRET` is absent. Sessions break across restarts/instances instead of failing closed. `.env.example` does not define `SESSION_SECRET`. |
| Session storage/revocation | Missing | `createSession()` serializes user, role, workspace, and expiry into a cookie at `src/services/auth/session.ts:46-81`; `invalidateSession()` only deletes cookies at `:144-149`. Copied cookies survive logout. |
| Membership/role freshness | Incomplete | `getSession()` verifies only signature/expiry at `src/services/auth/session.ts:87-119`; `authorizeApiRequest()` trusts embedded workspace/role at `src/services/auth/authorization.ts:110-118`. Deactivation, membership removal, and role changes do not invalidate ordinary sessions. |
| Email fallback safety | Fails open and logs secrets | `src/lib/email.ts:85-113` mocks successful sends and logs complete HTML at line 93. Verification/reset links are included in that HTML at lines 120-151. Missing `RESEND_API_KEY` can expose links and falsely report success. |

The required durable design is an opaque session record or an equivalent server-side session version/revocation check, hashed single-use verification/reset tokens with expiry, and a row-locked auth-attempt transition. No token table or session table exists today.

# Multi-Tenancy & RLS Findings

## Policy architecture

The intended policy helper in `database/schema/index.ts:40-70` compares `organization_id` or UUID `tenant_id` with `NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`; crawl tables use a text-safe comparison in the source helper. `TenantContextManager.runWithTenantContext()` starts a transaction and sets the local tenant setting at `src/core/database/tenant-context/index.ts:229-258`.

The generated baseline enables RLS on 44 tables. Generated 0004 intends to enable and FORCE RLS on 57 tables and replace policies with four operation-specific policies. That state is not proven because 0004 fails in a clean Drizzle replay. The legacy `api_keys`, monitoring v2, and automated recommendation migrations enable RLS without FORCE. Global/system tables such as `users`, `roles`, `permissions`, `admin_users`, `audit_records`, `feature_flags`, and `system_configurations` have no RLS policies; they require a separately defined role boundary that is absent from the repository.

## Table-by-table intended RLS matrix

The following is the matrix implied by generated 0004, not a claim about the deployed catalog. Every row is marked not proven because the migration cannot be cleanly replayed and no live catalog was inspected.

| Table | Tenant key | RLS state in intended 0004 final | SELECT | INSERT | UPDATE | DELETE | Cross-tenant / deployment risk |
|---|---|---|---|---|---|---|---|
| `aeo_analyses` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `ai_observations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `ai_visibility_audits` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `audit_prompts` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `automated_recommendations` | `unknown` (-) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Table absent before 0004 in Drizzle replay |
| `brand_associations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `brand_mentions` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `brands` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `citation_occurrences` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `citation_sources` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `citations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `competitive_analyses` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `competitive_seo_findings` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `competitor_changes` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `competitor_mentions` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `competitors` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `crawl_cache` | `tenant_id` (text) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | TEXT tenant key; 0004 policy casts setting to UUID |
| `crawl_jobs` | `tenant_id` (text) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | TEXT tenant key; 0004 policy casts setting to UUID |
| `crawl_results` | `tenant_id` (text) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | TEXT tenant key; 0004 policy casts setting to UUID |
| `crawl_snapshots` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `credit_transactions` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `diagnostic_finding_relationships` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `diagnostic_findings` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `document_embeddings` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | No organization FK; HNSW only in legacy stream |
| `entities` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `entity_relationships` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `faq_opportunities` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `historical_metrics` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `keywords` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `keywords_topics` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `kg_alignments` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `kg_entities` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `kg_relationships` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `monitoring_alerts` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `monitoring_configs` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `organization_invitations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | System context / role privileges unverified |
| `organization_members` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | System context / role privileges unverified |
| `organizations` | `id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | System context / role privileges unverified |
| `pages` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `pages_entities` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `pages_keywords` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `pages_topics` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `position_observations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `premium_audits` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `prompt_definitions` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `prompt_executions` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `prompt_schedules` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `prompts` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `recommendation_observations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `recommendations` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `technical_audits` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `tenant_quotas` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `tenant_subscriptions` | `tenant_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `topics` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `topics_entities` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `visibility_scores` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |
| `websites` | `organization_id` (uuid) | **not proven**: 0004 would enable + FORCE | yes | yes WITH CHECK | yes USING + WITH CHECK | yes | Parent tenant not tied by composite FK |

The matrix's repeated cross-tenant risk is structural: the row tenant key is checked, but referenced parent rows are not tenant-bound by composite FKs. It is not a statement that an exploit was executed; the exploitability of a known-ID cross-tenant insert remains a live-Postgres test requirement.

Additional source-only or legacy RLS exceptions:

- `api_keys` has source and legacy policies but no FORCE in `database/migrations/0015_api_keys.sql:17-24` and no executable Drizzle migration.
- `credits`, standalone `credit_transactions`, and `audits` have source-level policies but no applied DDL.
- `auth_locks` and `users` are global/system objects with no RLS policy. Their access must be controlled by a dedicated role or carefully scoped system procedures.
- `TENANT_SCOPED_TABLES` omits `organizations`, `organization_members`, `organization_invitations`, `api_keys`, `credits`, `credit_transactions`, pages, keywords, topics, websites, competitors, technical audits, and other tenant-sensitive objects. The lexical guard therefore cannot enforce complete coverage.
- `runWithSystemContext()` sets the tenant ID to null. With FORCE RLS and a normal non-bypass role, `createWorkspaceAction()` and membership queries may be denied because the organization policies require the row tenant ID to equal the current setting. The deployed role behavior is OPEN, not proven either way.
- `automatedRecommendationsDiagnosis` queries organizations through `drizzle(TenantContextManager.getDbClient())` without establishing a system or tenant context at `src/lib/inngest/functions.ts:35-50`.

# Payment / Credit / Financial Integrity Findings

## Actual chain

The implemented chain is:

`POST /api/webhooks/payment` -> shared header secret -> client-supplied `workspaceId` and numeric `amount` -> `addCredits()` -> source-only `credits` upsert -> standalone `credit_transactions.organization_id` insert.

The separate subscription chain is:

`TenantContextManager` -> `tenant_subscriptions` -> `tenant_quotas.credits_balance` -> generated `credit_transactions.tenant_id`.

These are not one ledger or balance. There is no persisted `payment`, `invoice`, `provider_event`, `webhook_event`, refund, or settlement object in either migration stream.

## Findings

- **Provider event idempotency is absent.** `provider_event_id` does not appear in applied or source payment objects. Replaying a valid request runs `addCredits()` again.
- **Signature verification is absent.** The route compares `x-webhook-secret` with `!==` at `src/app/api/webhooks/payment/route.ts:6-11`; it does not verify a provider signature over the raw body, timestamp, or provider identity.
- **Financial validation is absent.** The route checks only `typeof amount === 'number'` at lines 19-29. It does not reject zero, negative, fractional, NaN, infinite, oversized, wrong-currency, or invoice-unmatched values.
- **Payment/workspace ownership is absent.** A caller holding the shared secret can name an arbitrary workspace UUID. `resolveWorkspaceByPaymentId` and payment-to-workspace persistence are absent.
- **Credit table compatibility is absent.** `src/lib/credits.ts:2-4,63-99` imports `credits` and `creditTransactions.organization_id`, but generated SQL creates no `credits` table and uses `credit_transactions.tenant_id`, `transaction_type`, and `reference_id` at `database/drizzle/0002_soft_jimmy_woo.sql:1-17`.
- **Balance consumption is not safe in `SubscriptionService`.** It decrements at `:109-116`, checks for a negative result, then compensates at `:122-129`. A conditional `WHERE balance >= amount RETURNING` is required instead. The ledger insert at `:134-141` is another statement.
- **Allocation has a uniqueness race.** `tenant_quotas.tenant_id` is not unique and `allocateCredits()` updates then inserts at `:155-177`.
- **Ledger immutability is absent.** There are no database triggers, privileges, or checks preventing update/delete of credit history.
- **Refunds are not modeled.** There is no provider refund event or signed reversal policy.
- **No payment tests exist.** `tests/features/billing/subscription.test.ts:5-19` tests plan constants and explicitly leaves real DB atomic checks to a future live connection. No webhook replay test was found.

The production-ready chain should be `verified provider event -> unique event record -> payment record -> organization FK -> conditional balance update -> immutable ledger row -> processed event`, all in one real database transaction after raw-body signature verification.

# Transaction & Concurrency Findings

| Workflow | Current sequence | Race or failure mode | Required atomic boundary |
|---|---|---|---|
| Login failure | Read user, verify Argon2 outside transaction, increment, then possibly lock in a second update | Success reset can race failure increment/lock; threshold update is separate and lacks a version/CAS predicate | Recheck account under row lock or version, then perform one conditional state transition; issue session only after membership read in same committed auth transaction |
| Verification consumption | Generate token after registration; no persistence or consumer | Token cannot be verified or atomically consumed | Persist token hash; `UPDATE ... WHERE used_at IS NULL AND expires_at > now()` and set user verified in one transaction |
| Password reset | Read user, generate UUID, send link, discard token | Link is unusable; timing/mail path differs for existing vs missing user | Persist hash/expiry; atomically consume and update password/session version; send after commit |
| Session creation/revocation | Sign full user/role/workspace into cookie; logout deletes cookie | Copied cookies remain valid; role/membership changes are not observed | Server-side session row or session-version check; logout revokes server state |
| Invitation acceptance | Read pending invitation, check expiry/email, insert member, update invitation | Two acceptors can both read pending; unique conflict can leave invitation pending or partial | One transaction with `SELECT ... FOR UPDATE`, email/expiry check, unique membership insert, invitation status update |
| Payment webhook | Verify shared secret, parse payload, call credit helper | Replays and concurrent deliveries duplicate credit | Unique provider event insert and payment/ledger update in one transaction; duplicate event returns prior result |
| Credit consumption | Decrement, inspect negative, compensate, insert ledger | Temporary negative balance and failure window between statements | `UPDATE ... WHERE balance >= amount RETURNING` plus ledger insert in same transaction |
| Credit allocation | Update quota; if no row, insert; insert ledger | Concurrent initialization creates duplicate quota rows or duplicate allocations | Unique tenant quota row plus upsert and ledger idempotency key in one transaction |
| API quota | Read used tokens, compare, update | Concurrent requests oversubscribe quota at `src/features/public-api/services/api-quota-service.ts:19-41` | Conditional update with remaining capacity and `RETURNING`, or row lock |
| Graph edge upsert | Lookup case-insensitively, then insert/update | Concurrent identical edges duplicate because canonical KG table has no unique edge constraint | Tenant-scoped unique edge constraint and `INSERT ... ON CONFLICT` |
| Audit charge/job | Check credits and deduct in separate Inngest steps; audit/event are separate | Retries can charge twice; DB commit and event send can diverge; pending audit can be orphaned | Outbox insert with audit; unique `(audit_id, charge_type)` charge row; state/version CAS on retries |
| Tenant context | `BEGIN`, `set_config`, work, commit; mixed repositories and pools | Queries can use a different client or fall back to memory; system context behavior depends on role | One transaction/client abstraction, fail-closed repositories, explicit privileged scheduler path |
| Crawl lease | `FOR UPDATE SKIP LOCKED`, lease version, heartbeat, owner/version completion in legacy SQL | Strongest design, but dead migration path and separate pool | Bring the lease design into the canonical stream and test under independent connections |

`PostgresClient.begin/commit/rollback()` is not a PostgreSQL transaction. It only queues in-memory operations at `src/features/admin/infrastructure/persistence/postgres/index.ts:117-167`. `UnitOfWork` calls that abstraction at `src/features/admin/infrastructure/persistence/uow.ts:32-43`, while handlers construct repositories without passing the UoW at `src/features/admin/application/handlers.ts:50-58`. This is a second, independent transaction defect.

# Performance Findings

No production execution plans, cardinality statistics, latency measurements, or pgvector benchmarks were available. The following are static findings only:

- Vector search uses the cosine distance operator and tenant predicate at `src/services/knowledge-graph/vector-store.ts:76-99`, but the active Drizzle chain does not create the HNSW index. The only HNSW DDL is dead legacy `database/migrations/0001_optimus_vector_kg.sql:14-18`.
- `LOWER(name) = LOWER($1)` graph lookup at `src/services/knowledge-graph/graph-store.ts:71-75` has only a plain `name` index in `database/schema/index.ts:1066-1077`; a functional lower-case index or normalized-name column is missing.
- Graph edge dedup filters source, target, and case-insensitive relationship type but has separate indexes and no canonical uniqueness constraint.
- Many tenant tables have a single tenant index but common access paths also filter status, schedule time, soft-delete state, or parent ID. Query plans are required before adding composite indexes.
- `brand_mentions` lacks a source-level observation index even though reads commonly group by observation; several child FK indexes differ between generated and legacy variants.
- Quota/subscription tenant indexes are non-unique, which is both a correctness and performance problem.
- Unique constraints often have redundant ordinary indexes, including roles, feature flags, system configuration, admin emails, and API key prefixes.
- Vector length is enforced only by PostgreSQL `vector(768)` if the real SQL executes. The vector service and mocks do not validate dimensions before returning success.

# Operational / Deployment Findings

## Migration execution

`db:migrate` is explicit and does not run during build or startup, which matches the intended architecture, but `.circleci/config.yml:5-70` does not call it or provide a PostgreSQL service. The deploy command is a placeholder. There is no checked-in release step that proves migrations run before application code is promoted.

The migration runner uses `DATABASE_URL`, not `MIGRATION_DATABASE_URL`, and creates a pool with max one. There is no repository evidence of backup verification, advisory migration locking, `lock_timeout`, `statement_timeout`, rollback scripts, or restore rehearsal. Drizzle transaction behavior is not tested here.

## Unsafe fallbacks

- `drizzle.config.ts:8` defaults to local PostgreSQL.
- `ConfigManager` defaults to `postgresql://localhost:5432/aeo_saas` at `src/core/config/index.ts:19-25`.
- `PostgresClient` uses the same local fallback at `src/features/admin/infrastructure/persistence/postgres/index.ts:52-60`.
- Many repositories catch DB errors and mutate process-local maps.
- `src/lib/email.ts:85-94` reports mocked email success when `RESEND_API_KEY` is missing and logs full HTML.
- Several API and AI routes return hard-coded or synthetic outputs after database failure.

A missing production `DATABASE_URL` must fail closed in every runtime adapter, not only in the migration CLI.

## Database push

The push guard is the strongest operational control in the snapshot. It requires `NODE_ENV=development|test`, rejects production markers and production-like URL substrings, requires `ALLOW_DB_PUSH=true`, requires `DISPOSABLE_DB=true`, and checks the catalog is empty at `scripts/database/db-push-guard.ts:35-151`. Its tests use mocked clients at `tests/scripts/database/db-push-guard.test.ts:22-205`; the real cloud/role behavior is not tested. `db:push` is not a deployment migration strategy.

## Destructive and rollback behavior

`database/migrations/0017_website_monitoring_v2.sql:1-5` is explicitly destructive and uses `CASCADE`. No down migrations or database restore procedure is checked in. This makes migration failure and rollback an operational OPEN QUESTION, not a solved property.

# Database Testing Findings

The snapshot contains 74 `*.test.ts` files, 14,017 test lines, and six `run-all.ts` runners. `package.json` exposes only `test:acquisition`; there is no package-wide test command.

| Area | What exists | What it proves | What it does not prove |
|---|---|---|---|
| Migration and push guard | `tests/scripts/database/db-push-guard.test.ts` | Guard branch logic using mocked catalog clients | Real database URL safety, role behavior, migration replay, schema parity |
| Admin persistence | `tests/features/admin/infrastructure/postgres-integration.test.ts` | Static repository map behavior | PostgreSQL SQL, FK, RLS, rollback, isolation |
| Auth | `tests/features/admin/security/auth.test.ts`, `tests/services/auth/session.test.ts` | HMAC, cookie, mocked failure increments, mocked RBAC | Real users schema, session revocation, role freshness, row locks, RLS |
| Graph/vector/ingestion | `tests/services/knowledge-graph/graph-store.test.ts`, `tests/services/ingestion/document-ingestion.test.ts`, `tests/services/rag/query-service.test.ts` | Application control flow against `Pool.prototype.query` interceptors and arrays | PostgreSQL vector type/index, RLS, FK, uniqueness, concurrency |
| Workspace | `tests/services/workspace/workspace.test.ts` | No live DB execution; the file explicitly says its SQL mock was removed | Any SQL/RLS semantics |
| Acquisition | `tests/features/acquisition/integration/run-all.ts` | Candidate for real Pool/transaction/lease checks when `DATABASE_URL` exists | Default CI coverage; migration chain; all other domains |
| Billing | `tests/features/billing/subscription.test.ts` | Plan constants and domain behavior | Webhook replay, credit balance/ledger atomicity, duplicate quota rows |
| Public API | `tests/features/public-api/public-api.test.ts` | Some mocked API-key logic | Real `api_keys` migration, RLS, header bypass, constant-time verification |
| CI | `.circleci/config.yml:5-70` | Build and eval job definitions | Database migration/test execution |

The test suite was not executed in this audit because the checkout has no `node_modules` and `npx` was unavailable. No test result should be inferred from the repository's prior task reports.

# Schema.ai-Inspired Knowledge Architecture Evaluation

## Concept coverage

| Concept | Current repository evidence | Assessment |
|---|---|---|
| Entity | `entities` and `kg_entities`, plus domain entity types | Present twice with incompatible semantics and storage. Consolidate before extending. |
| Entity edge | `entity_relationships` and `kg_relationships` | Present twice; endpoint tenant equality and canonical uniqueness are missing. |
| Source | `citation_sources`, source URLs/domains, competitor/source references | Partial and domain-specific; no universal source identity. |
| Source snapshot | `crawl_snapshots` and monitoring snapshots | Present for crawl monitoring; not a universal source version. |
| Evidence | `position_observations.evidence_excerpt`, citation excerpts, embedding chunks, JSON evidence fields | Embedded and inconsistent; no immutable evidence object or universal evidence relation. |
| Claim | No `claims` table, model, or service found | Missing as a first-class fact unit. |
| Provenance | JSONB provenance and `source_chunk_id` in relationship properties | Partial, untyped, no normalized derivation chain. |
| Scope | `organization_id`/`tenant_id` and RLS | Strong tenant boundary in intent; no reusable product scope or applicability model. |
| Applicability | Some domain fields and status/target columns | No canonical scope-of-validity semantics. |
| Freshness | `created_at`, `updated_at`, `observed_at`, `captured_at`, `first_seen_at`, `last_seen_at` | Timestamp-level only; no freshness policy or stale-state semantics. |
| Confidence | Numeric and categorical fields across entities, observations, citations, competitors, and findings | Present but overloaded and not calibrated against evidence. |
| Verification status | Email verification is incomplete; no generic claim verification | Missing for knowledge objects. |
| Historical evolution | Versions and soft deletes on some tables | No `valid_from`, `valid_to`, `superseded_by`, `retracted_at`, or versioned claim events. |
| Assert/retract/supersede | No event model; some status fields only | Missing. |

## Required conceptual chain

The repository can support this chain after repair:

`Source -> Source Snapshot -> Evidence -> Claim -> Entity -> Relationship -> Scope/Version -> Retrieval -> AI Interpretation`

The current system collapses several arrows. Raw source statements, extracted evidence, model-generated interpretations, recommendations, and operational findings are stored in overlapping JSON and text fields. That creates a risk that an unsupported AI output becomes an authoritative fact.

The future relational model should preserve at least these distinctions:

- source content and source snapshot are immutable observations;
- evidence points to a snapshot, content hash, excerpt/span, and observed time;
- claims are normalized propositions with assertion origin, confidence, verification state, and scope;
- claim evidence is explicit and many-to-many;
- entity relationships distinguish observed source claims from inferred/model-generated edges;
- AI interpretations and recommendations are outputs, not authoritative claims, unless a verified evidence policy promotes them;
- `no evidence found` is an explicit retrieval outcome and must not be represented as `fact is false`.

## Temporal and open-world semantics

Only add temporal fields where product behavior requires historical answerability, competitive change tracking, or source evolution. The likely minimum is `observed_at` on evidence and claim observations, followed by optional `valid_from`, `valid_to`, `superseded_by`, and `retracted_at` for claims that can change over time. Do not add temporal complexity merely because the domain is graph-shaped.

Open-world semantics matter for AI visibility, brand intelligence, competitive intelligence, SEO, entity discovery, and source analysis. Current routes that return hard-coded or fallback metrics, such as `src/app/api/v1/analytics/summary/route.ts:16-66` and `src/app/api/v1/audit/aeo-insight/route.ts:109-115`, do not preserve the difference between no evidence and a negative fact.

# PostgreSQL vs Graph Database Assessment

**Decision: PRESERVE PostgreSQL. DEFER a native graph database.**

The repository's actual graph implementation is PostgreSQL tables plus JSONB and bounded direct SQL in `src/services/knowledge-graph/graph-store.ts` and `src/services/knowledge-graph/vector-store.ts`. No Neo4j, Gremlin, Cypher, graph driver, graph migration, or graph-specific production adapter exists. Current relationships are tenant-scoped, transactional, and coupled to RLS and credit/job workflows. A second database would duplicate tenant boundaries, credentials, migrations, consistency, and operational recovery before query evidence justifies it.

PostgreSQL is sufficient for the next knowledge layer because:

- current graph queries are entity lookup, edge lookup, vector similarity, joins, and bounded service-level traversal;
- PostgreSQL already stores JSONB, vectors, timestamps, RLS policies, FKs, and transactional ledgers;
- the product requires strong financial/auth/tenant consistency more than unbounded graph traversal;
- no production cardinality or query-plan evidence shows deep traversal as the bottleneck;
- a relational knowledge model can add claims/evidence/provenance while preserving the existing system of record.

Reconsider a graph projection only after measured workloads demonstrate deep, high-fanout multi-hop queries that PostgreSQL cannot meet with indexes/materialized projections, and only with an explicit synchronization and provenance contract. Do not introduce a graph database in the foundation repair.

# Target Database Architecture

| Component | Classification | Target decision |
|---|---|---|
| PostgreSQL | PRESERVE | Remains the system of record. |
| Drizzle ORM | PRESERVE | Keep the ORM and PostgreSQL dialect. |
| `database/schema/index.ts` | REPAIR | Make one effective source, remove duplicate exports/definitions, and eliminate stale competing source files from the generation path. |
| `database/schema/organization.ts` | REPAIR | Reconcile UUID/text identity, auth columns, roles, invitation lifecycle, and constraints. |
| `database/schema/index.ts.tmp2` | DEPRECATE | Retain only as forensic evidence until the canonical source is proven; it must not remain a candidate schema. |
| `database/schema/*.ts` TableDefinition modules | DEPRECATE or REPAIR | Either make them the actual imported source or retire the embedded SQL metadata. Do not maintain a second schema authority. |
| `database/drizzle` | REPAIR/MIGRATE | Preserve history, but repair the executable path through an evidence-based branch-specific plan. Do not blindly rewrite applied history. |
| `database/migrations` | DEPRECATE as runtime | Retain as historical evidence until catalog reconciliation proves whether any deployment used it. Do not execute both streams. |
| `src/core/database/migrator.ts` | REPAIR | Use an explicitly selected migration URL and enforce catalog/journal preconditions. |
| `TenantContextManager` and `AsyncLocalStorage` | PRESERVE/REPAIR | Keep the mechanism, require one client/transaction abstraction, and fail closed on missing context. |
| `PostgresClient` fake transaction queue | DEPRECATE | Replace with real transaction client behavior or remove from transactional paths. |
| RLS | REPAIR | Apply to every tenant-owned object, FORCE where intended, define role boundaries, and test SELECT/INSERT/UPDATE/DELETE under the actual application role. |
| Parent tenant enforcement | INTRODUCE | Composite tenant-plus-ID FKs or equivalent database enforcement for cross-tenant parent relationships. |
| Signed stateless auth cookie | MIGRATE/REPAIR | Prefer an opaque DB-backed session with revocation and version checks; do not treat embedded role/workspace as authoritative. |
| `auth_locks` | INTRODUCE or REPAIR | Implement the normalized-email/trusted-source/IP failure-window policy in actual DDL, or fold it into a correctly locked users state machine. |
| `api_keys` | REPAIR/MIGRATE | One canonical table, service-principal/creator ownership, tenant-safe lookup, constant-time verification, revocation/expiration, audit. |
| `credits` source-only model | DEPRECATE | Use one canonical balance model, preferably tenant quota/account plus immutable ledger, then migrate `src/lib/credits.ts`. |
| `tenant_quotas` and `credit_transactions` | REPAIR | Add uniqueness, amount/immutability/idempotency rules, and align every consumer to one column vocabulary. |
| Payment event/payment/invoice records | INTRODUCE | Required for provider event identity, ownership, settlement, refunds, and auditability. |
| Current AI/SEO schemas | REPAIR/MIGRATE | Pick one column model and update repositories or schema together; do not keep legacy raw SQL fallbacks. |
| Evidence-grounded knowledge layer | INTRODUCE later | Add relational claims/evidence/provenance after migration and tenant foundations are proven. |
| Native graph database | DEFER | No repository evidence requires it now. |

# Migration Strategy

The strategy must be branch-specific because the deployed database state is unknown.

1. **Inventory the real target first.** On a disposable clone and every environment that can be inspected, capture `information_schema`, `pg_class`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_roles`, `current_user`, `session_user`, `rolbypassrls`, and `public.__drizzle_migrations`. Do not run repair SQL before this capture.
2. **Classify the installed state.** Determine whether the target contains Drizzle 0000-0003, a failed/partial 0004, the legacy 0001-0019 stream, a manually reconciled hybrid, or another state. The archive cannot answer this.
3. **Prove the canonical source on an empty database.** After source consolidation, generate SQL in a scratch branch and inspect every diff. Reject any underscore-stripping rename, unexpected drop, broad cascade, or missing object. Then replay from zero and record the catalog.
4. **Existing database path.** If production has applied migrations, preserve the journal rows and use forward repair migrations from the actual installed state. Do not edit or delete an applied migration merely to make the local snapshot look clean.
5. **Unapplied/broken 0004 path.** If 0004 has never successfully applied anywhere, decide in a controlled migration policy whether it can be repaired before first deployment or whether a new validated baseline/chain is required. This decision cannot be made safely without the journal/catalog evidence.
6. **Legacy path.** If any environment used `database/migrations`, treat it as a separate installed lineage. Reconcile its tables and data before any Drizzle migration. Never run both directories blindly.
7. **Forward data migrations.** For type changes such as text-to-UUID users or old-to-v2 monitoring, add compatibility columns/backfill/validation/dual-read only when actual data requires it. Use explicit cutover and rollback checkpoints. Do not use `DROP ... CASCADE` for production data conversion.
8. **Deployment order.** Apply additive schema and compatibility objects, deploy code that can read both states if required, backfill and validate, switch writes, then remove deprecated columns only after an observed retention window. Run migrations explicitly before application promotion, never during build or startup.
9. **Proof gates.** Every phase requires clean replay, idempotent second run, catalog diff against the source, RLS matrix tests under the application role, concurrency tests with independent connections, and rollback/restore evidence.

# Dependency-Ordered Implementation Plan

This is a plan only. No task below was executed in this audit.

### DB-001: Capture installed database and migration truth

**Objective:** Establish the actual deployed catalog, role, RLS, and migration-journal state before selecting a repair path.

**Dependency:** None.

**Exact files:** `src/core/database/migrator.ts`, `drizzle.config.ts`, `database/drizzle/meta/_journal.json`, `database/drizzle/meta/*.json`, `database/drizzle/*.sql`, `database/migrations/*.sql`.

**Database objects:** `public.__drizzle_migrations`, all public tables, columns, constraints, indexes, policies, roles, extensions.

**Required implementation:** Read-only catalog capture against disposable/staging/production-approved targets; record `DATABASE_URL` versus `MIGRATION_DATABASE_URL` ownership and migration lineage.

**Security implications:** Prevents applying a repair to the wrong lineage or using a runtime role with `BYPASSRLS`.

**Tests:** Catalog snapshot comparison, role/RLS probes, empty database baseline.

**Acceptance criteria:** Every environment is classified as Drizzle, legacy, hybrid, or unknown; no SQL repair starts while unknown.

**Rollback considerations:** Read-only; none.

**Risk:** BLOCKER if skipped.

### DB-002: Consolidate one canonical schema source

**Objective:** Make one generation input authoritative and remove competing definitions from the generation graph.

**Dependency:** DB-001.

**Exact files:** `database/schema/index.ts`, `database/schema/organization.ts`, `database/schema/api-keys.ts`, `database/schema/audits.ts`, `database/schema/credits.ts`, `database/schema/credit-transactions.ts`, `database/schema/index.ts.tmp2`, all imported `database/schema/*.ts` modules.

**Database objects:** All 71 effective source table names, especially identity, billing, monitoring, AEO, citations, and graph objects.

**Required implementation:** Choose UUID versus text identity, one tenant key vocabulary, one `credit_transactions` definition, one monitoring model, one AEO/intelligence model, and one policy helper. Remove stale duplicate exports and stop generating from embedded unimported SQL metadata.

**Security implications:** Prevents code from compiling against a schema that cannot be migrated and removes ambiguous tenant columns.

**Tests:** Drizzle schema import/typecheck, table-name and column manifest comparison, generated SQL diff review.

**Acceptance criteria:** One source manifest exists; no duplicate table declarations; every runtime-imported table appears exactly once.

**Rollback considerations:** Keep the old source files untouched until the manifest and generated SQL are reviewed; revert only the source branch, not production data.

**Risk:** BLOCKER.

### DB-003: Repair the migration chain without blind history rewriting

**Objective:** Make clean replay and existing-database forward repair possible.

**Dependency:** DB-001 and DB-002.

**Exact files:** `database/drizzle/0004_rls_isolation.sql`, `database/drizzle/meta/0004_snapshot.json`, `database/drizzle/0005_unauthenticated_rate_limits.sql`, `database/drizzle/meta/0005_snapshot.json`, `src/core/database/migrator.ts`.

**Database objects:** RLS policies, `automated_recommendations`, malformed underscore-stripped objects, crawl policy casts, monitoring v1/v2 objects, `__drizzle_migrations`.

**Required implementation:** Use the installed-state decision from DB-001. If 0004 is unapplied, repair or supersede it only through a reviewed migration policy; if applied, preserve its journal identity and add forward corrections. Add missing table DDL before policy DDL and correct text tenant predicates.

**Security implications:** Avoids production drift, accidental table drops, and broken RLS policy types.

**Tests:** Empty replay, second replay, migration failure injection, snapshot/SQL semantic diff, catalog checksum.

**Acceptance criteria:** A zero-state replay reaches the final intended schema; an existing target can advance without destructive history rewrite; no unexplained rename/drop appears.

**Rollback considerations:** Required backup/restore rehearsal and per-migration restore point before execution.

**Risk:** BLOCKER.

### DB-004: Repair referential integrity and lifecycle constraints

**Objective:** Eliminate orphanable and cross-tenant parent relationships.

**Dependency:** DB-003.

**Exact files:** `database/schema/index.ts`, `database/schema/organization.ts`, `database/schema/entity.ts`, `database/schema/kg.ts`, relevant repository SQL in `src/features/ai-intelligence/repositories/index.ts`, `src/services/knowledge-graph/graph-store.ts`.

**Database objects:** Composite tenant-plus-ID parent keys/FKs, relationship uniqueness, role/status checks, quota uniqueness, soft-delete lifecycle constraints.

**Required implementation:** Backfill and validate parent tenant equality, add composite FKs or equivalent triggers, add unique edge keys, role/status checks, nonnegative counter checks, one-quota/one-current-subscription constraints, and explicit cascade/restrict policy.

**Security implications:** Closes known-ID cross-tenant association paths and prevents invalid financial/security states.

**Tests:** Cross-tenant parent insert/update/delete, orphan insert, duplicate edge, last-admin deletion, cascade/soft-delete integration tests.

**Acceptance criteria:** Every tenant-owned child cannot reference a parent from another tenant; all required invariants fail at the database boundary.

**Rollback considerations:** Backfill violations must be quarantined and corrected before constraint validation; use `NOT VALID` then validate only when the migration policy allows it.

**Risk:** CRITICAL.

### DB-005: Make RLS and tenant context enforceable

**Objective:** Prove and enforce tenant isolation for SELECT, INSERT, UPDATE, and DELETE under the real application role.

**Dependency:** DB-004.

**Exact files:** `database/schema/index.ts`, `database/schema/organization.ts`, `src/core/database/tenant-context/index.ts`, `src/features/admin/infrastructure/persistence/postgres/index.ts`, `database/drizzle` forward migration.

**Database objects:** RLS/FORCE flags, policies, application role grants, system/admin procedures, tenant context setting.

**Required implementation:** Define non-bypass application role, explicit privileged migration role, system-operation path, complete tenant table registry, exact text/UUID predicates, and parent-tenant enforcement. Remove lexical guard reliance for security decisions.

**Security implications:** This is the tenancy security boundary.

**Tests:** Real PostgreSQL with independent roles and connections for all four operations, unset context, wrong tenant, known-ID parent attempts, system operations, connection return/reset, and `rolbypassrls` assertions.

**Acceptance criteria:** Cross-tenant reads and writes fail under the application role; system jobs use an explicit audited path; no unknown role bypass remains.

**Rollback considerations:** Keep old policies until new policies pass in staging; policy rollback must not open unrestricted access.

**Risk:** BLOCKER.

### DB-006: Repair authentication persistence and session revocation

**Objective:** Make the entire auth lifecycle durable and race-safe.

**Dependency:** DB-005.

**Exact files:** `database/schema/organization.ts`, `src/app/actions/auth.ts`, `src/services/auth/session.ts`, `src/services/auth/authorization.ts`, `src/app/[locale]/verify-email/page.tsx`, `src/app/[locale]/forgot-password/page.tsx`, new reset/verification route or action files, `src/lib/email.ts`.

**Database objects:** `users`, `auth_locks` or locked user state, `sessions`, verification-token records, password-reset-token records, session-version/revocation columns, normalized-email index.

**Required implementation:** Fail closed on missing production `SESSION_SECRET`; use opaque session IDs or server-side revocation/version checks; persist only token hashes with expiry/use state; implement atomic verification/reset consumption; implement exact 0-2/3/4/5/6+ policy and IP/email failure window; normalize all identity emails; send mail after commit through an outbox or fail-closed provider.

**Security implications:** Prevents account takeover, token replay, enumeration, stale-role access, and secret instability.

**Tests:** Real DB registration rollback, verification single-use, reset single-use/expiry, concurrent login failures, valid/invalid interleaving, logout replay, role/deactivation invalidation, secret rotation, email enumeration timing.

**Acceptance criteria:** No auth operation references a missing column/table; all token consumption is one atomic update; copied sessions become invalid after revocation.

**Rollback considerations:** Additive token/session tables first; preserve existing sessions only through an explicit migration policy; do not silently invalidate production users without a planned cutover.

**Risk:** BLOCKER.

### DB-007: Repair API credential and identity boundaries

**Objective:** Ensure every tenant-sensitive API route resolves identity from verified session/API credentials, never caller headers.

**Dependency:** DB-005 and DB-006.

**Exact files:** `src/services/auth/authorization.ts`, `src/features/public-api/services/api-service.ts`, `src/features/public-api/repositories/api-key-repository.ts`, `database/schema/api-keys.ts`, all routes matching `x-tenant-id`/`x-user-id`, `src/features/public-api/services/api-quota-service.ts`.

**Database objects:** Canonical `api_keys`, creator/service principal FK, tenant-safe lookup, revocation/expiry, quota counters and conditional update.

**Required implementation:** Route all protected endpoints through the central authorization boundary; remove default/demo header identities; use constant-time hash comparison and prefix collision retry; define system lookup via a controlled role/procedure; make quota consumption conditional and durable.

**Security implications:** Directly closes the current caller-controlled tenant boundary.

**Tests:** Forged header tests against every route, session/API-key matrix, revoked/expired keys, cross-tenant key lookup, prefix collision, concurrent quota consumption.

**Acceptance criteria:** A client cannot select tenant or user identity by headers; all protected routes fail closed without verified credentials.

**Rollback considerations:** Feature-flag route cutover only if old clients need migration; never keep an insecure fallback on production paths.

**Risk:** CRITICAL.

### DB-008: Consolidate payment, subscription, and credit accounting

**Objective:** Establish one financial system of record with provider-event idempotency and immutable ledger history.

**Dependency:** DB-004, DB-005, DB-006.

**Exact files:** `src/app/api/webhooks/payment/route.ts`, `src/lib/credits.ts`, `src/features/billing/services/subscription-service.ts`, `database/schema/credits.ts`, `database/schema/credit-transactions.ts`, `database/schema/index.ts`, new payment schema module.

**Database objects:** `payment_events`, `payments`, `invoices` if product requires them, one tenant credit account/quota row, immutable `credit_transactions` ledger, provider/event uniqueness keys.

**Required implementation:** Verify raw-body provider signature before parsing; insert unique provider event; resolve payment ownership from persisted payment; validate amount/currency/status; conditionally update balance; append ledger; mark event processed; handle refunds/reversals and retries in one transaction. Deprecate source-only `credits` after data migration.

**Security implications:** Prevents duplicate credit issuance, cross-tenant crediting, negative balances, and financial audit gaps.

**Tests:** Signature/replay/concurrency/invalid amount/refund/ledger failure/retry/cross-tenant/payment ownership tests with independent PostgreSQL connections.

**Acceptance criteria:** Reprocessing the same provider event never changes balance twice; every balance change has one immutable ledger row and valid source.

**Rollback considerations:** Introduce event recording and dual reconciliation before switching webhook writes; preserve provider payload hashes and a replay-safe recovery path.

**Risk:** BLOCKER.

### DB-009: Unify real transaction and client abstractions

**Objective:** Make every multi-step database operation use a real PostgreSQL transaction and the same leased client.

**Dependency:** DB-005.

**Exact files:** `src/features/admin/infrastructure/persistence/postgres/index.ts`, `src/features/admin/infrastructure/persistence/uow.ts`, `src/features/admin/application/handlers.ts`, `src/core/database/tenant-context/index.ts`, background worker/repository constructors.

**Database objects:** No new domain objects; transaction/session settings and optional savepoints.

**Required implementation:** Remove the in-memory transaction queue from durable paths; pass active transaction clients into repositories; use real `BEGIN/COMMIT/ROLLBACK` or Drizzle transaction callbacks; prohibit nested untracked `BEGIN`; make DB errors fail closed instead of returning empty rows or memory state.

**Security implications:** Prevents partial membership, payment, credit, and tenant-context state transitions.

**Tests:** SQL command tracing, injected failures after each mutation, nested context/savepoint, pool release/reset, independent connection isolation.

**Acceptance criteria:** Rollback removes every mutation in the unit; no repository writes to a different client or memory fallback in production mode.

**Rollback considerations:** Run adapter compatibility behind a controlled flag only in non-production; no mixed transaction models in production.

**Risk:** CRITICAL.

### DB-010: Migrate application repositories to the chosen schema contract

**Objective:** Remove legacy raw SQL shapes and make create/read/update/delete paths match the canonical schema.

**Dependency:** DB-002, DB-003, DB-004, DB-009.

**Exact files:** `src/features/ai-intelligence/repositories/index.ts`, `src/features/knowledge-graph/graph-store.ts`, `src/services/knowledge-graph/vector-store.ts`, monitoring repositories, acquisition repositories, billing/auth repositories.

**Database objects:** AEO, FAQ, KG alignment, AI audit, prompt, diagnostic, historical metric, monitoring, graph, and vector tables.

**Required implementation:** Update raw SQL column names and `ON CONFLICT` targets to the canonical manifest; remove catches that hide schema failures; map soft-delete/version semantics consistently.

**Security implications:** Prevents missing-column failures from becoming false successful writes or cross-tenant memory reads.

**Tests:** Contract tests generated from the schema manifest, SQL integration tests for every repository method, no-fallback assertion in production mode.

**Acceptance criteria:** Every referenced table/column/constraint exists in the selected migration state; repository error behavior is explicit.

**Rollback considerations:** Migrate one domain at a time with compatibility views/columns only where actual installed data requires them.

**Risk:** CRITICAL.

### DB-011: Build a real PostgreSQL integration and failure matrix

**Objective:** Convert database claims from mocks into executable evidence.

**Dependency:** DB-003 through DB-010 as relevant.

**Exact files:** `tests/features/acquisition/integration/run-all.ts`, `tests/core/database/tenant-context.test.ts`, `tests/features/admin/infrastructure/postgres-integration.test.ts`, new tests under `tests/integration/database/`, package scripts, `.circleci/config.yml`.

**Database objects:** Full selected schema, roles, policies, extensions, constraints, indexes.

**Required implementation:** Disposable Postgres service with pgvector; clean migration replay; second replay; FK/RLS/role probes; auth/payment/ledger/concurrency/rollback tests; CI wiring.

**Security implications:** Proves the actual boundary instead of a hand-built simulation.

**Tests:** The task is the test harness; require independent pools/barriers and explicit coverage receipts.

**Acceptance criteria:** CI fails on migration drift, missing constraints, RLS leakage, duplicate event/ledger rows, or silent fallback.

**Rollback considerations:** Ephemeral database only; no production mutation.

**Risk:** BLOCKER if absent.

### DB-012: Repair deployment and operational controls

**Objective:** Make migration execution explicit, isolated, observable, and recoverable.

**Dependency:** DB-003 and DB-011.

**Exact files:** `src/core/database/migrator.ts`, `drizzle.config.ts`, `.env.example`, `src/core/config/index.ts`, `src/features/admin/infrastructure/persistence/postgres/index.ts`, `package.json`, `.circleci/config.yml`, `scripts/database/db-push-guard.ts`.

**Database objects:** Migration tracking table, deployment role, runtime role, backup/restore checkpoints.

**Required implementation:** Use `MIGRATION_DATABASE_URL` for migration-only operations, require `DATABASE_URL` in every production runtime adapter, remove local fallback in production, add migration preflight/lock/timeout/backup/restore checks, run migrations before app promotion, keep `db:push` disposable-only.

**Security implications:** Prevents accidental production schema mutation and runtime connection to a local or unintended database.

**Tests:** CI dry run, environment matrix, migration failure/timeout, restore rehearsal, no-build/no-start migration assertions.

**Acceptance criteria:** A production-like deployment cannot start with missing DB URL or missing migration step; runtime and migration roles are distinct.

**Rollback considerations:** Every production migration has a restore point and documented forward rollback strategy.

**Risk:** HIGH.

### DB-013: Validate performance and deletion policy

**Objective:** Fix only measured performance gaps and make lifecycle behavior intentional.

**Dependency:** DB-004, DB-011.

**Exact files:** `database/schema/index.ts`, vector/KG services, monitoring/acquisition repositories, deletion services, new explain/benchmark tests.

**Database objects:** HNSW/tenant indexes, functional normalized-name index, composite query indexes, retention/cascade constraints.

**Required implementation:** Capture `EXPLAIN (ANALYZE, BUFFERS)` on representative tenant cardinalities; add HNSW and functional indexes if plans require them; choose soft-delete versus hard-delete/retention per domain.

**Security implications:** Index choices must preserve tenant predicates; deletion choices must not erase evidence or financial history unexpectedly.

**Tests:** Plan regression, vector dimension/index use, tenant-filter performance, cascade/retention tests.

**Acceptance criteria:** Every new index has a query/plan justification; deletion semantics are documented and tested.

**Rollback considerations:** Concurrent index creation and reversible retention flags where supported.

**Risk:** MEDIUM.

### DB-014: Introduce the evidence-grounded knowledge layer after foundation stability

**Objective:** Add claims/evidence/provenance without replacing PostgreSQL or making AI output authoritative by default.

**Dependency:** DB-002, DB-004, DB-005, DB-010, DB-011, DB-013.

**Exact files:** canonical schema module, new knowledge repositories/services, `src/services/knowledge-graph/*`, citation/source/observation repositories, generated forward migration.

**Database objects:** Reuse/consolidate entities and sources where possible; introduce source snapshots, immutable evidence, claims, claim-evidence links, claim versions/events, scope/applicability fields, and interpretation records only where product requirements justify them.

**Required implementation:** Enforce evidence links for factual claims, preserve source snapshot content/hash, separate extracted claims from model interpretations, represent `no_evidence_found`, and support assert/retract/supersede events only where required.

**Security implications:** Knowledge objects inherit tenant composite integrity and RLS; AI outputs must not cross tenant or become facts without provenance.

**Tests:** Evidence lineage, claim versioning, contradiction/open-world semantics, tenant isolation, retrieval citations, unsupported-output rejection.

**Acceptance criteria:** Every authoritative claim is traceable to source/evidence or explicitly marked inferred/unknown; PostgreSQL remains the system of record.

**Rollback considerations:** Additive tables and feature flag; existing intelligence remains readable until the new layer is validated.

**Risk:** HIGH, but intentionally deferred until foundation is stable.

# Risk Register

| Risk | Severity | Evidence | Impact | Mitigation | Dependencies | Residual risk |
|---|---|---|---|---|---|---|
| Clean migration replay fails at 0004 | BLOCKER | `database/drizzle/0004_rls_isolation.sql:591-603`; no prior `automated_recommendations` DDL | Fresh environments cannot reach intended schema | DB-001 through DB-003; branch-specific repair | Actual deployed journal/catalog | Medium until replay is proven |
| Snapshot/SQL semantic divergence | BLOCKER | `meta/0004_snapshot.json` versus 0004 SQL | Future generation may drop/rename real objects | Canonical manifest and generated SQL review | DB-002, DB-003 | Low after checksums and replay |
| Runtime queries target absent/mismatched columns | BLOCKER | `auth.ts:217`; `credits.ts:63-99`; AI repository `:689-705` | Registration, billing, AEO writes fail or fall back to memory | DB-002, DB-010, live contract tests | Data migration state | Medium during cutover |
| Payment replay can mint credits | BLOCKER | `route.ts:4-48`; no event table | Financial loss and ledger corruption | DB-008 unique provider event/payment/ledger transaction | Provider payload mapping | Low after provider replay tests |
| Caller-controlled tenant/user headers | CRITICAL | `src/app/api/v1/ai/chunk/route.ts:27-35`; `aeo-insight/route.ts:13-43` | Cross-tenant access or actions | DB-007 central authorization and route sweep | Client migration | Medium for undocumented clients |
| RLS state/role bypass unverified | CRITICAL | 0004 broken; no role/BYPASSRLS DDL | Tenant boundary may fail in production | DB-001 and DB-005 real-role tests | Managed DB owner privileges | Medium until role catalog captured |
| Auth verification/reset/session persistence missing | CRITICAL | `auth.ts:166-244`; no token/session tables | Accounts cannot verify/reset; copied sessions remain valid | DB-006 | Email/provider cutover | Medium during session migration |
| Production runtime can fall back to local DB/memory | CRITICAL | `ConfigManager:19-25`; `PostgresClient:199-214`; repository fallbacks | False success, data loss, tenant state divergence | DB-009 and DB-012 fail-closed behavior | Undiscovered fallback paths | Medium until route sweep complete |
| Fake transaction adapter | CRITICAL | `PostgresClient:117-167`; `uow.ts:32-43` | Partial writes despite rollback claims | DB-009 and failure injection tests | Repository wiring | Low after adapter removal |
| Parent tenant not enforced in FKs | HIGH | `database/schema/index.ts:269-286`; generated FKs `0000:897-912` | Known-ID cross-tenant associations | DB-004 composite FK/trigger repair | Existing data cleanup | Medium for legacy rows |
| Destructive legacy monitoring migration | HIGH | `database/migrations/0017_website_monitoring_v2.sql:1-5` | Data loss if executed against populated DB | Never run blindly; backup and staged forward migration | DB-001, DB-003 | Low after catalog-specific plan |
| Email fallback logs verification/reset links | HIGH | `src/lib/email.ts:85-94,120-151` | Token exposure and false delivery success | DB-006 remove mock in production | Mail provider readiness | Low after fail-closed provider checks |
| No real DB regression suite in CI | HIGH | 74 tests, mocked integrations, `.circleci/config.yml:5-70` | Security claims remain unverified | DB-011 | CI database provisioning | Medium until continuously run |
| Credit/quota duplicate rows and negative balances | HIGH | `subscription-service.ts:109-185`; nonunique tenant indexes | Incorrect entitlement and financial state | DB-004 and DB-008 | Data cleanup | Low after unique/conditional writes |
| Missing active vector/graph indexes | MEDIUM | HNSW only in dead legacy migration; graph lower lookup | Cost/latency and degraded retrieval quality | DB-013 measured indexes | Workload scale | Medium until plans exist |
| Knowledge layer collapses no-evidence into fallback facts | HIGH | `analytics/summary/route.ts:16-66`; `aeo-insight/route.ts:109-115` | Unsupported AI conclusions appear authoritative | DB-014 provenance/open-world model | Product semantics | Medium until adoption |

# Deferred Work

- Native graph database or dual-write graph projection. Current evidence does not justify it.
- Deep temporal claim machinery beyond observed-at and evidence versioning until product requirements require historical validity, supersession, or retraction.
- Broad product/frontend refactors unrelated to database contract repair.
- Performance tuning without representative `EXPLAIN` plans and cardinalities.
- Deleting legacy migration files or stale schema modules before deployed lineage is proven.
- Data retention policy finalization for evidence, embeddings, snapshots, and graph edges until legal/product requirements are confirmed.
- Admin RBAC redesign beyond database enforcement of the current role contract.

# Open Questions

1. What exact database schema and `public.__drizzle_migrations` rows exist in each environment?
2. Has any environment successfully applied Drizzle 0004, and if so how did `automated_recommendations` exist before line 591?
3. Has any environment applied `database/migrations/0001-0019`, and which data tables are populated from that lineage?
4. What is the canonical upstream commit for the supplied archive? The archive has no Git metadata and its root says `oxenn.ir-main` while the request says `exonn.ir`.
5. What PostgreSQL role does the app use? Is it table owner, superuser, or `BYPASSRLS`? What role executes migration SQL and SECURITY DEFINER functions?
6. Do users currently contain text IDs or UUID IDs, and what rows depend on either type?
7. Do any existing monitoring rows need preservation across the v1/v2 transition, and can they be backfilled rather than dropped?
8. Are there live payments, invoices, provider events, or credit balances outside the repository schema that must be reconciled before introducing payment tables?
9. Which API routes are externally reachable without the central `authorizeApiRequest()` boundary, and which clients depend on demo/default headers?
10. What are the retention/legal requirements for audit logs, source snapshots, evidence, embeddings, claims, and ledger history?
11. What provider-specific signature, event ID, refund, currency, and settlement rules must the payment model implement?
12. What query depths, edge counts, vector cardinalities, and latency targets would justify a graph projection or additional indexes?
13. Is the intended customer role model the hard-coded hierarchy in `authorization.ts`, or should `roles`/`permissions` become the actual customer RBAC authority?
14. Is the intended credit unit an integer count, a monetary minor unit, or another documented unit? What are refund and expiration semantics?

# Final Evidence & Confidence Assessment

## Coverage completed

- Actual supplied repository snapshot inspected read-only.
- All files under `database/schema/` inspected, including the monolithic entry point, re-exported modules, stale duplicate, and embedded metadata modules.
- All six generated Drizzle SQL files inspected.
- All six generated snapshots and `_journal.json` inspected.
- All 19 legacy SQL migrations inspected.
- Migration runner, Drizzle config, package scripts, CI, DB push guard, runtime DB adapters, tenant context, background jobs, and crawl worker inspected.
- Authentication, sessions, verification/reset flows, API credentials, tenant actions, payment webhook, credits, billing, AI/SEO repositories, vector/graph services, and representative API routes inspected.
- All 74 test files were inventoried; representative database, auth, RLS, graph, vector, billing, and acquisition tests were inspected.
- No repository modifications, migration creation, snapshot edits, dependency changes, database writes, `db:push`, reset, or destructive commands were performed.

## Confidence

- **High confidence:** repository-local facts about migration contents, snapshot metadata, source declarations, raw SQL, route behavior, fallbacks, and test structure.
- **High confidence:** `0004` is the first provable generated SQL/snapshot artifact divergence and a clean Drizzle-only replay is blocked by the missing `automated_recommendations` table.
- **Medium confidence:** the process-level cause of the divergence, inferred from duplicate schema sources, underscore-stripped metadata, and local patch artifacts without Git history.
- **Low confidence:** the deployed database schema, applied migration lineage, role privileges, `BYPASSRLS`, live cross-tenant behavior, and production data impact. These require the catalog and concurrency probes in DB-001 and DB-011.

## Final quality gate

| Requirement | Result |
|---|---|
| Actual repository inspected | PASS for supplied archive snapshot; exact upstream commit remains open |
| Complete schema inspected | PASS, including source modules and SQL variants |
| Entire migration chain inspected | PASS for generated and legacy directories |
| Journal and snapshots inspected | PASS |
| First divergence identified | PASS: generated artifact divergence at 0004; source contract drift separately identified |
| Application/database contracts traced | PASS for critical auth, tenancy, API, billing, graph, monitoring, crawl, and AI paths |
| RLS policies inspected | PASS statically; live role behavior open |
| Database role/RLS bypass behavior inspected | Static absence of role DDL confirmed; deployed behavior open |
| Authentication persistence inspected | PASS; verification/reset/session gaps confirmed |
| Payment/credit persistence inspected | PASS; no durable payment/idempotency model confirmed |
| Concurrency inspected | PASS statically; live interleavings remain open |
| Database tests inspected | PASS; real versus mock coverage distinguished |
| Deployment behavior inspected | PASS; CI/migration/fallback/rollback gaps confirmed |
| PostgreSQL suitability evaluated | PASS: preserve PostgreSQL |
| Knowledge-layer architecture evaluated | PASS: relational extension on PostgreSQL, graph deferred |
| Repository or database modified | PASS: none |
| Migration/snapshot/journal created or modified | PASS: none |

**Final decision:** repair the migration/schema/tenant/auth/financial foundation first. Do not introduce a graph database or evidence layer on top of the current unresolved state.
