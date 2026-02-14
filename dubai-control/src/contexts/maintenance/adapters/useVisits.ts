// dubai-control/src/contexts/maintenance/adapters/useVisits.ts
// Adapter for Service Visits (Jobs) API in Maintenance context
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServiceVisits,
  getServiceVisit,
  createServiceVisit,
  type ServiceVisit,
  type ManagerJobDetail,
  type CreateServiceVisitInput,
} from "@/api/client";

// Re-export types for convenience
export type { ServiceVisit, ManagerJobDetail, CreateServiceVisitInput };

// Maintenance context terminology mapping:
// - ServiceVisit = Job (in cleaning context)
// - Technician = Cleaner
// - Asset = equipment being serviced

// Query keys for cache management
export const visitKeys = {
  all: ["maintenance", "visits"] as const,
  list: (filters?: VisitFilters) => [...visitKeys.all, "list", filters] as const,
  detail: (id: number) => [...visitKeys.all, "detail", id] as const,
};

export interface VisitFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  cleaner_id?: number; // technician_id in UI
  location_id?: number;
}

// Status mapping for display
export const VISIT_STATUS = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  pending_review: "Pending Review",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export type VisitStatus = keyof typeof VISIT_STATUS;

/**
 * Hook to fetch service visits (maintenance jobs) with optional filters.
 * Maps to GET /api/manager/jobs/history/
 */
export function useVisits(filters?: VisitFilters, enabled = true) {
  return useQuery({
    queryKey: visitKeys.list(filters),
    queryFn: () => getServiceVisits(filters),
    enabled,
  });
}

/**
 * Hook to fetch today's visits.
 * Convenience wrapper that sets date_from and date_to to today.
 */
export function useTodaysVisits(enabled = true) {
  const today = new Date().toISOString().split("T")[0];
  return useVisits({ date_from: today, date_to: today }, enabled);
}

/**
 * Hook to fetch a single visit by ID.
 * Maps to GET /api/manager/jobs/{id}/
 */
export function useVisit(id: number, enabled = true) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: () => getServiceVisit(id),
    enabled: enabled && id > 0,
  });
}

/**
 * Mutation hook to create a new service visit.
 * Maps to POST /api/manager/jobs/
 */
export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateServiceVisitInput) => createServiceVisit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.all });
    },
  });
}

/**
 * Helper to get status badge style classes.
 */
export function getVisitStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    scheduled: "bg-amber-100 text-amber-800",
    in_progress: "bg-blue-100 text-blue-800",
    pending_review: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return styles[status] || "bg-gray-100 text-gray-800";
}

/**
 * Helper to get status display label.
 */
export function getVisitStatusLabel(status: string): string {
  return VISIT_STATUS[status as VisitStatus] || status;
}
