// dubai-control/src/hooks/useUserRole.ts

/**
 * Mock user role hook for Settings MVP v1.1
 *
 * In production, this would connect to actual auth context
 * For now, returns hardcoded Owner role for development
 *
 * Role types:
 * - owner: Full access to all settings
 * - manager: Read-only billing access
 * - staff: No billing access (redirected)
 */

export type UserRole = "owner" | "manager" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authType: "password" | "sso";
}

export function useUserRole(): User {
  // TODO: Replace with actual auth context in production
  // For MVP v1.1, return mock owner user
  return {
    id: "user_1",
    name: "Admin User",
    email: "admin@cleanproof.com",
    role: "owner",
    authType: "password",
  };
}

export function canAccessBilling(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

export function canModifyBilling(role: UserRole): boolean {
  return role === "owner";
}

export function isPasswordAuth(user: User): boolean {
  return user.authType === "password";
}
