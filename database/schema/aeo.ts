import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
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

export const aeoAnalyses = pgTable("aeo_analyses", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  targetKeyword: text("target_keyword").notNull(),
  overallAeoScore: integer("overall_aeo_score").notNull(),
  answerabilityScore: integer("answerability_score").notNull(),
  entityCoverageScore: integer("entity_coverage_score").notNull(),
  semanticCoverageScore: integer("semantic_coverage_score").notNull(),
  questionCoverageScore: integer("question_coverage_score").notNull(),
  citationReadinessScore: integer("citation_readiness_score").notNull(),
  structuredAnswerQualityScore: integer("structured_answer_quality_score").notNull(),
  analysisDetails: jsonb("analysis_details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_aeo_analyses_org").on(table.organizationId),
  index("idx_aeo_analyses_url").on(table.url),
  ...tenantPolicy("organization_id")
]);

export const faqOpportunities = pgTable("faq_opportunities", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  aeoAnalysisId: uuid("aeo_analysis_id").notNull().references(() => aeoAnalyses.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  userIntent: text("user_intent").notNull().default("Informational"),
  opportunityScore: integer("opportunity_score").notNull().default(50),
  suggestedAnswer: text("suggested_answer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_faq_opps_org").on(table.organizationId),
  index("idx_faq_opps_analysis").on(table.aeoAnalysisId),
  ...tenantPolicy("organization_id")
]);

export const kgAlignments = pgTable("kg_alignments", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  aeoAnalysisId: uuid("aeo_analysis_id").notNull().references(() => aeoAnalyses.id, { onDelete: "cascade" }),
  entityName: text("entity_name").notNull(),
  entityType: text("entity_type").notNull(),
  wikidataId: text("wikidata_id"),
  alignmentStatus: text("alignment_status").notNull().default("unmapped"),
  confidence: doublePrecision("confidence").notNull().default(0.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_kg_alignments_org").on(table.organizationId),
  index("idx_kg_alignments_analysis").on(table.aeoAnalysisId),
  ...tenantPolicy("organization_id")
]);

export const automatedRecommendations = pgTable("automated_recommendations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  websiteId: uuid("website_id").references(() => websites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  priorityScore: integer("priority_score").notNull(),
  status: text("status").notNull().default("pending"),
  recommendedAction: jsonb("recommended_action").notNull().default({}),
  dedupKey: text("dedup_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_automated_recs_org").on(table.organizationId),
  index("idx_automated_recs_status").on(table.status),
  index("idx_automated_recs_score").on(table.priorityScore),
  uniqueIndex("idx_automated_recs_dedup").on(table.organizationId, table.dedupKey).where(sql`status = 'pending'`),
  ...tenantPolicy("organization_id")
]);
