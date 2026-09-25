import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  pgPolicy,
  index
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

export const tenantQuotas = pgTable("tenant_quotas", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  maxUsers: integer("max_users").notNull(),
  maxBrands: integer("max_brands").notNull(),
  maxPrompts: integer("max_prompts").notNull(),
  maxObservationsPerMonth: integer("max_observations_per_month").notNull(),
  maxCrawlJobsPerDay: integer("max_crawl_jobs_per_day").notNull(),
  monthlyTokenLimit: integer("monthly_token_limit").notNull(),
  monthlyCostLimitUsd: integer("monthly_cost_limit_usd").notNull(),
  usedObservationsThisMonth: integer("used_observations_this_month").notNull().default(0),
  usedTokensThisMonth: integer("used_tokens_this_month").notNull().default(0),
  usedCrawlJobsToday: integer("used_crawl_jobs_today").notNull().default(0),
  creditsBalance: integer("credits_balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_tenant_quotas_org").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: uuid("id").primaryKey().default(defaultUuid),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  billingCycle: text("billing_cycle").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  priceAmount: integer("price_amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(defaultNow),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(defaultNow),
}, (table) => [
  index("idx_tenant_subscriptions_org").on(table.organizationId),
  ...tenantPolicy("organization_id")
]);
