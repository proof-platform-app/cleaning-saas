# Parallel Work Protocol — CleanProof

> **Purpose:** Define when and how parallel agents may be used to avoid architectural conflicts.
> **Last Updated:** 2026-02-13

---

## 1. Purpose

This document establishes rules for using parallel agents during development. Parallel execution increases speed but creates risk of conflicting writes, merge issues, and architectural drift.

**Goal:** Maximize throughput while maintaining code integrity.

---

## 2. Golden Rule

> **Code writes must be sequential. Code inspection may be parallel.**

| Activity | Parallel OK? | Rationale |
|----------|--------------|-----------|
| Reading files | ✅ Yes | No mutation risk |
| Searching codebase | ✅ Yes | No mutation risk |
| Running tests (read-only) | ✅ Yes | No mutation risk |
| **Writing/editing files** | ❌ No | Conflict risk |
| **Creating new files** | ⚠️ Caution | OK if paths guaranteed unique |
| **Running migrations** | ❌ No | Database state corruption |
| **Git operations** | ❌ No | Index/HEAD conflicts |

---

## 3. When Parallel Agents Are Allowed

Parallel agents may run **only** when ALL conditions are met:

1. **Read-only operations** — Agents perform inspection, search, or analysis only
2. **No shared state** — Each agent operates on independent files/systems
3. **No file overlap** — Target files do not intersect
4. **Explicit scope** — Each agent has clearly bounded responsibility

### Allowed Parallel Patterns

```
✅ Agent A: Explore frontend components
   Agent B: Explore backend API endpoints
   Agent C: Search for usage of specific function

✅ Agent A: Read src/pages/*.tsx
   Agent B: Read apps/api/views*.py
   (No overlap, read-only)

✅ Agent A: Run frontend build check
   Agent B: Run backend unit tests
   (Independent systems)
```

### Forbidden Parallel Patterns

```
❌ Agent A: Edit config/settings.py
   Agent B: Edit config/settings.py
   (Same file)

❌ Agent A: Edit apps/accounts/models.py
   Agent B: Run migrations
   (Dependent operations)

❌ Agent A: Edit component A
   Agent B: Edit component B that imports A
   (Dependency chain)
```

---

## 4. Mandatory Flow for Parallel Work

When parallel work is needed, follow this sequence:

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: PARALLEL INSPECT                              │
│  • Launch read-only agents to gather information        │
│  • Search, read, analyze in parallel                    │
│  • No writes during this phase                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: CONFLICT CHECK                                │
│  • Review agent outputs                                 │
│  • Identify file overlaps                               │
│  • Resolve architectural conflicts                      │
│  • Plan write sequence                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: SEQUENTIAL WRITES                             │
│  • Execute writes ONE AT A TIME                         │
│  • Verify each write before proceeding                  │
│  • Run tests after critical changes                     │
└─────────────────────────────────────────────────────────┘
```

### Example Workflow

**Task:** Add new feature requiring frontend + backend changes

```bash
# Phase 1: Parallel Inspect
Agent A: "Explore frontend auth flow"
Agent B: "Explore backend auth endpoints"
Agent C: "Search for existing permission checks"
# All run simultaneously

# Phase 2: Conflict Check
# Review outputs, identify:
# - Frontend needs: Login.tsx, api/client.ts
# - Backend needs: views_auth.py, permissions.py
# - No overlap → proceed

# Phase 3: Sequential Writes
# 1. Edit backend/permissions.py
# 2. Edit backend/views_auth.py
# 3. Run backend tests
# 4. Edit frontend/api/client.ts
# 5. Edit frontend/Login.tsx
# 6. Run frontend build
```

---

## 5. High-Risk Areas (Never Parallel Write)

These files/areas must **NEVER** have concurrent writes:

| Area | Files | Risk |
|------|-------|------|
| **Django Settings** | `config/settings.py` | Environment, security, database config |
| **Authentication** | `apps/accounts/` | User security, session handling |
| **RBAC/Permissions** | `apps/api/permissions.py` | Access control integrity |
| **Billing/Trial** | `*billing*`, `*trial*` | Revenue, subscription state |
| **Migrations** | `*/migrations/*.py` | Database schema corruption |
| **Deployment Configs** | `.env*`, `nginx`, `systemd` | Production stability |
| **URL Routing** | `*/urls.py` | Endpoint conflicts |
| **API Client** | `dubai-control/src/api/client.ts` | All frontend API calls |

### Rule

> If two tasks touch ANY high-risk area, they MUST be sequential.

---

## 6. Commit Discipline

### Single-Concern Commits

Each commit should represent ONE logical change:

```bash
# Good
git commit -m "feat(billing): add invoice download endpoint"
git commit -m "fix(auth): correct trial expiration check"

# Bad
git commit -m "feat: add billing + fix auth + update UI"
```

### Commit After Each Write Phase

```
Write file A → Test → Commit (if stable)
Write file B → Test → Commit (if stable)
```

### Never Commit During Parallel Phase

All parallel inspection must complete before any commits.

---

## 7. Enforcement

### Pre-Flight Checklist

Before launching parallel agents:

- [ ] All agents are read-only?
- [ ] No file path overlaps?
- [ ] No dependency chains between targets?
- [ ] High-risk areas excluded from parallel scope?

### Violation Recovery

If parallel write conflict occurs:

1. **STOP** all agents immediately
2. **IDENTIFY** conflicting files
3. **REVERT** to last known good state (`git checkout -- <file>`)
4. **RESTART** with sequential approach

### Monitoring

During multi-agent work:

- Track which files each agent has read
- Log intended writes before execution
- Verify no overlap before proceeding

---

## 8. Quick Reference

### Safe Parallel Operations

| Operation | Command/Tool |
|-----------|--------------|
| File search | `Glob`, `Grep` |
| Code reading | `Read` |
| Codebase exploration | `Task(Explore)` |
| Documentation lookup | `Task(claude-code-guide)` |
| Test execution | `Bash(pytest ...)` |
| Build verification | `Bash(npm run build)` |

### Requires Sequential

| Operation | Reason |
|-----------|--------|
| Any `Edit` or `Write` | Mutation risk |
| `git add/commit/push` | Index state |
| `manage.py migrate` | DB state |
| Service restart | System state |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-13 | v1.0: Initial protocol |
