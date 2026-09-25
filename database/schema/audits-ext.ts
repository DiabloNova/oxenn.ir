import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  index,
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

export const aiVisibilityAudits = pgTable("ai_visibility_audits", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  targetBrandName: text("target_brand_name").notNull(),
  targetDomain: text("target_domain").notNull(),
  overallScore: integer("overall_score").notNull(),
  brandAuthorityScore: integer("brand_authority_score").notNull(),
  aiSearchShareScore: integer("ai_search_share_score").notNull(),
  sentimentScore: integer("sentiment_score").notNull(),
  citationReliabilityScore: integer("citation_reliability_score").notNull(),
  recommendationShareScore: integer("recommendation_share_score").notNull(),
  dimensionsJson: jsonb("dimensions_json").notNull(),
  auditedEngineIds: text("audited_engine_ids").array().notNull(),
  auditedPromptsCount: integer("audited_prompts_count").notNull(),
  rawObservationsCount: integer("raw_observations_count").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_ai_vis_audits_org").on(table.organizationId),
  index("idx_ai_vis_audits_brand").on(table.targetBrandName),
  index("idx_ai_vis_audits_status").on(table.status),
  ...tenantPolicy("organization_id")
]);

export const auditPrompts = pgTable("audit_prompts", {
  id: uuid("id").primaryKey().default(defaultUuid),
  auditId: uuid("audit_id").notNull().references(() => aiVisibilityAudits.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  promptText: text("prompt_text").notNull(),
  category: text("category").notNull(),
  weight: doublePrecision("weight").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_audit_prompts_audit").on(table.auditId),
  index("idx_audit_prompts_org").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const premiumAudits = pgTable("premium_audits", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  score: integer("score").notNull(),
  grade: text("grade").notNull(),
  pagesAnalyzed: integer("pages_analyzed").notNull(),
  metrics: jsonb("metrics").notNull(),
  issues: jsonb("issues").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_premium_audits_organization").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const technicalAudits = pgTable("technical_audits", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  technicalScore: integer("technical_score").notNull(),
  grade: text("grade").notNull(),
  pagesAnalyzed: integer("pages_analyzed").notNull(),
  categories: jsonb("categories").notNull(),
  criticalIssues: jsonb("critical_issues").notNull(),
  quickWins: jsonb("quick_wins").notNull(),
  performanceMetrics: jsonb("performance_metrics").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(defaultNow),
}, () => [
  ...tenantPolicy("organization_id")
]);

export const competitiveAnalyses = pgTable("competitive_analyses", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userUrl: text("user_url").notNull(),
  competitorUrls: text("competitor_urls").array().notNull(),
  overallScore: integer("overall_score").notNull(),
  marketPosition: text("market_position").notNull(),
  comparisonData: jsonb("comparison_data").notNull(),
  advantages: jsonb("advantages").notNull(),
  gaps: jsonb("gaps").notNull(),
  opportunities: jsonb("opportunities").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(defaultNow),
}, () => [
  ...tenantPolicy("organization_id")
]);
