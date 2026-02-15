// dubai-control/src/contexts/maintenance/adapters/useTechnicians.ts
// Adapter for Technicians API in Maintenance context (S2-P1)
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCleaner,
  updateCleaner,
  getCleanerAuditLog,
  resetCleanerPin,
  type CleanerAuditLog,
} from "@/api/client";
import {
  listMaintenanceTechnicians,
  type MaintenanceTechnician,
} from "@/api/maintenance";

// Export Technician type with maintenance stats
export type Technician = MaintenanceTechnician;
export type { CleanerAuditLog as TechnicianAuditLog };

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
 * Hook to fetch all technicians with maintenance stats.
 * Maps to GET /api/maintenance/technicians/
 * Returns: id, full_name, email, phone, is_active, total_visits, sla_violation_rate
 */
export function useTechnicians(enabled = true) {
  return useQuery({
    queryKey: technicianKeys.list(),
    queryFn: listMaintenanceTechnicians,
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
  phone: string; // Required for field app authentication
  email?: string;
  pin: string; // 4-digit PIN for field app authentication
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
 * Mutation hook to reset technician PIN.
 * Maps to POST /api/manager/cleaners/{id}/reset-pin/
 * Returns the new PIN for display/copy.
 */
export function useResetTechnicianPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => resetCleanerPin(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.all });
      queryClient.invalidateQueries({ queryKey: technicianKeys.detail(id) });
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
