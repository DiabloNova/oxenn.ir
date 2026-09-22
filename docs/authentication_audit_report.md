# Authentication Forensic Audit Report

## 1. Current Authentication Architecture

The application implements a custom authentication and session management system built heavily around PostgreSQL and Next.js server actions.

- **Identity**: Managed in the `users` table, linked to `organizations` (workspaces) via `organization_members`.
- **Sessions**: Uses stateless, cryptographically signed HTTP-only secure cookies (`seorchable_session`) initialized upon login. This cookie uses an HMAC SHA-256 signature containing the user's ID, workspace ID, and expiration.
- **Tenant Isolation**: Row-Level Security (RLS) is employed natively via PostgreSQL policies checking `app.current_tenant_id` which is injected securely via `TenantContextManager` leveraging `AsyncLocalStorage` and `pgClient.query("SET LOCAL...")`.
- **API Access**: APIs are protected via a middleware that accepts a Bearer token (API Key), checking it against the `api_keys` table and enforcing usage rate limits via an in-memory/Postgres hybrid rate limiter.

## 2. Authentication Flows and Entry Points

- **Registration (`registerAction`)**: Creates a user, hashes the password via Argon2, and provisions a new organization and membership. It currently mocks sending a verification email.
- **Login (`loginAction`)**: Looks up user by email in system context, performs basic constant-time comparisons (dummy hash on invalid user), enforces account locks, executes Argon2 verification, increments failure counts atomically, and creates the session.
- **Logout (`logoutAction`)**: Invalidates the server-side cookies.
- **Email Verification (`verify-email`)**: UI simulated. The verification route uses a `setTimeout` dummy check and does not query or mutate the backend. The backend lacks generation/validation of persistent tokens.
- **Password Reset (`requestPasswordResetAction`)**: The initial request is handled, looking up the user and sending a mocked email with an ephemeral token (`randomUUID()`), but the backend never saves this token. The actual `/reset-password` endpoint is missing entirely (404).

## 3. Database/Session/Token Model

- **Database**: Schemas exist for `users`, `organizations`, `organization_members`, and `auth_locks`.
- **Session**: Signed payload in `seorchable_session` cookie containing User identity and expiration date.
- **Tokens**: Missing completely from the schema. There are no tables or columns dedicated to storing `reset_token`, `reset_token_expires`, `verification_token`, or `email_verified_at`.

## 4. Security Findings

### F-01: Denial of Service (DoS) Vulnerability via `progressiveDelay`
- **Severity**: CRITICAL
- **File**: `src/app/actions/auth.ts`, `progressiveDelay()` / `loginAction()`
- **Evidence**: `progressiveDelay` enforces delays up to 60 minutes (`await new Promise(r => setTimeout(r, delay))`) before returning a response, keeping the connection and server action handler open.
- **Impact**: An attacker can easily exhaust the server's concurrent request limits/connection pool by firing a small number of concurrent brute force attempts, taking the entire application offline.
- **Root Cause**: Implementing application-layer request sleeping rather than relying on rate limits and fast failure responses.
- **Recommended Fix**: Remove `progressiveDelay`. Implement a fast-fail HTTP 429 response using the existing rate limiter or fail the authentication attempt immediately if `locked_until` is in the future.
- **Regression Test**: Ensure that an account with 5 failed attempts rejects the next login instantaneously instead of sleeping.

### F-02: Missing Password Reset Endpoint & Unpersisted Reset Tokens
- **Severity**: HIGH
- **File**: `src/app/actions/auth.ts` (requestPasswordResetAction) / Missing route
- **Evidence**: `requestPasswordResetAction` generates a `randomUUID()` but does not save it to the database. The route `/[locale]/reset-password` does not exist.
- **Impact**: Users cannot reset their passwords.
- **Root Cause**: Feature is partially implemented (stubbed for demo).
- **Recommended Fix**: Add `reset_token` and `reset_token_expires` to `users` schema. Implement the password reset completion endpoint to validate the token and hash the new password.
- **Regression Test**: Complete an end-to-end password reset flow and verify the token is single-use and expires properly.

### F-03: Missing Email Verification Logic & Schema Mismatch
- **Severity**: HIGH
- **File**: `src/app/actions/auth.ts`, `src/app/[locale]/verify-email/page.tsx`, `database/schema/organization.ts`
- **Evidence**: Registration hardcodes `email_verified: false` and the UI simulates success without calling an API. The `users` schema does not contain `email_verified` or `verification_token` columns, leading to potential SQL errors on registration if the schema is strictly enforced.
- **Impact**: New users cannot verify their emails. The UI lies to the user.
- **Root Cause**: Feature is partially implemented (stubbed).
- **Recommended Fix**: Add `email_verified`, `email_verified_at`, and `verification_token` columns to the `users` schema. Create a proper server action to validate the token and update the user state.
- **Regression Test**: End-to-end email verification flow where the user record in the DB changes from unverified to verified.

### F-04: Incomplete Invalidation of Legacy Cookies
- **Severity**: LOW
- **File**: `src/services/auth/session.ts` (`createSession`)
- **Evidence**: The system sets `tenant_id` and `user_id` as plain cookies for "legacy compatibility". While not trusted authoritatively, they expose user metadata without integrity checks.
- **Impact**: Minimal security impact if unused, but increases attack surface and cookie size.
- **Root Cause**: Backward compatibility.
- **Recommended Fix**: If truly unused, deprecate and remove plain cookies.
- **Regression Test**: Verify no legacy systems break when cookies are removed, or ensure they are properly documented as strictly informational.

