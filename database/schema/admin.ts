import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const defaultUuid = sql`gen_random_uuid()`;
const defaultNow = sql`NOW()`;

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(defaultUuid),
  name: text("name").notNull().unique(),
  hierarchyRank: integer("hierarchy_rank").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_roles_name").on(table.name),
]);

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(defaultUuid),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionKey: text("permission_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_permissions_role_id").on(table.roleId),
]);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().default(defaultUuid),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  roleId: uuid("role_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  index("idx_admin_users_email").on(table.email),
  index("idx_admin_users_deleted_at").on(table.deletedAt).where(sql`deleted_at IS NULL`),
]);

export const auditRecords = pgTable("audit_records", {
  id: uuid("id").primaryKey().default(defaultUuid),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(defaultNow),
  actorId: text("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  payloadBefore: text("payload_before"),
  payloadAfter: text("payload_after"),
  status: text("status").notNull(),
  errorDetails: text("error_details"),
}, (table) => [
  index("idx_audit_records_actor").on(table.actorId),
  index("idx_audit_records_resource").on(table.resourceType, table.resourceId),
  index("idx_audit_records_timestamp").on(table.timestamp),
]);

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().default(defaultUuid),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  isEnabledGlobally: boolean("is_enabled_globally").notNull().default(false),
  tenantOverrides: text("tenant_overrides").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_feature_flags_key").on(table.key),
]);

export const systemConfigurations = pgTable("system_configurations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_system_configurations_key").on(table.key),
]);
