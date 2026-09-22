/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { User, Session, UserRole } from "@/types/auth";
import { createSession, invalidateSession, getSession } from "@/services/auth/session";
import { TenantContextManager } from "@/core/database/tenant-context";
import { randomUUID } from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import * as argon2 from "argon2";
import { headers } from "next/headers";

const ARGON2_OPTIONS: any = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2
};

/**
 * Generates a dummy hash using Argon2id with required parameters.
 * We cache it globally per process to ensure constant time execution without overhead.
 */
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await argon2.hash("dummy_password_for_timing", ARGON2_OPTIONS as any) as unknown as string;
  }
  return dummyHash!;
}

/**
 * Authenticates user, resolves identity/workspace strictly on the server, and establishes a secure signed session.
 */
export async function loginAction(email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!password) {
    throw new Error("Password is required");
  }

  const reqHeaders = await headers();
  // Using x-forwarded-for for testing.
  // Trusted IP checks should ideally rely on gateway headers, but we extract a base IP here.
  const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Step 1: Pre-auth data fetch. No locks held.
  let userRecord: any = null;
  await TenantContextManager.runWithSystemContext(null, "sys-login", async () => {
    const client = TenantContextManager.getDbClient();
    if (!client) throw new Error("Failed to get DB client in system context");

    // Fetch the user
    const { rows } = await client.query("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [normalizedEmail]);
    userRecord = rows[0];
  });

  if (!userRecord) {
    // Unknown account anti-enumeration: Run dummy hash, simulate a basic user delay (0 attempts = 0 delay)
    await getDummyHash();
    await argon2.verify(dummyHash!, password);
    throw new Error("Invalid credentials or user not found.");
  }

  if (userRecord.is_active === 0 || userRecord.is_active === false) {
    await getDummyHash();
    await argon2.verify(dummyHash!, password);
    throw new Error("Invalid credentials or user not found.");
  }

  if (userRecord.email_verified === 0 || userRecord.email_verified === false) {
    await getDummyHash();
    await argon2.verify(dummyHash!, password);
    throw new Error("Invalid credentials or user not found.");
  }

  // Check hard locks
  if (userRecord.locked_until && new Date(userRecord.locked_until) > new Date()) {
    throw new Error("Account is temporarily locked due to too many failed attempts. Please try again later.");
  }

  // Trusted IP check
  if (userRecord.trusted_ips && userRecord.trusted_ips.length > 0) {
    if (!userRecord.trusted_ips.includes(ip) && ip !== "unknown") {
      throw new Error("Login from untrusted IP address requires verification.");
    }
  }

  // Enforce Challenge
  if (userRecord.failed_login_attempts >= 6 || userRecord.challenge_required) {
    throw new Error("Challenge required before password verification.");
  }

  // Argon2 Verification (outside of any DB lock/transaction)
  let isValid = false;
  if (userRecord.password_hash) {
    isValid = await argon2.verify(userRecord.password_hash, password);
  } else {
    // If user exists but has no hash (e.g. legacy/SSO only), still run dummy for anti-enumeration
    await getDummyHash();
    await argon2.verify(dummyHash!, password);
  }

  // Step 2: Post-auth state update
  return await TenantContextManager.runWithSystemContext(null, "sys-login-update", async () => {
    const client = TenantContextManager.getDbClient();

    if (!isValid) {
      // True Atomic increment of failure accounting using Postgres concurrency
      const { rows } = await client.query(
        `UPDATE users
         SET failed_login_attempts = failed_login_attempts + 1
         WHERE id = $1
         RETURNING failed_login_attempts`,
        [userRecord.id]
      );

      const newFailures = rows[0]?.failed_login_attempts || 0;

      if (newFailures >= 6) {
        const lockedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await client.query(
          `UPDATE users
           SET challenge_required = 1, locked_until = $1
           WHERE id = $2`,
          [lockedUntil, userRecord.id]
        );
      }

      throw new Error("Invalid credentials or user not found.");
    }

    // Successful login: Reset failures and set last IP
    await client.query(
      "UPDATE users SET failed_login_attempts = 0, challenge_required = 0, locked_until = NULL, last_login_ip = $1 WHERE id = $2",
      [ip, userRecord.id]
    );

    // Fetch tenant membership
    const { rows: memberRows } = await client.query(`
        SELECT m.organization_id as "workspaceId", m.role, o.name as "workspaceName"
        FROM organization_members m
        JOIN organizations o ON m.organization_id = o.id
        WHERE m.user_id = $1 AND o.deleted_at IS NULL
        LIMIT 1
    `, [userRecord.id]);

    const memberRecord = memberRows[0];
    if (!memberRecord) {
        throw new Error("Invalid credentials or user not found.");
    }

    const authResult: User = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: memberRecord.role as UserRole,
        workspaceId: memberRecord.workspaceId,
    };

    await createSession(authResult);
    return authResult;
  });
}

/**
 * Requests a password reset and sends a password reset email to the user.
 */
export async function requestPasswordResetAction(email: string): Promise<void> {
  await TenantContextManager.runWithSystemContext(null, "sys-password-reset", async () => {
    const client = TenantContextManager.getDbClient();
    if (!client) {
        throw new Error("Failed to get DB client in system context");
    }

    const { rows: userRows } = await client.query("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);
    const userRecord = userRows[0];

    // Mock reset token generation
    const resetToken = randomUUID();
    const resetLink = `https://app.seorchable.com/reset-password?token=${resetToken}`;

    if (userRecord) {
      sendPasswordResetEmail(email, resetLink).catch((err) => {
        console.error("Failed to send password reset email:", err);
      });
    } else {
      // Mock constant time for anti-enumeration
      await new Promise(r => setTimeout(r, 50));
    }
  });
}

/**
 * Registers user and resolves identity/workspace strictly on the server.
 */
export async function registerAction(name: string, email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!password) {
    throw new Error("Password is required");
  }

  const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS as any) as unknown as string;

  const result = await TenantContextManager.runWithSystemContext(null, "sys-register", async () => {
    const client = TenantContextManager.getDbClient();
    if (!client) {
        throw new Error("Failed to get DB client in system context");
    }

    // Check if user exists
    const { rows: existingUser } = await client.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existingUser.length > 0) {
        throw new Error("User already exists.");
    }

    const userId = randomUUID();

    // Create User
    await client.query("INSERT INTO users (id, name, email, password_hash, is_active, email_verified, email_verified_at) VALUES ($1, $2, $3, $4, true, false, null)", [userId, name, normalizedEmail, hashedPassword]);

    // Create Organization (Workspace)
    const orgId = randomUUID();
    const orgSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomUUID().slice(0,4)}`;
    const orgName = `${name}'s Workspace`;

    await client.query("INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)", [orgId, orgName, orgSlug]);

    // Create Membership
    await client.query("INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)", [orgId, userId, "viewer"]);

    return {
        id: userId,
        name,
        email,
        role: "viewer" as UserRole,
        workspaceId: orgId,
    };
  });

  // Mock verification link generation
  const verificationToken = randomUUID();
  const verificationLink = `https://app.seorchable.com/verify-email?token=${verificationToken}`;

  sendVerificationEmail(email, name, verificationLink).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  return result;
}

/**
 * Clears secure cookies and invalidates the session on logout.
 */
export async function logoutAction() {
  await invalidateSession();
}

/**
 * Securely verifies and returns the current server-validated session state for client synchronization.
 */
export async function getServerSessionAction(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    return { user: null, expiresAt: null, status: "unauthenticated" };
  }
  return session;
}
