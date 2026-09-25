import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
  pgPolicy
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organization";

const defaultUuid = sql`gen_random_uuid()`;
const defaultNow = sql`NOW()`;

function tenantPolicy(colName: "organization_id" = "organization_id") {
  return [
    pgPolicy(`select_${colName}_isolation_policy`, {
      for: "select",
      using: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    }),
    pgPolicy(`insert_${colName}_isolation_policy`, {
      for: "insert",
      withCheck: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    }),
    pgPolicy(`update_${colName}_isolation_policy`, {
      for: "update",
      using: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`,
      withCheck: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    }),
    pgPolicy(`delete_${colName}_isolation_policy`, {
      for: "delete",
      using: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    })
  ];
}

export const crawlJobs = pgTable("crawl_jobs", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  requestedUrl: text("requested_url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  policy: jsonb("policy").notNull(),
  dedupKey: text("dedup_key").notNull(),
  cacheKey: text("cache_key").notNull(),
  priority: integer("priority").notNull().default(0),
  status: text("status").notNull().default("PENDING"),
  providerId: text("provider_id"),
  providerJobId: text("provider_job_id"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  workerId: text("worker_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  pageCount: integer("page_count"),
  bytesProcessed: bigint("bytes_processed", { mode: "number" }),
  cacheOutcome: text("cache_outcome"),
  error: jsonb("error"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  cancellationRequestedBy: text("cancellation_requested_by"),
  resultRef: uuid("result_ref"),
  correlationId: text("correlation_id"),
  requestId: text("request_id"),
  traceId: text("trace_id"),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_crawl_jobs_org_status").on(table.organizationId, table.status),
  index("idx_crawl_jobs_status_scheduled").on(table.status, table.scheduledFor).where(sql`status = 'QUEUED'`),
  index("idx_crawl_jobs_provider_job_id").on(table.providerJobId),
  index("idx_crawl_jobs_org_created").on(table.organizationId, table.createdAt),
  uniqueIndex("idx_crawl_jobs_active_dedup").on(table.organizationId, table.dedupKey).where(sql`status IN ('PENDING', 'QUEUED', 'RUNNING')`),
  check("crawl_jobs_status_check", sql`status IN ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED')`),
  check("crawl_jobs_attempts_check", sql`attempts >= 0`),
  check("crawl_jobs_max_attempts_check", sql`max_attempts > 0`),
  check("crawl_jobs_cache_outcome_check", sql`cache_outcome IS NULL OR cache_outcome IN ('HIT', 'MISS', 'STALE', 'BYPASS')`),
  check("crawl_jobs_version_check", sql`version > 0`),
  ...tenantPolicy("organization_id")
]);

export const crawlResults = pgTable("crawl_results", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").notNull().references(() => crawlJobs.id, { onDelete: "cascade" }),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("crawl_results_job_unique").on(table.jobId),
  uniqueIndex("crawl_results_org_job_unique").on(table.organizationId, table.jobId),
  ...tenantPolicy("organization_id")
]);

export const crawlCache = pgTable("crawl_cache", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  cacheScope: text("cache_scope").notNull().default("tenant"),
  cacheKey: text("cache_key").notNull(),
  normalizedResult: jsonb("normalized_result").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("idx_crawl_cache_key").on(table.organizationId, table.cacheScope, table.cacheKey),
  check("crawl_cache_scope_check", sql`cache_scope = 'tenant'`),
  ...tenantPolicy("organization_id")
]);
