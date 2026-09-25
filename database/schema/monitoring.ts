import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organization";
import { websites } from "./websites";

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

export const monitoringConfigs = pgTable("monitoring_configs", {
  id: uuid("id").default(defaultUuid).primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  schedule: text("schedule").notNull(),
  crawlUrl: text("crawl_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow)
}, (table) => [
  index("idx_monitoring_configs_org_enabled").on(table.organizationId, table.enabled),
  ...tenantPolicy("organization_id")
]);

export const crawlSnapshots = pgTable("crawl_snapshots", {
  id: uuid("id").default(defaultUuid).primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  monitoringConfigId: uuid("monitoring_config_id").notNull().references(() => monitoringConfigs.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().default(defaultNow),
  pages: jsonb("pages").notNull(),
  totalPages: integer("total_pages").notNull(),
  indexablePages: integer("indexable_pages").notNull(),
  nonIndexablePages: integer("non_indexable_pages").notNull(),
  error4xxCount: integer("error_4xx_count").notNull(),
  error5xxCount: integer("error_5xx_count").notNull(),
  robotsTxtAvailable: boolean("robots_txt_available").notNull(),
  sitemapAvailable: boolean("sitemap_available").notNull()
}, (table) => [
  index("idx_crawl_snapshots_config_captured").on(table.monitoringConfigId, table.capturedAt),
  ...tenantPolicy("organization_id")
]);

export const monitoringAlerts = pgTable("monitoring_alerts", {
  id: uuid("id").default(defaultUuid).primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  monitoringConfigId: uuid("monitoring_config_id").notNull().references(() => monitoringConfigs.id, { onDelete: "cascade" }),
  snapshotId: uuid("snapshot_id").notNull().references(() => crawlSnapshots.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  type: text("type").notNull(),
  fingerprint: text("fingerprint").notNull(),
  url: text("url"),
  message: text("message").notNull(),
  previousValue: jsonb("previous_value"),
  currentValue: jsonb("current_value"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
}, (table) => [
  index("idx_monitoring_alerts_config_status").on(table.monitoringConfigId, table.status),
  index("idx_monitoring_alerts_fingerprint_status").on(table.fingerprint, table.status),
  uniqueIndex("idx_monitoring_alerts_open_fingerprint").on(table.fingerprint).where(sql`status = 'open'`),
  ...tenantPolicy("organization_id")
]);
