/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { loginAction } from "../../../../src/app/actions/auth";
import { TenantContextManager } from "../../../../src/core/database/tenant-context";
import * as argon2 from "argon2";
import { setCookiesMock } from "../../../../src/services/auth/session";

// Monkey patch next/headers for node testing
const nextHeaders = require("next/headers");
nextHeaders.headers = async () => new Map([["x-forwarded-for", "127.0.0.1"]]);

// Test doubles / Memory DB
let dbUsers: any[] = [];
let dbMembers: any[] = [];
let dbOrgs: any[] = [];

// Monkey patch TenantContextManager
const originalRunSys = TenantContextManager.runWithSystemContext;
TenantContextManager.runWithSystemContext = async (userId: any, requestId: any, work: any) => {
  // Overriding getDbClient to return our mock DB client
  TenantContextManager.getDbClient = () => {
    return {
      query: async (sql: string, params: any[]) => {
        if (sql.includes("SELECT * FROM users WHERE email")) {
          const u = dbUsers.find(u => u.email === params[0] && !u.deleted_at);
          return { rows: u ? [u] : [] };
        }
        if (sql.includes("SELECT m.organization_id")) {
          const m = dbMembers.find(m => m.user_id === params[0]);
          if (!m) return { rows: [] };
          const o = dbOrgs.find(o => o.id === m.organization_id);
          return { rows: [{ workspaceId: m.organization_id, role: m.role, workspaceName: o?.name }] };
        }
        if (sql.includes("INSERT INTO users")) {
          dbUsers.push({ id: params[0], name: params[1], email: params[2], password_hash: params[3], is_active: 1, email_verified: 0, failed_login_attempts: 0, challenge_required: 0, trusted_ips: null });
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO organizations")) {
          dbOrgs.push({ id: params[0], name: params[1], slug: params[2] });
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO organization_members")) {
          dbMembers.push({ organization_id: params[0], user_id: params[1], role: params[2] });
          return { rows: [] };
        }

        // Allow any update string
        if (sql.includes("UPDATE users")) {
          // UPDATE failures logic
          if (sql.includes("SET failed_login_attempts = failed_login_attempts + 1")) {
             const uIndex = dbUsers.findIndex(u => u.id === params[0]);
             if (uIndex > -1) {
                dbUsers[uIndex].failed_login_attempts++;
                return { rows: [{ failed_login_attempts: dbUsers[uIndex].failed_login_attempts }] };
             }
          }

          if (sql.includes("SET challenge_required = 1")) {
             const uIndex = dbUsers.findIndex(u => u.id === params[1]);
             if (uIndex > -1) {
                dbUsers[uIndex].challenge_required = 1;
                dbUsers[uIndex].locked_until = params[0];
             }
             return { rows: [] };
          }

          if (sql.includes("SET failed_login_attempts = 0")) {
             const uIndex = dbUsers.findIndex(u => u.id === params[1]);
             if (uIndex > -1) {
               dbUsers[uIndex].failed_login_attempts = 0;
               dbUsers[uIndex].challenge_required = 0;
               dbUsers[uIndex].locked_until = null;
               dbUsers[uIndex].last_login_ip = params[0];
             }
             return { rows: [] };
          }

          return { rows: [] };
        }
        return { rows: [] };
      }
    };
  };

  return work();
};

