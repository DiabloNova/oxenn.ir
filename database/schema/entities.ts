import {
  pgTable,
  uuid,
  text,
  jsonb,
  doublePrecision,
  timestamp,
  integer,
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

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  description: text("description"),
  properties: jsonb("properties").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_entities_organization").on(table.organizationId),
  index("idx_entities_type").on(table.entityType),
  ...tenantPolicy("organization_id")
]);

export const entityRelationships = pgTable("entity_relationships", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceEntityId: uuid("source_entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  targetEntityId: uuid("target_entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  weight: doublePrecision("weight").notNull().default(1.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_entity_relationships_org").on(table.organizationId),
  index("idx_entity_relationships_source").on(table.sourceEntityId),
  index("idx_entity_relationships_target").on(table.targetEntityId),
  ...tenantPolicy("organization_id")
]);
