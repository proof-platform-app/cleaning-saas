// dubai-control/src/hooks/useUserRole.ts

import { useState, useEffect } from "react";
import { getCurrentUser, type CurrentUser } from "@/api/client";

/**
 * User role hook for Settings MVP v1.1
 *
 * Fetches current user data from /api/me endpoint
 *
 * Role types:
 * - owner: Full access to all settings
 * - manager: Read-only billing access
 * - staff: No billing access (redirected)
 * - cleaner: Field worker (no settings access)
 */

export type UserRole = "owner" | "manager" | "staff" | "cleaner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authType: "password" | "sso";
  phone: string | null;
  companyId: number;
}

interface UseUserRoleReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUserRole(): User {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const data = await getCurrentUser();
        if (mounted) {
          setCurrentUser(data);
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
        // Fallback to mock data for development
        if (mounted) {
          const mockUser: CurrentUser = {
            id: 1,
            full_name: "Test Owner",
            email: "owner@test.com",
            phone: null,
            auth_type: "password",
            role: "owner",
            company_id: 1,
          };
          setCurrentUser(mockUser);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !currentUser) {
    // Return fallback while loading
    return {
      id: "loading",
      name: "Loading...",
      email: "loading@example.com",
      role: "owner",
      authType: "password",
      phone: null,
      companyId: 0,
    };
  }

  return {
    id: String(currentUser.id),
    name: currentUser.full_name,
    email: currentUser.email,
    role: currentUser.role,
    authType: currentUser.auth_type,
    phone: currentUser.phone,
    companyId: currentUser.company_id,
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