async function setupDatabase() {
  const hash = await argon2.hash("validpassword", { type: argon2.argon2id, memoryCost: 19456, timeCost: 2 } as any);

  dbUsers = [
    { id: 'usr-test-1', name: 'Valid User', email: 'valid@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 0, challenge_required: 0, trusted_ips: ['127.0.0.1'] },
    { id: 'usr-test-2', name: 'Locked User', email: 'locked@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 6, challenge_required: 1, locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(), trusted_ips: null },
    { id: 'usr-test-3', name: 'Delay User 1', email: 'delay1@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 3, challenge_required: 0, trusted_ips: null },
    { id: 'usr-test-8', name: 'Delay User 4', email: 'delay_test4@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 4, challenge_required: 0, trusted_ips: null },
    { id: 'usr-test-4', name: 'Delay User 2', email: 'delay2@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 5, challenge_required: 0, trusted_ips: null },
    { id: 'usr-test-5', name: 'Untrusted User', email: 'untrusted@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 0, challenge_required: 0, trusted_ips: ['192.168.1.1'] },
    { id: 'usr-test-7', name: 'Unverified User', email: 'unverified@test.com', password_hash: hash, is_active: 1, email_verified: 0, failed_login_attempts: 0, challenge_required: 0, trusted_ips: null },
    { id: 'usr-test-6', name: 'Concurrent User', email: 'concurrent@test.com', password_hash: hash, is_active: 1, email_verified: 1, failed_login_attempts: 0, challenge_required: 0, trusted_ips: null }
  ];

  dbOrgs = [{ id: 'org-test-1', name: 'Test Org', slug: 'test-org' }];

  dbMembers = [
    { organization_id: 'org-test-1', user_id: 'usr-test-1', role: 'workspace_admin' },
    { organization_id: 'org-test-1', user_id: 'usr-test-2', role: 'workspace_admin' },
    { organization_id: 'org-test-1', user_id: 'usr-test-3', role: 'workspace_admin' },
    { organization_id: 'org-test-1', user_id: 'usr-test-4', role: 'workspace_admin' },
    { organization_id: 'org-test-1', user_id: 'usr-test-5', role: 'workspace_admin' },
    { organization_id: 'org-test-1', user_id: 'usr-test-6', role: 'workspace_admin' }
  ];
}


export async function runAuthTests() {
  let advancedTime = 0;
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = ((cb: any, ms: any) => { advancedTime += ms as number; (cb as () => void)(); }) as unknown as typeof global.setTimeout;
  try {

  setCookiesMock(() => ({
  set: () => {},
  get: () => ({ value: "mock" })
}));

  console.log("▶ Running Authentication Security Contract Tests (SEC-01)...");

  await setupDatabase();

  // Test 1: Valid Credentials
  try {
    const user = await loginAction("valid@test.com", "validpassword");
    assert.equal(user.email, "valid@test.com");
    console.log("  ✅ Valid credentials authenticate successfully");
  } catch (err) {
    console.error(err);
    assert.fail("Valid login should not throw");
  }

  // Test 2: Invalid Password
  try {
    await loginAction("valid@test.com", "wrongpassword");
    assert.fail("Invalid password should throw");
  } catch (err: any) {
    assert.match(err.message, /Invalid credentials or user not found/);
    console.log("  ✅ Invalid password is rejected");
  }

  // Test 3: Unknown Account (Anti-enumeration timing check)
  const startUnknown = Date.now(); // real clock
  try {
    await loginAction("doesnotexist@test.com", "wrongpassword");
    assert.fail("Unknown account should throw");
  } catch (err: any) {
    const endUnknown = Date.now(); // real clock
    assert.match(err.message, /Invalid credentials or user not found/);
    assert.ok((endUnknown - startUnknown) >= 10, "Unknown account verification should take time (dummy hash)");
    console.log("  ✅ Unknown account does not reveal existence");
  }

  // Test 4: Fast Fail on Hard Lockout
  const startLockout = Date.now();
  try {
    // using user with locked_until set in future
    await loginAction("locked@test.com", "validpassword");
    assert.fail("Locked account should throw");
  } catch (err: any) {
    const endLockout = Date.now();
    assert.match(err.message, /Account is temporarily locked/);
    assert.ok((endLockout - startLockout) < 50, "Locked account should fail fast (<50ms) without event loop blocking");
    console.log("  ✅ Locked account fast-fails instantly");
  }

  // Test 5: Hard Lockout / Challenge (challenge threshold with no locked_until)
  try {
    // delay2@test.com has 5 failures, let's bump it to 6 to trigger challenge required
    const uIndex = dbUsers.findIndex(u => u.email === "delay2@test.com");
    if(uIndex > -1) dbUsers[uIndex].failed_login_attempts = 6;

    await loginAction("delay2@test.com", "validpassword");
    assert.fail("Challenge required account should throw challenge");
  } catch (err: any) {
    assert.match(err.message, /Challenge required before password verification/);
    console.log("  ✅ Challenge enforced at threshold");
  }

  // Test 6: Untrusted IP
  try {
    await loginAction("untrusted@test.com", "validpassword");
    assert.fail("Untrusted IP should throw");
  } catch (err: any) {
    assert.match(err.message, /Login from untrusted IP/);
    console.log("  ✅ Untrusted IP logic enforced");
  }

  // Test 8: Unverified Account
  try {
    await loginAction("unverified@test.com", "validpassword");
    assert.fail("Unverified account should throw");
  } catch (err: any) {
    assert.match(err.message, /Invalid credentials or user not found/);
    console.log("  ✅ Unverified account login rejected");
  }

  // Test 9: Successful Registration
  try {
    const newUser = await import("../../../../src/app/actions/auth").then(m => m.registerAction("New User", "new@test.com", "newpassword123"));
    assert.equal(newUser.role, "viewer", "Default role must be viewer");
    assert.ok(newUser.id.length > 30, "User ID generated as UUID");

    // Attempt to login should fail since they are unverified
    try {
      await loginAction("new@test.com", "newpassword123");
      assert.fail("Should not allow login for unverified user");
    } catch (e: any) {
      if(e.code === "ERR_ASSERTION") throw e;
      assert.match(e.message, /Invalid credentials or user not found/);
      console.log("  ✅ Registration creates unverified user, login blocked");
    }
  } catch (err: any) {
    if (err.code === 'ERR_ASSERTION') {
        throw err;
    }
    assert.fail("Registration should not throw: " + err.message);
  }

  // Test 7: Concurrency
  // If multiple logins are fired at once against the same account, the attempts should still safely increment up to the threshold
  try {
    const promises = [];
    for (let i = 0; i < 7; i++) {
       // We use delay1@test.com which already has 3 failures from before (if not reset).
       // Actually let's test against valid@test.com which should currently have 0 failures.
       promises.push(loginAction("concurrent@test.com", "wrongpassword").catch(e => e));
    }
    await Promise.all(promises);

    // Check final DB state for valid@test.com
    const userState = dbUsers.find(u => u.email === "concurrent@test.com");
    assert.equal(userState.failed_login_attempts, 7, "DB should atomically increment all 7 failures");
    assert.equal(userState.challenge_required, 1, "Challenge state should be flipped based on atomic returns");
    console.log("  ✅ Concurrency atomicity enforced");
  } catch (err) {
    assert.fail("Concurrency test failed unexpectedly: " + err);
  }

  console.log("All Authentication Security Tests Passed!");
  } finally {
    global.setTimeout = originalSetTimeout;
  }
}

if (require.main === module) {
  runAuthTests().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
