import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  check,
  pgPolicy
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organization";
import { brands } from "./brands";
import { competitors } from "./websites";

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

export const aiProviderConfigs = pgTable("ai_provider_configs", {
  id: uuid("id").primaryKey().default(defaultUuid),
  providerName: text("provider_name").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  apiKeyMasked: text("api_key_masked").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  failoverProviderId: uuid("failover_provider_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_ai_provider_configs_active").on(table.isActive),
]);

export const aiEngines = pgTable("ai_engines", {
  id: uuid("id").primaryKey().default(defaultUuid),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  version: text("version").notNull(),
  capabilities: text("capabilities").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  versionNum: integer("version_num").notNull().default(1),
});

export const prompts = pgTable("prompts", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  queryText: text("query_text").notNull(),
  category: text("category").notNull(),
  buyingIntent: text("buying_intent").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_prompts_organization").on(table.organizationId),
  index("idx_prompts_brand").on(table.brandId),
  ...tenantPolicy("organization_id")
]);

export const promptDefinitions = pgTable("prompt_definitions", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  category: text("category").notNull(),
  intent: text("intent").notNull(),
  locale: text("locale").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  variables: jsonb("variables").notNull(),
  competitors: text("competitors").array().notNull(),
  tags: text("tags").array().notNull(),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  optVersion: integer("opt_version").notNull().default(1),
}, (table) => [
  index("idx_prompt_definitions_tenant").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const promptSchedules = pgTable("prompt_schedules", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  promptId: uuid("prompt_id").notNull().references(() => promptDefinitions.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  cronExpression: text("cron_expression").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  nextExecutionAt: timestamp("next_execution_at", { withTimezone: true }),
  lastExecutionAt: timestamp("last_execution_at", { withTimezone: true }),
  status: text("status").notNull().default("IDLE"),
  failureReason: text("failure_reason"),
  scheduleVersion: integer("schedule_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_prompt_schedules_tenant").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const promptExecutions = pgTable("prompt_executions", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  promptId: uuid("prompt_id").notNull().references(() => promptDefinitions.id, { onDelete: "cascade" }),
  promptVersion: integer("prompt_version").notNull(),
  resolvedPromptText: text("resolved_prompt_text").notNull(),
  variablesValues: jsonb("variables_values").notNull(),
  status: text("status").notNull().default("queued"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  modelVersion: text("model_version"),
  responseText: text("response_text"),
  latencyMs: integer("latency_ms"),
  errorMessage: text("error_message"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_prompt_executions_tenant").on(table.organizationId),
  index("idx_prompt_executions_status").on(table.status),
  check("prompt_executions_status_check", sql`status IN ('queued', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled')`),
  ...tenantPolicy("organization_id")
]);

export const positionObservations = pgTable("position_observations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceExecutionId: uuid("source_execution_id").notNull().references(() => promptExecutions.id, { onDelete: "cascade" }),
  subjectEntityId: text("subject_entity_id").notNull(),
  presence: text("presence").notNull(),
  numericPosition: integer("numeric_position"),
  evidenceExcerpt: text("evidence_excerpt").notNull(),
  evidenceStructure: text("evidence_structure").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  analyzerVersion: text("analyzer_version").notNull().default("1.0.0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_position_obs_tenant").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const aiObservations = pgTable("ai_observations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  promptId: uuid("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  engineId: uuid("engine_id").notNull().references(() => aiEngines.id, { onDelete: "cascade" }),
  rawResponseText: text("raw_response_text").notNull(),
  parsedSentiment: text("parsed_sentiment").notNull(),
  positionRank: integer("position_rank"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull().default(defaultNow),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_ai_observations_organization").on(table.organizationId),
  index("idx_ai_observations_prompt").on(table.promptId),
  index("idx_ai_observations_engine").on(table.engineId),
  ...tenantPolicy("organization_id")
]);

export const competitorMentions = pgTable("competitor_mentions", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  observationId: uuid("observation_id").notNull().references(() => aiObservations.id, { onDelete: "cascade" }),
  competitorId: uuid("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  mentionContext: text("mention_context").notNull(),
  isRecommended: boolean("is_recommended").notNull().default(false),
  sentimentScore: doublePrecision("sentiment_score").notNull().default(0.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_competitor_mentions_organization").on(table.organizationId),
  index("idx_competitor_mentions_observation").on(table.observationId),
  index("idx_competitor_mentions_competitor").on(table.competitorId),
  ...tenantPolicy("organization_id")
]);

export const brandMentions = pgTable("brand_mentions", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  observationId: uuid("observation_id").notNull().references(() => aiObservations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  mentionContext: text("mention_context").notNull(),
  isRecommended: boolean("is_recommended").notNull().default(false),
  sentimentScore: doublePrecision("sentiment_score").notNull().default(0.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_brand_mentions_organization").on(table.organizationId),
  index("idx_brand_mentions_brand").on(table.brandId),
  ...tenantPolicy("organization_id")
]);

export const citations = pgTable("citations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  observationId: uuid("observation_id").notNull().references(() => aiObservations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  anchorText: text("anchor_text"),
  citationOrder: integer("citation_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_citations_organization").on(table.organizationId),
  index("idx_citations_observation").on(table.observationId),
  index("idx_citations_domain").on(table.domain),
  ...tenantPolicy("organization_id")
]);

export const citationSources = pgTable("citation_sources", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  publisherName: text("publisher_name"),
  publisherCategory: text("publisher_category").notNull().default("General"),
  authorityScore: integer("authority_score").notNull().default(50),
  isVerifiedDomain: boolean("is_verified_domain").notNull().default(false),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_citation_sources_tenant").on(table.organizationId),
  uniqueIndex("idx_citation_sources_url_org").on(table.organizationId, table.url),
  ...tenantPolicy("organization_id")
]);

export const citationOccurrences = pgTable("citation_occurrences", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => citationSources.id, { onDelete: "cascade" }),
  engineId: text("engine_id").notNull(),
  promptText: text("prompt_text").notNull(),
  citationPosition: integer("citation_position").notNull().default(1),
  excerptText: text("excerpt_text"),
  sentimentScore: doublePrecision("sentiment_score").notNull().default(0.0),
  isBrandMentioned: boolean("is_brand_mentioned").notNull().default(false),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().default(defaultNow),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_citation_occurrences_tenant").on(table.organizationId),
  index("idx_citation_occurrences_source").on(table.sourceId),
  ...tenantPolicy("organization_id")
]);

export const visibilityScores = pgTable("visibility_scores", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  engineId: uuid("engine_id").notNull().references(() => aiEngines.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(),
  presenceRate: doublePrecision("presence_rate").notNull(),
  avgPosition: doublePrecision("avg_position"),
  netSentiment: doublePrecision("net_sentiment").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().default(defaultNow),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_visibility_scores_organization").on(table.organizationId),
  index("idx_visibility_scores_brand").on(table.brandId),
  ...tenantPolicy("organization_id")
]);

export const recommendations = pgTable("recommendations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  impactScore: integer("impact_score").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actionPlan: jsonb("action_plan").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_recommendations_organization").on(table.organizationId),
  index("idx_recommendations_brand").on(table.brandId),
  ...tenantPolicy("organization_id")
]);

export const brandAssociations = pgTable("brand_associations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  attributeName: text("attribute_name").notNull(),
  associationScore: doublePrecision("association_score").notNull().default(0.0),
  mentionCount: integer("mention_count").notNull().default(0),
  sampleExcerpts: text("sample_excerpts").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_brand_associations_tenant").on(table.organizationId),
  index("idx_brand_associations_brand").on(table.brandId),
  ...tenantPolicy("organization_id")
]);

export const recommendationObservations = pgTable("recommendation_observations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  recommendedAction: text("recommended_action").notNull(),
  engineId: text("engine_id").notNull(),
  frequency: integer("frequency").notNull().default(1),
  confidenceScore: doublePrecision("confidence_score").notNull().default(0.0),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_recommendation_obs_tenant").on(table.organizationId),
  index("idx_recommendation_obs_brand").on(table.brandId),
  ...tenantPolicy("organization_id")
]);
