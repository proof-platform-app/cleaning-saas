# Lovable UI Import Protocol

**Status:** ACTIVE
**Created:** 2024-02-14
**Owner:** Platform Team
**Related:** [CONTEXT_ISOLATION_LOCK.md](./CONTEXT_ISOLATION_LOCK.md)

## Purpose

This protocol defines rules for importing UI components and pages from Lovable prototypes into the Proof Platform monorepo. The goal is to preserve platform architecture while accelerating UI development.

## Core Principle

> Import presentation, not architecture. Lovable provides visual building blocks; the main repo owns routing, state, and API contracts.

---

## What CAN Be Imported

### ✅ Allowed

| Category | Examples | Notes |
|----------|----------|-------|
| **Page JSX layout** | Main container structure, grid layout | Strip routing logic |
| **Presentational components** | Cards, badges, status indicators | No side effects |
| **Tailwind classes** | Styling, responsive breakpoints | Verify no custom config conflicts |
| **Small UI helpers** | Formatters, display utils | Pure functions only |
| **Icons** | Lucide icons already in use | Check for existing imports |
| **Form components** | Input groups, validation UI | Separate from form logic |
| **Data display patterns** | Tables, lists, detail views | Without data fetching |

### ⚠️ Import with Adaptation

| Category | Required Changes |
|----------|-----------------|
| **Mock data** | Replace with real API calls via adapters |
| **Local state** | Convert to React Query or context if shared |
| **Navigation links** | Update to match `/maintenance/*` routes |
| **API calls** | Route through `adapters/` layer |

---

## What is FORBIDDEN

### ❌ Never Import

| Category | Why |
|----------|-----|
| **React Router setup** | Main repo owns routing in `App.tsx` |
| **Sidebar/nav components** | Context registry controls navigation |
| **App-level state management** | Use existing `AppContext`, `LocationsContext` |
| **Project configs** | `vite.config`, `tailwind.config`, `tsconfig` |
| **Auth flows** | Existing auth in `api/client.ts` |
| **Global providers** | `QueryClientProvider`, `TooltipProvider` already exist |
| **Package.json dependencies** | Evaluate each dependency separately |
| **Custom hooks with side effects** | Rewrite using existing patterns |

---

## File Mapping Rules

### Source → Target Structure

```
Lovable Project                    Main Repo (dubai-control/src)
─────────────────                  ──────────────────────────────
src/pages/ServiceVisits.tsx   →   contexts/maintenance/ui/ServiceVisitsPage.tsx
src/pages/Assets.tsx          →   contexts/maintenance/ui/AssetsPage.tsx
src/components/VisitCard.tsx  →   contexts/maintenance/components/VisitCard.tsx
src/components/AssetList.tsx  →   contexts/maintenance/components/AssetList.tsx
src/hooks/useVisits.ts        →   contexts/maintenance/adapters/useServiceVisits.ts
src/api/visits.ts             →   contexts/maintenance/adapters/visitsApi.ts
```

### Directory Structure

```
dubai-control/src/contexts/maintenance/
├── ui/                      # Page-level components (imported from Lovable)
│   ├── ServiceVisitsPage.tsx
│   ├── AssetDetailPage.tsx
│   └── WorkOrdersPage.tsx
├── components/              # Shared presentational components
│   ├── VisitCard.tsx
│   ├── AssetStatusBadge.tsx
│   └── TechnicianAvatar.tsx
├── adapters/                # API mapping layer
│   ├── useServiceVisits.ts  # React Query hooks
│   ├── useAssets.ts
│   └── api.ts               # Thin wrapper over main api/client.ts
├── routes.tsx               # Maintenance-only route definitions
└── index.ts                 # Public exports
```

---

## Naming Conventions

### File Names

| Type | Convention | Example |
|------|------------|---------|
| Pages | `{Feature}Page.tsx` | `ServiceVisitsPage.tsx` |
| Components | `{Feature}{Type}.tsx` | `VisitCard.tsx`, `AssetStatusBadge.tsx` |
| Hooks | `use{Feature}.ts` | `useServiceVisits.ts` |
| Adapters | `{feature}Api.ts` | `visitsApi.ts` |

### Component Names

- **Prefix with context when generic:** `MaintenanceHeader`, not `Header`
- **Avoid collision with existing:** Check `components/ui/` first
- **Use domain vocabulary:** "Service Visit" not "Job" in Maintenance context

