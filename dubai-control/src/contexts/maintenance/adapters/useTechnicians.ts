// dubai-control/src/contexts/maintenance/adapters/useTechnicians.ts
// Adapter for Technicians (Cleaners) API in Maintenance context
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCleaners,
  createCleaner,
  updateCleaner,
  getCleanerAuditLog,
  type Cleaner,
  type CleanerAuditLog,
} from "@/api/client";

// Re-export types with maintenance terminology
export type { Cleaner as Technician, CleanerAuditLog as TechnicianAuditLog };

// Maintenance context terminology:
// Technician = Cleaner (same entity, different label)

// Query keys for cache management
export const technicianKeys = {
  all: ["maintenance", "technicians"] as const,
  list: () => [...technicianKeys.all, "list"] as const,
  detail: (id: number) => [...technicianKeys.all, "detail", id] as const,
  auditLog: (id: number) => [...technicianKeys.all, "audit", id] as const,
};

/**
 * Hook to fetch all technicians (cleaners with role=cleaner).
 * Maps to GET /api/manager/cleaners/
 */
export function useTechnicians(enabled = true) {
  return useQuery({
    queryKey: technicianKeys.list(),
    queryFn: getCleaners,
    enabled,
  });
}

/**
 * Hook to fetch active technicians only.
 */
export function useActiveTechnicians(enabled = true) {
  const query = useTechnicians(enabled);

  return {
    ...query,
    data: query.data?.filter((t) => t.is_active) ?? [],
  };
}

/**
 * Hook to fetch technician audit log.
 * Maps to GET /api/company/cleaners/{id}/audit-log/
 */
export function useTechnicianAuditLog(id: number, enabled = true) {
  return useQuery({
    queryKey: technicianKeys.auditLog(id),
    queryFn: () => getCleanerAuditLog(id),
    enabled: enabled && id > 0,
  });
}

export interface CreateTechnicianInput {
  full_name: string;
  email?: string;
  phone?: string;
}

/**
 * Mutation hook to create a new technician.
 * Maps to POST /api/manager/cleaners/
 */
export function useCreateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTechnicianInput) => createCleaner(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.all });
    },
  });
}

export interface UpdateTechnicianInput {
  full_name?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

/**
 * Mutation hook to update a technician.
 * Maps to PATCH /api/manager/cleaners/{id}/
 */
export function useUpdateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTechnicianInput & { id: number }) =>
      updateCleaner(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.all });
      queryClient.invalidateQueries({ queryKey: technicianKeys.detail(variables.id) });
    },
  });
}

/**
 * Helper to get technician status style classes.
 */
export function getTechnicianStatusStyle(isActive: boolean): string {
  return isActive
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-800";
}

/**
 * Helper to get technician initials for avatar.
 */
export function getTechnicianInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
