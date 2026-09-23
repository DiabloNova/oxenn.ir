import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  captureDatabaseCatalog,
  parseRedactedTargetIdentity,
  sanitizeCredentials,
  readCanonicalJournal,
} from "../../../src/core/database/catalog-capture";

describe("DB-001: Catalog Capture and Classification Test Suite", () => {
  // 1. Test credential sanitization
  it("should sanitize passwords and connection URLs in error messages", () => {
    const rawUrl = "postgres://admin:SuperSecretPass123!@db.internal.example.com:5432/production_db?ssl=true";
    const rawError = `Connection failed to ${rawUrl} with password SuperSecretPass123!`;

    const sanitized = sanitizeCredentials(rawError, rawUrl);
    assert.strictEqual(sanitized.includes("SuperSecretPass123!"), false);
    assert.strictEqual(sanitized.includes("[REDACTED"), true);
  });

  // 2. Test parsing redacted target identity
  it("should parse host, port, database, user without leaking secrets", () => {
    const connStr = "postgres://myuser:mypassword123@pg.staging.local:5433/mydb";
    const identity = parseRedactedTargetIdentity("DATABASE_URL", connStr);

    assert.strictEqual(identity.isAvailable, true);
    assert.strictEqual(identity.host, "pg.staging.local");
    assert.strictEqual(identity.port, 5433);
    assert.strictEqual(identity.database, "mydb");
    assert.strictEqual(identity.user, "myuser");
    assert.strictEqual(identity.normalizedIdentity, "pg.staging.local:5433/mydb");
    // Ensure password is not present in identity object
    assert.strictEqual(JSON.stringify(identity).includes("mypassword123"), false);
  });

  // 3. Test reading canonical Drizzle journal
  it("should read canonical Drizzle journal entries from metadata folder", () => {
    const entries = readCanonicalJournal();
    assert.strictEqual(Array.isArray(entries), true);
    assert.ok(entries.length >= 6);
    assert.strictEqual(entries[0].tag, "0000_reflective_loa");
  });

  // 4. Test empty database classification -> 'unknown'
  it("should classify an empty database (0 public tables) as 'unknown'", async () => {
    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          return {
            rows: [
              {
                connected_user: "app_user",
                rolsuper: false,
                rolbypassrls: false,
                rolcreatedb: false,
                rolcreaterole: false,
                rolreplication: false,
              },
            ],
          };
        }
        if (text.includes("information_schema.tables")) {
          return { rows: [] }; // 0 tables
        }
        if (text.includes("pg_class")) return { rows: [] };
        if (text.includes("information_schema.columns")) return { rows: [] };
        if (text.includes("information_schema.table_constraints")) return { rows: [] };
        if (text.includes("pg_indexes")) return { rows: [] };
        if (text.includes("pg_policies")) return { rows: [] };
        if (text.includes("pg_extension")) return { rows: [] };
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://app_user:pass@localhost:5432/emptydb",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.classification, "unknown");
    assert.strictEqual(res.classificationReason.includes("Empty database"), true);
  });

  // 5. Test Drizzle-only target -> 'drizzle'
  it("should classify a database with matching Drizzle migrations and no legacy system as 'drizzle'", async () => {
    const journal = readCanonicalJournal();
    const mockDrizzleRows = journal.map((entry, i) => ({
      id: i + 1,
      hash: `hash_${entry.tag}`,
      created_at: entry.when,
    }));

    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          return {
            rows: [
              {
                connected_user: "app_user",
                rolsuper: false,
                rolbypassrls: false,
              },
            ],
          };
        }
        if (text.includes("information_schema.tables")) {
          return {
            rows: [
              { table_name: "__drizzle_migrations" },
              { table_name: "users" },
              { table_name: "organizations" },
            ],
          };
        }
        if (text.includes("__drizzle_migrations")) {
          return { rows: mockDrizzleRows };
        }
        if (text.includes("pg_class")) {
          return {
            rows: [
              { table_name: "users", row_security: true, force_row_security: false },
              { table_name: "organizations", row_security: true, force_row_security: false },
            ],
          };
        }
        if (text.includes("information_schema.columns")) {
          return {
            rows: [
              { table_name: "users", column_name: "id", data_type: "uuid", is_nullable: "NO", column_default: "gen_random_uuid()" },
            ],
          };
        }
        if (text.includes("pg_policies")) {
          return {
            rows: [
              { tablename: "organizations", policyname: "selectorgisolation_policy", cmd: "SELECT", roles: ["public"], qual: "true", with_check: null },
            ],
          };
        }
        if (text.includes("pg_extension")) {
          return { rows: [{ extname: "uuid-ossp", extversion: "1.1" }] };
        }
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://app_user:pass@localhost:5432/drizzledb",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.classification, "drizzle");
    assert.strictEqual(res.lineageReconciled, true);
    assert.strictEqual(res.drizzleMigrationRecords.length, journal.length);
    assert.strictEqual(res.legacyArtifactsDetected, false);
    assert.strictEqual(res.policies.length, 1);
  });

  // 6. Test Legacy-only target -> 'legacy'
  it("should classify a database with legacy migration tables and no Drizzle records as 'legacy'", async () => {
    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          return {
            rows: [{ connected_user: "app_user", rolsuper: false, rolbypassrls: false }],
          };
        }
        if (text.includes("information_schema.tables")) {
          return {
            rows: [
              { table_name: "schema_migrations" },
              { table_name: "legacy_users" },
            ],
          };
        }
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://app_user:pass@localhost:5432/legacydb",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.classification, "legacy");
    assert.strictEqual(res.legacyArtifactsDetected, true);
    assert.strictEqual(res.drizzleMigrationRecords.length, 0);
  });

  // 7. Test Hybrid target -> 'hybrid'
  it("should classify a database with both Drizzle and legacy migration artifacts as 'hybrid'", async () => {
    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          return { rows: [{ connected_user: "app_user", rolsuper: false, rolbypassrls: false }] };
        }
        if (text.includes("information_schema.tables")) {
          return {
            rows: [
              { table_name: "__drizzle_migrations" },
              { table_name: "schema_migrations" },
              { table_name: "hybrid_users" },
            ],
          };
        }
        if (text.includes("__drizzle_migrations")) {
          return { rows: [{ id: 1, hash: "h1", created_at: 123 }] };
        }
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://app_user:pass@localhost:5432/hybriddb",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.classification, "hybrid");
    assert.strictEqual(res.legacyArtifactsDetected, true);
    assert.ok(res.drizzleMigrationRecords.length > 0);
  });

  // 8. Test Unreconcilable / mismatched Drizzle entries -> 'unknown'
  it("should classify a target with mismatched Drizzle migration count as 'unknown'", async () => {
    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          return { rows: [{ connected_user: "app_user", rolsuper: false, rolbypassrls: false }] };
        }
        if (text.includes("information_schema.tables")) {
          return {
            rows: [
              { table_name: "__drizzle_migrations" },
              { table_name: "users" },
            ],
          };
        }
        if (text.includes("__drizzle_migrations")) {
          // Return 1 record when journal expects >= 6
          return { rows: [{ id: 1, hash: "h1", created_at: 100 }] };
        }
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://app_user:pass@localhost:5432/mismatched",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.classification, "unknown");
    assert.strictEqual(res.lineageReconciled, false);
  });

  // 9. Test BYPASSRLS / Superuser detection on runtime role
  it("should flag runtime DATABASE_URL role with BYPASSRLS as unsafe for RLS isolation", async () => {
    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          return {
            rows: [
              {
                connected_user: "admin_user",
                rolsuper: false,
                rolbypassrls: true, // BYPASSRLS flag set!
              },
            ],
          };
        }
        if (text.includes("information_schema.tables")) {
          return { rows: [{ table_name: "users" }] };
        }
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://admin_user:pass@localhost:5432/unsafe_rls_db",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.targetIdentity.bypassesRls, true);
    assert.strictEqual(res.targetIdentity.isRlsSafe, false);
    assert.ok(
      res.unknownOrInconsistencyReasons.some((r) => r.includes("SUPERUSER or BYPASSRLS privileges"))
    );
  });

  // 10. Test DATABASE_URL vs MIGRATION_DATABASE_URL probing
  it("should probe both DATABASE_URL and MIGRATION_DATABASE_URL targets and identify if distinct", async () => {
    const mockClient = (url: string) => ({
      connect: async () => {},
      query: async (text: string) => {
        if (text.includes("pg_roles")) {
          const isMig = url.includes("migration_role");
          return {
            rows: [
              {
                connected_user: isMig ? "migration_role" : "app_runtime_role",
                rolsuper: isMig,
                rolbypassrls: isMig,
              },
            ],
          };
        }
        if (text.includes("information_schema.tables")) {
          return { rows: [{ table_name: "data" }] };
        }
        return { rows: [] };
      },
      end: async () => {},
    });

    const res = await captureDatabaseCatalog({
      databaseUrl: "postgres://app_runtime_role:p1@host1.internal:5432/appdb",
      migrationDatabaseUrl: "postgres://migration_role:p2@host1.internal:5432/appdb",
      clientFactory: mockClient,
    });

    assert.strictEqual(res.targetIdentity.connectedRole, "app_runtime_role");
    assert.strictEqual(res.targetIdentity.isRlsSafe, true);
    assert.strictEqual(res.migrationTargetIdentity?.connectedRole, "migration_role");
    assert.strictEqual(res.migrationTargetIdentity?.isSuperUser, true);
    assert.strictEqual(res.areTargetsIdentical, true); // Same host and database name
  });
});
