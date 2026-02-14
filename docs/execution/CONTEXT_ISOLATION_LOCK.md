# Context Isolation Lock

**Status:** ACTIVE
**Created:** 2024-02-14
**Owner:** Platform Team

## Purpose

This document defines the rules for maintaining strict isolation between application contexts (Cleaning, Maintenance, Property, Fitout). Context isolation prevents cross-contamination of UI, routes, and navigation between different operational domains.

## Core Principle

> Each context is a self-contained product with its own navigation, routes, and UI vocabulary. Contexts share only the common layout shell and shared services (Settings, Company).

## Context Registry Architecture

```
src/config/contexts/
├── types.ts          # TypeScript types for context system
├── cleaning.ts       # Cleaning context navigation
├── maintenance.ts    # Maintenance context navigation
└── index.ts          # Registry + utility functions
```

### Adding a New Context

1. Create `src/config/contexts/{context}.ts` with navigation items
2. Add context config to `contextRegistry` in `index.ts`
3. Add routes in `App.tsx` under `/{context}/*` namespace
4. Set `enabled: true` when ready for production

## Hard Rules

### DO NOT

- ❌ Add Maintenance nav items to Cleaning context
- ❌ Rename existing Cleaning menu labels (Dashboard, Jobs, Job Planning, etc.)
- ❌ Remove existing Cleaning routes
- ❌ Share routes between contexts (except Company, Settings)
- ❌ Hardcode navigation in AppSidebar - use context registry

### DO

- ✅ Add new context navigation via registry only
- ✅ Namespace new context routes: `/maintenance/*`, `/property/*`, etc.
- ✅ Preserve existing Cleaning paths at root level
- ✅ Use `getNavItems(contextId, userRole)` for sidebar rendering
- ✅ Store selected context in localStorage + sync from URL

## Verification Checklist

### Cleaning Context Isolation

- [ ] Cleaning sidebar shows: Dashboard, Jobs, Job Planning, Job History, Performance, Analytics, Reports, Locations
- [ ] Cleaning sidebar does NOT show: Assets, Service Visits, Work Orders
- [ ] All original Cleaning routes work unchanged

### Maintenance Context Isolation

- [ ] Maintenance sidebar shows: Service Visits, Assets, Technicians
- [ ] Maintenance sidebar does NOT show: Dashboard, Jobs, Job Planning, Job History
- [ ] All Maintenance routes under `/maintenance/*`

### Context Switching

- [ ] Switcher in header shows current context
- [ ] Switching to Maintenance navigates to `/maintenance/visits`
- [ ] Switching to Cleaning navigates to `/dashboard`
- [ ] Context persists on page refresh (localStorage)
- [ ] Visiting `/maintenance/*` auto-switches to Maintenance context

## Code Verification

```typescript
// Test context isolation programmatically
import { getNavItems } from "@/config/contexts";

// Cleaning context should have "Jobs" but not "Assets"
const cleaningNav = getNavItems("cleaning", "manager");
console.assert(cleaningNav.some(n => n.name === "Jobs"), "Cleaning has Jobs");
console.assert(!cleaningNav.some(n => n.name === "Assets"), "Cleaning no Assets");

// Maintenance context should have "Assets" but not "Job Planning"
const maintenanceNav = getNavItems("maintenance", "manager");
console.assert(maintenanceNav.some(n => n.name === "Assets"), "Maintenance has Assets");
console.assert(!maintenanceNav.some(n => n.name === "Job Planning"), "Maintenance no Job Planning");
```

## Breaking Change Policy

Any change to context isolation requires:

1. Update this document first
2. Review by Platform Team
3. Update verification checklist
4. Run full regression test

## Rollback Plan

If context isolation breaks:

1. Revert to hardcoded navigation in AppSidebar (commit before context switcher)
2. Remove AppContextProvider wrapper from App.tsx
3. Keep context registry files for future reference
