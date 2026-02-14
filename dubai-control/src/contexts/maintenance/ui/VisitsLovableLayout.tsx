// dubai-control/src/contexts/maintenance/ui/VisitsLovableLayout.tsx
// Lovable-style layout for Service Visits (Work Orders) page
// Imported from control-hub/src/pages/WorkOrdersPage.tsx design
// See docs/execution/LOVABLE_UI_IMPORT_PROTOCOL.md

import { Plus, ChevronRight, Camera, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

// Only valid statuses per MAINTENANCE_CONTEXT_V1_SCOPE
export type VisitStatus = "scheduled" | "in_progress" | "completed";

export interface VisitLayoutItem {
  id: number | string;
  status: VisitStatus;
  assetName?: string;
  locationName?: string;
  locationAddress?: string;
  technicianName?: string;
  scheduledDate: string; // ISO date string
  // Proof indicators
  hasPhotoBefore?: boolean;
  hasPhotoAfter?: boolean;
  checklistCompleted?: number;
  checklistTotal?: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

interface VisitsLovableLayoutProps {
  visits: VisitLayoutItem[];
  onCreateVisit?: () => void;
  onRowClick?: (id: number | string) => void;
  canWrite?: boolean;
  loading?: boolean;
  emptyState?: { title: string; description: string };
  // Filter props - map 1:1 to backend query params
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  assetFilter?: string;
  onAssetFilterChange?: (value: string) => void;
  assetOptions?: FilterOption[];
  technicianFilter?: string;
  onTechnicianFilterChange?: (value: string) => void;
  technicianOptions?: FilterOption[];
  categoryFilter?: string;
  onCategoryFilterChange?: (value: string) => void;
  categoryOptions?: FilterOption[];
}

// ============================================================================
// Sub-components (Lovable style)
// ============================================================================

// Only valid statuses per MAINTENANCE_CONTEXT_V1_SCOPE
// cancelled is excluded from UI
const statusConfig: Record<VisitStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "status-open" },
  in_progress: { label: "In Progress", className: "status-progress" },
  completed: { label: "Completed", className: "status-completed" },
};

function StatusPill({ status }: { status: VisitStatus }) {
  const config = statusConfig[status] || statusConfig.scheduled;
  return (
    <span className={cn("status-pill whitespace-nowrap", config.className)}>
      {config.label}
    </span>
  );
}

function ProofIndicators({
  hasBefore,
  hasAfter,
  checklistProgress,
}: {
  hasBefore: boolean;
  hasAfter: boolean;
  checklistProgress: { completed: number; total: number };
}) {
  const checklistComplete =
    checklistProgress.completed === checklistProgress.total &&
    checklistProgress.total > 0;
  const hasPhotos = hasBefore || hasAfter;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("proof-indicator", hasPhotos && "has-proof")}>
              <Camera className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>
              {hasBefore ? "\u2713" : "\u25CB"} Before &middot;{" "}
              {hasAfter ? "\u2713" : "\u25CB"} After
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("proof-indicator", checklistComplete && "has-proof")}>
              <CheckSquare className="w-3 h-3" strokeWidth={1.5} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>
              {checklistProgress.completed}/{checklistProgress.total} steps
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function FilterSelect({
  placeholder,
  value,
  onChange,
  options,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] h-8 bg-card border-border text-xs font-normal">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card border-border min-w-[140px]">
        <SelectItem value="all" className="text-xs">
          All {placeholder.toLowerCase()}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================================================
// Main Layout Component
// ============================================================================

/**
 * Lovable-style Service Visits page layout.
 * Pure presentational component - all logic handled by parent.
 *
 * Visual structure:
 * - Page header with title + Create Visit button
 * - Filter bar (Status, Asset, Technician)
 * - Premium card with data table
 * - Table columns: Status, Visit ID, Asset, Location, Technician, Scheduled, Proof, Chevron
 */
export function VisitsLovableLayout({
  visits,
  onCreateVisit,
  onRowClick,
  canWrite = true,
  loading = false,
  emptyState = {
    title: "No service visits yet",
    description: "Get started by creating your first service visit",
  },
  statusFilter = "all",
  onStatusFilterChange,
  assetFilter = "all",
  onAssetFilterChange,
  assetOptions = [],
  technicianFilter = "all",
  onTechnicianFilterChange,
  technicianOptions = [],
  categoryFilter = "all",
  onCategoryFilterChange,
  categoryOptions = [],
}: VisitsLovableLayoutProps) {
  // Only valid statuses per MAINTENANCE_CONTEXT_V1_SCOPE
  // cancelled is excluded from display and filtering
  const statusOptions: FilterOption[] = [
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Service Visits</h1>
        {canWrite && (
          <Button
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={onCreateVisit}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Visit
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {onStatusFilterChange && (
          <FilterSelect
            placeholder="Status"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={statusOptions}
          />
        )}
        {onAssetFilterChange && assetOptions.length > 0 && (
          <FilterSelect
            placeholder="Asset"
            value={assetFilter}
            onChange={onAssetFilterChange}
            options={assetOptions}
          />
        )}
        {onTechnicianFilterChange && technicianOptions.length > 0 && (
          <FilterSelect
            placeholder="Technician"
            value={technicianFilter}
            onChange={onTechnicianFilterChange}
            options={technicianOptions}
          />
        )}
        {onCategoryFilterChange && categoryOptions.length > 0 && (
          <FilterSelect
            placeholder="Category"
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            options={categoryOptions}
          />
        )}
      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading visits...
          </div>
        ) : visits.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="font-medium text-foreground">{emptyState.title}</p>
            <p className="mt-1 text-sm">{emptyState.description}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[100px]">Status</th>
                <th>Visit ID</th>
                <th>Asset</th>
                <th>Location</th>
                <th>Technician</th>
                <th className="w-[110px]">Scheduled</th>
                <th className="w-[100px]">Proof</th>
                <th className="w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr
                  key={visit.id}
                  className="cursor-pointer group"
                  onClick={() => onRowClick?.(visit.id)}
                >
                  <td>
                    <StatusPill status={visit.status} />
                  </td>
                  <td>
                    <span className="font-medium text-foreground text-xs">
                      #{visit.id}
                    </span>
                  </td>
                  <td className="text-foreground">{visit.assetName || "—"}</td>
                  <td className="text-muted-foreground truncate max-w-[180px]">
                    {visit.locationAddress || visit.locationName || "—"}
                  </td>
                  <td className="text-muted-foreground">
                    {visit.technicianName || "—"}
                  </td>
                  <td className="text-muted-foreground tabular-nums">
                    {formatDate(visit.scheduledDate)}
                  </td>
                  <td>
                    <ProofIndicators
                      hasBefore={visit.hasPhotoBefore || false}
                      hasAfter={visit.hasPhotoAfter || false}
                      checklistProgress={{
                        completed: visit.checklistCompleted || 0,
                        total: visit.checklistTotal || 0,
                      }}
                    />
                  </td>
                  <td>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default VisitsLovableLayout;
