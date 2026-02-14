// dubai-control/src/contexts/maintenance/ui/AssetsPage.tsx
// Maintenance Assets Page - imported from Lovable pattern
// Static version with placeholder data

import { useState } from "react";
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
} from "lucide-react";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC
function canWriteAssets(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

function canReadAssets(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// Status badge component
function StatusBadge({ status }: { status: "active" | "inactive" | "maintenance" }) {
  const styles = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    maintenance: "bg-amber-100 text-amber-800",
  };

  const labels = {
    active: "Active",
    inactive: "Inactive",
    maintenance: "Under Maintenance",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Placeholder data
const placeholderAssets = [
  {
    id: 1,
    name: "AHU-01 Main Building",
    type: "HVAC",
    location: "Tower A - Floor 1",
    serialNumber: "SN-2024-001",
    status: "active" as const,
    lastService: "2024-02-10",
  },
  {
    id: 2,
    name: "Elevator A1",
    type: "Elevator",
    location: "Tower A",
    serialNumber: "ELV-2024-A1",
    status: "maintenance" as const,
    lastService: "2024-02-12",
  },
  {
    id: 3,
    name: "Fire Pump System",
    type: "Fire Safety",
    location: "Basement B1",
    serialNumber: "FP-2024-001",
    status: "active" as const,
    lastService: "2024-01-28",
  },
  {
    id: 4,
    name: "Generator Set 1",
    type: "Electrical",
    location: "Utility Building",
    serialNumber: "GEN-2024-001",
    status: "inactive" as const,
    lastService: "2024-01-15",
  },
];

export function AssetsPage() {
  const user = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const hasReadAccess = canReadAssets(user.role);
  const hasWriteAccess = canWriteAssets(user.role);

  // Filter assets
  const filteredAssets = placeholderAssets.filter((asset) => {
    if (statusFilter !== "all" && asset.status !== statusFilter) return false;
    if (typeFilter !== "all" && asset.type !== typeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        asset.name.toLowerCase().includes(search) ||
        asset.serialNumber.toLowerCase().includes(search) ||
        asset.location.toLowerCase().includes(search)
      );
    }
    return true;
  });

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
            <SelectItem value="maintenance">Under Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="HVAC">HVAC</SelectItem>
            <SelectItem value="Elevator">Elevator</SelectItem>
            <SelectItem value="Electrical">Electrical</SelectItem>
            <SelectItem value="Fire Safety">Fire Safety</SelectItem>
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
            <h3 className="mt-4 text-lg font-semibold text-foreground">No assets found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Last Service
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{asset.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">{asset.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-muted-foreground">{asset.serialNumber}</code>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={asset.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground">{asset.lastService}</div>
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

      {/* Info Banner */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-medium">Static Preview</p>
        <p className="mt-1 text-xs">
          This page shows placeholder data. Connect to API via adapters to display real assets.
        </p>
      </div>
    </div>
  );
}

export default AssetsPage;
