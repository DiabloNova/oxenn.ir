import { Session } from "@/types/auth";

/**
 * Legacy compatibility surface. Authentication is server-only through the
 * actions in src/app/actions/auth.ts; this service must never create identity.
 */
export const authService = {
  async getSession(): Promise<Session> {
    return { user: null, expiresAt: null, status: "unauthenticated" };
  },

  async login(): Promise<never> {
    throw new Error("Authentication must use the server login action.");
  },

  async logout(): Promise<void> {
    return undefined;
  },
};