## 5. Test Coverage Gaps

- Missing test coverage for **Account Locking**: While failures are incremented, there is no test verifying that an account actually locks out and rejects valid passwords until `locked_until` expires.
- Missing test coverage for **Registration Boundary**: Verifying that a new workspace and member row is correctly bound in the same transaction.
- **INSUFFICIENT_EVIDENCE**: No tests exist for email verification or password reset, as the features themselves are unimplemented.

## 6. Target Architecture

The target architecture must retain the current strong boundaries (stateless signed sessions, strictly decoupled RLS tenant boundaries) while fully implementing the missing identity lifecycle features:
1. **Schema Alignment**: The database must support persistent, single-use authentication tokens.
2. **Stateless Delays**: Rate limiting must be enforced at the gateway or via fast-failing state, never by halting the execution thread.
3. **Complete Flows**: Email verification and password recovery must be functional end-to-end.

## 7. Ordered Implementation Plan

### Task 1: Fix Denial of Service in Login Flow
- **Objective**: Remove the thread-blocking progressive delay and rely on immediate rejection based on the existing `locked_until` state.
- **Scope/files**: `src/app/actions/auth.ts`
- **Required implementation**:
  - Delete the `progressiveDelay` function and remove its invocation from `loginAction`.
  - Ensure that if `locked_until` > `NOW()`, the login fails immediately, closing the request quickly.
- **Required tests**: Add a regression test verifying that an account with sufficient failed attempts rejects subsequent login attempts within milliseconds (fast fail) rather than pausing the event loop.
- **Acceptance criteria**: The login action never calls `setTimeout`. Brute-force lockout behavior is securely preserved purely via checking database state (`locked_until`).
- **Dependencies**:
  - **Independent**: This task has no dependencies and can be executed immediately by a separate session. It relies only on the existing `users.locked_until` column and modifies no external structures.

### Task 2: Align Database Schema for Auth Tokens
- **Objective**: Expand the `users` table schema to support persistent email verification and password reset workflows.
- **Scope/files**: `database/schema/organization.ts`, `database/drizzle/` (Create new migration).
- **Required implementation**:
  - Add the following columns to the `users` schema: `email_verified` (boolean, default false), `email_verified_at` (timestamp), `verification_token` (text), `reset_token` (text), and `reset_token_expires_at` (timestamp).
  - Generate the Drizzle SQL migration.
  - Ensure any manual object alterations strictly preserve existing Row-Level Security (RLS) constraints.
- **Required tests**: Run database integration tests and `drizzle-kit check` to ensure the generated migration exactly matches the TypeScript schema representation.
- **Acceptance criteria**: The database is migrated to include all necessary token columns without losing existing user or organization data.
- **Dependencies**:
  - **Independent**: This schema update must be performed before any downstream business logic uses the new token columns. It can be executed immediately but blocks Task 3 and Task 4.

### Task 3: Implement Email Verification Backend
- **Objective**: Replace the simulated email verification flow with cryptographically secure, persistent token validation.
- **Scope/files**: `src/app/actions/auth.ts`, `src/app/[locale]/verify-email/page.tsx`
- **Required implementation**:
  - Update `registerAction` to generate a secure random token, hash it for storage in `verification_token`, and append it to the verification link.
  - Create a new `verifyEmailAction(token: string)` that securely hashes the incoming token, finds the matching user where `verification_token` matches, sets `email_verified = true`, `email_verified_at = NOW()`, and nullifies `verification_token`.
  - Update the `verify-email/page.tsx` React component to invoke `verifyEmailAction` with the URL query parameter instead of using a `setTimeout` mock.
- **Required tests**: Write an end-to-end integration test verifying that a user remains unverified until `verifyEmailAction` is called with the correct token, at which point their database record reflects `email_verified = true`.
- **Acceptance criteria**: Users can successfully verify their email end-to-end; invalid or reused tokens fail safely.
- **Dependencies**:
  - **Depends on Task 2 (Database Schema)**: Requires the `verification_token`, `email_verified`, and `email_verified_at` columns to exist in the database in order to persist the state. Task 3 cannot be implemented until the Drizzle migration from Task 2 is applied.

### Task 4: Implement Password Reset Flow
- **Objective**: Implement the missing password reset completion flow using secure, time-bound tokens.
- **Scope/files**: `src/app/actions/auth.ts`, `src/app/[locale]/reset-password/page.tsx`
- **Required implementation**:
  - Update `requestPasswordResetAction` to hash a securely generated UUID token and store it in `reset_token` alongside an expiration time (e.g., 1 hour from now) in `reset_token_expires_at`.
  - Create the missing frontend UI component `/[locale]/reset-password/page.tsx`.
  - Create a new `resetPasswordAction(token: string, newPassword: string)` that securely hashes the token, validates it against `reset_token`, ensures `NOW() < reset_token_expires_at`, updates `password_hash` using Argon2, and finally nullifies the reset token fields.
- **Required tests**: E2E integration test for requesting a reset, confirming token existence and expiration, and successfully using the token to change the password and log in.
- **Acceptance criteria**: Password reset functions correctly, and tokens are single-use and time-bound.
- **Dependencies**:
  - **Depends on Task 2 (Database Schema)**: Requires the `reset_token` and `reset_token_expires_at` columns in the database. Task 4 cannot be implemented until the Drizzle migration from Task 2 is applied. (Note: Task 3 and Task 4 can be executed in parallel by different sessions once Task 2 is complete).
