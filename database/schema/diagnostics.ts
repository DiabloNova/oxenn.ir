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

export const diagnosticFindings = pgTable("diagnostic_findings", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  findingType: text("finding_type").notNull(),
  severity: text("severity").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  recommendation: text("recommendation").notNull(),
  impactScore: integer("impact_score").notNull().default(0),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_diagnostic_findings_org").on(table.organizationId),
  index("idx_diagnostic_findings_domain").on(table.domain),
  index("idx_diagnostic_findings_status").on(table.status),
  ...tenantPolicy("organization_id")
]);

export const diagnosticFindingRelationships = pgTable("diagnostic_finding_relationships", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  parentFindingId: uuid("parent_finding_id").notNull().references(() => diagnosticFindings.id, { onDelete: "cascade" }),
  childFindingId: uuid("child_finding_id").notNull().references(() => diagnosticFindings.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_diagnostic_rel_org").on(table.organizationId),
  index("idx_diagnostic_rel_parent").on(table.parentFindingId),
  index("idx_diagnostic_rel_child").on(table.childFindingId),
  ...tenantPolicy("organization_id")
]);
