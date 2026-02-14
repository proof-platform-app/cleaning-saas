// dubai-control/src/contexts/maintenance/ui/AssetsLovableLayout.tsx
// Lovable-style layout for Assets page
// Imported from control-hub/src/pages/ObjectsPage.tsx design
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { Plus, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

/**
 * Asset data structure expected by this layout.
 * Maps to our Asset type from API.
 */
export interface AssetLayoutItem {
  id: number | string;
  name: string;
  address?: string; // location.name or location.address
  serialNumber?: string;
  hasLocation?: boolean; // whether coordinates/geolocation exists
  createdAt: string; // ISO date string
}

interface AssetsLovableLayoutProps {
  assets: AssetLayoutItem[];
  onAddAsset?: () => void;
  onAssetClick?: (asset: AssetLayoutItem) => void;
  canWrite?: boolean;
}

/**
 * Lovable-style Assets page layout.
 * Pure presentational component - all logic handled by parent.
 *
 * Visual structure:
 * - Page header with title + Add Asset button
 * - Premium card with data table
 * - Table columns: Name, Address, Serial #, Location, Created, Action
 */
export function AssetsLovableLayout({
  assets,
  onAddAsset,
  onAssetClick,
  canWrite = true,
}: AssetsLovableLayoutProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Assets</h1>
        {canWrite && (
          <Button size="sm" className="h-8 px-3 text-xs font-medium" onClick={onAddAsset}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Asset
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Location</th>
              <th>Serial Number</th>
              <th className="w-[80px]">Geo</th>
              <th className="w-[100px]">Created</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr
                key={asset.id}
                className="cursor-pointer group"
                onClick={() => onAssetClick?.(asset)}
              >
                <td className="font-medium text-foreground">{asset.name}</td>
                <td className="text-muted-foreground">{asset.address || "—"}</td>
                <td className="text-muted-foreground font-mono text-xs">
                  {asset.serialNumber || "—"}
                </td>
                <td>
                  {asset.hasLocation ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" strokeWidth={1.5} />
                      <span className="text-xs">Set</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="text-muted-foreground tabular-nums">
                  {formatDate(asset.createdAt)}
                </td>
                <td>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {assets.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No assets found. Add your first asset.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format ISO date string to display format.
 * Falls back gracefully if date is invalid.
 */
function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default AssetsLovableLayout;
