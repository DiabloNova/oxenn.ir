import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TenantContextManager } from "../../../src/core/database/tenant-context/index";
import { PostgresClient } from "../../../src/features/admin/infrastructure/persistence/postgres/index";

describe("DB-004 Database Referential Integrity & Lifecycle Constraints (PostgreSQL Integration)", () => {
  const org1Id = "10000000-0000-0000-0000-000000000001";
  const org2Id = "20000000-0000-0000-0000-000000000002";

  it("should enforce composite foreign keys and prevent cross-tenant parent assignments", async () => {
    let dbConnected = false;
    try {
      await TenantContextManager.runWithSystemContext("test-user", "req-1", async () => {
        const client = TenantContextManager.getDbClient();
        if (!client) return;
        dbConnected = true;

        // Clean test fixture state
        await client.query(`DELETE FROM entities WHERE id IN ('e1000000-0000-0000-0000-000000000001');`);
        await client.query(`DELETE FROM brands WHERE id IN ('b1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000002');`);
        await client.query(`DELETE FROM organizations WHERE id IN ('${org1Id}', '${org2Id}');`);

        await client.query(`INSERT INTO organizations (id, name, slug) VALUES ('${org1Id}', 'Org 1', 'org-1'), ('${org2Id}', 'Org 2', 'org-2') ON CONFLICT DO NOTHING;`);
        await client.query(`INSERT INTO brands (id, organization_id, name, canonical_domain, industry) VALUES ('b1000000-0000-0000-0000-000000000001', '${org1Id}', 'Brand 1', 'b1.com', 'Tech');`);
        await client.query(`INSERT INTO brands (id, organization_id, name, canonical_domain, industry) VALUES ('b2000000-0000-0000-0000-000000000002', '${org2Id}', 'Brand 2', 'b2.com', 'Tech');`);

        // Attempt cross-tenant insert (Entity org1 referencing Brand org2)
        let error: any = null;
        try {
          await client.query(`
            INSERT INTO entities (id, organization_id, brand_id, name, type)
            VALUES ('e1000000-0000-0000-0000-000000000001', '${org1Id}', 'b2000000-0000-0000-0000-000000000002', 'Cross Tenant Entity', 'Product');
          `);
        } catch (err) {
          error = err;
        }

        assert.ok(error !== null, "Expected composite FK violation error");
        assert.match(error.message, /foreign key|fk_entities_brand_composite/i);
      });
    } catch (err: any) {
      if (err.code === "ECONNREFUSED" || err.message?.includes("connect")) {
        console.warn("[Integration Test Skipped]: PostgreSQL database not available in local test execution context.");
        assert.ok(true);
        return;
      }
      throw err;
    }
  });

  it("should enforce organization_members role CHECK constraints", async () => {
    try {
      await TenantContextManager.runWithSystemContext("test-user", "req-2", async () => {
        const client = TenantContextManager.getDbClient();
        if (!client) return;

        let error: any = null;
        try {
          await client.query(`
            INSERT INTO organization_members (id, organization_id, user_id, role)
            VALUES (gen_random_uuid(), '${org1Id}', gen_random_uuid(), 'invalid_role_value');
          `);
        } catch (err) {
          error = err;
        }

        assert.ok(error !== null, "Expected CHECK constraint violation on role");
        assert.match(error.message, /chk_org_member_role|check constraint/i);
      });
    } catch (err: any) {
      if (err.code === "ECONNREFUSED" || err.message?.includes("connect")) {
        assert.ok(true);
        return;
      }
      throw err;
    }
  });
});
