// dubai-control/src/contexts/maintenance/ui/AssetsPage.tsx
// Maintenance Assets Page - wired to real API
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Wrench,
  MoreHorizontal,
  Filter,
  Download,
  Loader2,
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { useAssets, useAssetTypes, type Asset } from "../adapters/useAssets";

// RBAC
function canWriteAssets(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

function canReadAssets(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Status badge component - maps is_active boolean to status
function StatusBadge({ isActive }: { isActive: boolean }) {
  const style = isActive
    ? "bg-green-100 text-green-800"
    : "bg-gray-100 text-gray-800";
  const label = isActive ? "Active" : "Inactive";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

// Type badge component
function TypeBadge({ typeName }: { typeName: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
      {typeName}
    </span>
  );
}

export function AssetsPage() {
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const hasReadAccess = canReadAssets(user.role);
  const hasWriteAccess = canWriteAssets(user.role);

  // Fetch assets from API
  const { data: assets = [], isLoading: assetsLoading, error: assetsError } = useAssets(
    undefined,
    hasReadAccess
  );

  // Fetch asset types for filter dropdown
  const { data: assetTypes = [] } = useAssetTypes(hasReadAccess);

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset: Asset) => {
      // Status filter
      if (statusFilter === "active" && !asset.is_active) return false;
      if (statusFilter === "inactive" && asset.is_active) return false;

      // Type filter
      if (typeFilter !== "all" && asset.asset_type?.id !== Number(typeFilter)) return false;

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          asset.name.toLowerCase().includes(search) ||
          asset.serial_number?.toLowerCase().includes(search) ||
          asset.location?.name?.toLowerCase().includes(search) ||
          asset.description?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [assets, statusFilter, typeFilter, searchTerm]);

  // Access restricted
  if (!hasReadAccess) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view assets.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (assetsLoading) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading assets...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (assetsError) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <Wrench className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Error Loading Assets</h2>
          <p className="mt-2 text-muted-foreground">
            {assetsError instanceof Error ? assetsError.message : "Failed to load assets"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Assets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage equipment and assets for maintenance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {hasWriteAccess && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assets..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {assetTypes.map((type) => (
              <SelectItem key={type.id} value={String(type.id)}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Asset Inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredAssets.length} {filteredAssets.length === 1 ? "asset" : "assets"}
          </p>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {assets.length === 0 ? "No assets yet" : "No assets found"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {assets.length === 0
                ? "Add your first asset to start tracking maintenance"
                : "Try adjusting your search or filters"}
            </p>
            {hasWriteAccess && assets.length === 0 && (
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Serial #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredAssets.map((asset: Asset) => (
                  <tr
                    key={asset.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{asset.name}</div>
                      {asset.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {asset.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <TypeBadge typeName={asset.asset_type?.name || "Unknown"} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {asset.location?.name || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-muted-foreground">
                        {asset.serial_number || "—"}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge isActive={asset.is_active} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssetsPage;
