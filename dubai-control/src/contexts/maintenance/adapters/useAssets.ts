// dubai-control/src/contexts/maintenance/adapters/useAssets.ts
// Adapter for Assets API in Maintenance context
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetTypes,
  type Asset,
  type AssetType,
} from "@/api/client";

// Re-export types for convenience
export type { Asset, AssetType };

// Query keys for cache management
export const assetKeys = {
  all: ["maintenance", "assets"] as const,
  list: (filters?: AssetFilters) => [...assetKeys.all, "list", filters] as const,
  detail: (id: number) => [...assetKeys.all, "detail", id] as const,
  types: ["maintenance", "assetTypes"] as const,
};

export interface AssetFilters {
  location_id?: number;
  asset_type_id?: number;
  is_active?: boolean;
}

/**
 * Hook to fetch assets list with optional filters.
 * Maps to GET /api/manager/assets/
 */
export function useAssets(filters?: AssetFilters, enabled = true) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => getAssets(filters),
    enabled,
  });
}

/**
 * Hook to fetch a single asset by ID.
 * Maps to GET /api/manager/assets/{id}/
 */
export function useAsset(id: number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => getAsset(id),
    enabled: enabled && id > 0,
  });
}

/**
 * Hook to fetch asset types.
 * Maps to GET /api/manager/asset-types/
 */
export function useAssetTypes(enabled = true) {
  return useQuery({
    queryKey: assetKeys.types,
    queryFn: getAssetTypes,
    enabled,
  });
}

export interface CreateAssetInput {
  name: string;
  location_id: number;
  asset_type_id: number;
  serial_number?: string;
  description?: string;
  is_active?: boolean;
}

/**
 * Mutation hook to create a new asset.
 * Maps to POST /api/manager/assets/
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAssetInput) => createAsset(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export interface UpdateAssetInput {
  name?: string;
  serial_number?: string;
  description?: string;
  is_active?: boolean;
  location_id?: number;
  asset_type_id?: number;
}

/**
 * Mutation hook to update an asset.
 * Maps to PATCH /api/manager/assets/{id}/
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAssetInput & { id: number }) =>
      updateAsset(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
    },
  });
}

/**
 * Mutation hook to delete an asset.
 * Maps to DELETE /api/manager/assets/{id}/
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}
