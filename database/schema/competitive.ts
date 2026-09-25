import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  check,
  pgPolicy
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organization";
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

export const competitorChanges = pgTable("competitor_changes", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  competitorId: uuid("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  changeType: text("change_type").notNull(),
  severity: text("severity").notNull(),
  summary: text("summary").notNull(),
  details: jsonb("details").notNull().default({}),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().default(defaultNow),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_competitor_changes_org").on(table.organizationId),
  index("idx_competitor_changes_comp").on(table.competitorId),
  index("idx_competitor_changes_type").on(table.changeType),
  ...tenantPolicy("organization_id")
]);

export const competitiveSeoFindings = pgTable("competitive_seo_findings", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  competitorId: uuid("competitor_id").references(() => competitors.id, { onDelete: "set null" }),
  findingType: text("finding_type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  recommendation: text("recommendation").notNull(),
  impactScore: integer("impact_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_comp_seo_findings_org").on(table.organizationId),
  index("idx_comp_seo_findings_comp").on(table.competitorId),
  index("idx_comp_seo_findings_type").on(table.findingType),
  check("competitive_seo_findings_finding_type_check", sql`finding_type IN (
    'technical_gap', 'content_gap', 'keyword_gap', 'topic_gap', 'structural_difference',
    'ai_visibility_gap', 'citation_gap', 'prompt_gap', 'brand_mention_gap', 'ai_recommendation_gap', 'citation_overlap'
  )`),
  ...tenantPolicy("organization_id")
]);
