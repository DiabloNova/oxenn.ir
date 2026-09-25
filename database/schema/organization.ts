import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
  pgPolicy
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { apiKeys } from "./api-keys";

const defaultUuid = sql`gen_random_uuid()`;
const defaultNow = sql`NOW()`;

function tenantPolicy(colName: "id" | "organization_id" | "tenant_id" = "organization_id") {
  const isId = colName === "id";
  const policyPrefix = isId ? "org" : colName;
  return [
    pgPolicy(`select_${policyPrefix}_isolation_policy`, {
      for: "select",
      using: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    }),
    pgPolicy(`insert_${policyPrefix}_isolation_policy`, {
      for: "insert",
      withCheck: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    }),
    pgPolicy(`update_${policyPrefix}_isolation_policy`, {
      for: "update",
      using: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`,
      withCheck: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    }),
    pgPolicy(`delete_${policyPrefix}_isolation_policy`, {
      for: "delete",
      using: sql`${sql.identifier(colName)} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`
    })
  ];
}

// ----------------------------------------------------------------------
// Users
// ----------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(defaultUuid),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  passwordResetRequired: boolean("password_reset_required").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  challengeRequired: integer("challenge_required").notNull().default(0),
  trustedIps: text("trusted_ips").array(),
  lastLoginIp: text("last_login_ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
}));

// ----------------------------------------------------------------------
// Auth Locks
// ----------------------------------------------------------------------
export const authLocks = pgTable("auth_locks", {
  id: uuid("id").primaryKey().default(defaultUuid),
  normalizedEmail: text("normalized_email").notNull(),
  trustedSourceIp: text("trusted_source_ip").notNull(),
  failureCount: integer("failure_count").notNull().default(0),
  lockExpiration: timestamp("lock_expiration", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("idx_auth_locks_email_ip").on(table.normalizedEmail, table.trustedSourceIp)
]);

// ----------------------------------------------------------------------
// Organizations (Workspaces / Tenants)
// ----------------------------------------------------------------------
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
  createdBy: text("created_by").notNull().default("system"),
  updatedBy: text("updated_by").notNull().default("system"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
}, (table) => [
  uniqueIndex("idx_organizations_slug").on(table.slug).where(sql`deleted_at IS NULL`),
  ...tenantPolicy("id")
]);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
  apiKeys: many(apiKeys),
}));

// ----------------------------------------------------------------------
// Organization Members
// ----------------------------------------------------------------------
export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // super_admin, workspace_admin, viewer
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("idx_org_members_user_org").on(table.organizationId, table.userId),
  index("idx_org_members_user_id").on(table.userId),
  ...tenantPolicy("organization_id")
]);

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

// ----------------------------------------------------------------------
// Organization Invitations
// ----------------------------------------------------------------------
export const organizationInvitations = pgTable("organization_invitations", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired, revoked
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  uniqueIndex("idx_org_invitations_org_email").on(table.organizationId, table.email).where(sql`status = 'pending'`),
  index("idx_org_invitations_token").on(table.tokenHash),
  ...tenantPolicy("organization_id")
]);

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvitations.organizationId],
    references: [organizations.id],
  }),
}));
