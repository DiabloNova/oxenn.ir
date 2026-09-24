import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  AnyPgColumn,
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

export const websites = pgTable("websites", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  status: text("status").notNull().default("active"),
  cmsType: text("cms_type"),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
  lastAnalyzedAt: timestamp("last_analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_websites_organization").on(table.organizationId),
  uniqueIndex("idx_websites_domain_org").on(table.organizationId, table.domain).where(sql`deleted_at IS NULL`),
  ...tenantPolicy("organization_id")
]);

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").notNull().references(() => websites.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  path: text("path").notNull(),
  title: text("title"),
  metaDescription: text("meta_description"),
  httpStatus: integer("http_status").notNull().default(200),
  contentType: text("content_type"),
  contentHash: text("content_hash"),
  wordCount: integer("word_count").notNull().default(0),
  canonicalUrl: text("canonical_url"),
  robotsDirectives: text("robots_directives").array().notNull().default(sql`'{}'::text[]`),
  inlinkCount: integer("inlink_count").notNull().default(0),
  outlinkCount: integer("outlink_count").notNull().default(0),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_pages_organization").on(table.organizationId),
  index("idx_pages_website").on(table.websiteId),
  uniqueIndex("idx_pages_url_org").on(table.organizationId, table.normalizedUrl).where(sql`deleted_at IS NULL`),
  ...tenantPolicy("organization_id")
]);

export const keywords = pgTable("keywords", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  normalizedTerm: text("normalized_term").notNull(),
  language: text("language").notNull().default("en"),
  intent: text("intent"),
  searchVolume: integer("search_volume"),
  cpc: doublePrecision("cpc"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_keywords_organization").on(table.organizationId),
  uniqueIndex("idx_keywords_term_org").on(table.organizationId, table.normalizedTerm).where(sql`deleted_at IS NULL`),
  ...tenantPolicy("organization_id")
]);

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  language: text("language").notNull().default("en"),
  parentTopicId: uuid("parent_topic_id").references((): AnyPgColumn => topics.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_topics_organization").on(table.organizationId),
  uniqueIndex("idx_topics_name_org").on(table.organizationId, table.name).where(sql`deleted_at IS NULL`),
  ...tenantPolicy("organization_id")
]);

export const competitors = pgTable("competitors", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  isDirect: boolean("is_direct").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_competitors_organization").on(table.organizationId),
  uniqueIndex("idx_competitors_domain_org").on(table.organizationId, table.domain).where(sql`deleted_at IS NULL`),
  ...tenantPolicy("organization_id")
]);

export const historicalMetrics = pgTable("historical_metrics", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  metricName: text("metric_name").notNull(),
  metricValue: doublePrecision("metric_value").notNull(),
  dimensions: jsonb("dimensions").notNull().default({}),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().default(defaultNow),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_historical_metrics_lookup").on(table.organizationId, table.entityType, table.entityId, table.metricName),
  index("idx_historical_metrics_time").on(table.recordedAt),
  ...tenantPolicy("organization_id")
]);

export const pagesKeywords = pgTable("pages_keywords", {
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  keywordId: uuid("keyword_id").notNull().references(() => keywords.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  primaryKey({ columns: [table.pageId, table.keywordId] }),
  index("idx_pages_keywords_org").on(table.organizationId),
]);

export const pagesTopics = pgTable("pages_topics", {
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  score: doublePrecision("score").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  primaryKey({ columns: [table.pageId, table.topicId] }),
  index("idx_pages_topics_org").on(table.organizationId),
]);

export const pagesEntities = pgTable("pages_entities", {
  pageId: uuid("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  salience: doublePrecision("salience").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  primaryKey({ columns: [table.pageId, table.entityId] }),
  index("idx_pages_entities_org").on(table.organizationId),
]);

export const keywordsTopics = pgTable("keywords_topics", {
  keywordId: uuid("keyword_id").notNull().references(() => keywords.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  primaryKey({ columns: [table.keywordId, table.topicId] }),
  index("idx_keywords_topics_org").on(table.organizationId),
]);

export const topicsEntities = pgTable("topics_entities", {
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  primaryKey({ columns: [table.topicId, table.entityId] }),
  index("idx_topics_entities_org").on(table.organizationId),
]);
