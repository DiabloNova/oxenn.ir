import {
  pgTable,
  uuid,
  text,
  jsonb,
  customType,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
  pgPolicy
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organization";

const defaultUuid = sql`gen_random_uuid()`;
const defaultNow = sql`NOW()`;

// Custom vector type for pgvector
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(768)";
  },
});

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

export const documentEmbeddings = pgTable("document_embeddings", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  contentChunk: text("content_chunk").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  embedding: vector("embedding").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_document_embeddings_org").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const kgEntities = pgTable("kg_entities", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  properties: jsonb("properties").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("idx_kg_entities_org_id_id").on(table.organizationId, table.id),
  index("idx_kg_entities_org").on(table.organizationId),
  index("idx_kg_entities_name").on(table.name),
  ...tenantPolicy("organization_id")
]);

export const kgRelationships = pgTable("kg_relationships", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceEntityId: uuid("source_entity_id").notNull(),
  targetEntityId: uuid("target_entity_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  properties: jsonb("properties").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("idx_kg_relationships_edge_unique").on(
    table.organizationId,
    table.sourceEntityId,
    table.targetEntityId,
    table.relationshipType
  ),
  foreignKey({
    columns: [table.organizationId, table.sourceEntityId],
    foreignColumns: [kgEntities.organizationId, kgEntities.id],
    name: "fk_kg_rel_source_composite"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.organizationId, table.targetEntityId],
    foreignColumns: [kgEntities.organizationId, kgEntities.id],
    name: "fk_kg_rel_target_composite"
  }).onDelete("cascade"),
  index("idx_kg_relationships_org").on(table.organizationId),
  index("idx_kg_relationships_source").on(table.sourceEntityId),
  index("idx_kg_relationships_target").on(table.targetEntityId),
  ...tenantPolicy("organization_id")
]);