### Export Names

```typescript
// contexts/maintenance/index.ts
export { ServiceVisitsPage } from "./ui/ServiceVisitsPage";
export { AssetDetailPage } from "./ui/AssetDetailPage";
export { VisitCard } from "./components/VisitCard";
export { useServiceVisits } from "./adapters/useServiceVisits";
```

---

## Import Checklist

Before importing any Lovable file, verify:

- [ ] **No router imports** — Remove `react-router-dom` usage
- [ ] **No global state** — Remove Redux, Zustand, or custom contexts
- [ ] **No API calls** — Replace with adapter imports
- [ ] **No auth logic** — Use existing auth from `api/client.ts`
- [ ] **Icons exist** — Check Lucide icons are already imported
- [ ] **Tailwind classes work** — No custom plugins required
- [ ] **No name collisions** — Search existing components first
- [ ] **Relative paths updated** — Fix `@/` imports to match main repo

---

## Adapter Pattern

### Purpose

Adapters bridge Lovable UI expectations with main repo API contracts.

### Example

```typescript
// contexts/maintenance/adapters/useServiceVisits.ts
import { useQuery } from "@tanstack/react-query";
import { getServiceVisits, type ServiceVisit } from "@/api/client";

export function useServiceVisits(filters?: {
  status?: string;
  assetId?: number;
}) {
  return useQuery({
    queryKey: ["serviceVisits", filters],
    queryFn: () => getServiceVisits({
      status: filters?.status,
      asset_id: filters?.assetId,
    }),
  });
}
```

### Rules

1. **Thin wrappers only** — Adapters don't contain business logic
2. **Type preservation** — Re-export types from `api/client.ts`
3. **Query key consistency** — Follow existing patterns
4. **Error handling** — Use existing toast/error patterns

---

## Route Integration

### Adding New Routes

1. Define route in `contexts/maintenance/routes.tsx`
2. Import page from `contexts/maintenance/ui/`
3. Register in `App.tsx` under maintenance section

```typescript
// contexts/maintenance/routes.tsx
import { ServiceVisitsPage } from "./ui/ServiceVisitsPage";
import { AssetDetailPage } from "./ui/AssetDetailPage";

export const maintenanceRoutes = [
  { path: "/maintenance/visits", element: <ServiceVisitsPage /> },
  { path: "/maintenance/assets/:id", element: <AssetDetailPage /> },
];
```

### Navigation Updates

- **DO NOT** modify `AppSidebar.tsx` directly
- **DO** update `config/contexts/maintenance.ts` nav items
- **DO** follow context registry pattern

---

## Conflict Resolution

### If Lovable component conflicts with existing:

1. **Check if existing component can be reused** — prefer platform components
2. **If not, prefix with `Maintenance`** — `MaintenanceDataTable` vs `DataTable`
3. **If styles conflict, scope to maintenance** — use wrapper class

### If Lovable uses different patterns:

| Lovable Pattern | Platform Pattern | Action |
|-----------------|------------------|--------|
| `useState` for API data | React Query | Convert to `useQuery` |
| Custom fetch | `api/client.ts` | Use existing functions |
| Local storage | Platform patterns | Use existing helpers |
| Custom icons | Lucide | Map to existing icons |

---

## Review Process

### Before Merge

1. Run `npm run build` — no errors
2. Check context isolation — Cleaning nav unchanged
3. Verify routes — all under `/maintenance/*`
4. Test navigation — switcher works correctly
5. API calls work — adapters connect properly

### Commit Message Format

```
feat(maintenance): import {Feature} UI from Lovable

- Add {Page}Page.tsx from Lovable prototype
- Create adapters for API integration
- Add components: {list}

Adapted per LOVABLE_UI_IMPORT_PROTOCOL.md
```

---

## Appendix: Quick Reference

### Imports to Remove

```typescript
// REMOVE these from Lovable files:
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "..."; // Global toaster
import { AuthProvider } from "..."; // Auth context
```

### Imports to Add

```typescript
// ADD these to imported files:
import { useNavigate, Link } from "react-router-dom"; // OK for navigation
import { useQuery, useMutation } from "@tanstack/react-query"; // OK for data
import { useToast } from "@/components/ui/use-toast"; // Platform toast
import { useAppContext } from "@/contexts/AppContext"; // If context needed
```

---

## Changelog

| Date | Change |
|------|--------|
| 2024-02-14 | Initial protocol created |
