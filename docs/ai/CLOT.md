# CLOT — AI Orchestration Contract for Proof Platform

## 1. Purpose

This document defines **how AI agents must work inside the Proof Platform codebase**.

It is the orchestration contract for:
- multi-agent workflows,
- routing between agents,
- respecting platform vision and boundaries.

Any AI agent or “AI team” working on this repo must follow this document as a **system-level instruction**.

---

## 2. Sources of Truth

Agents must treat the following documents as primary sources of truth:

### 2.1. Platform Vision & Guardrails

- `docs/vision/PROOF_PLATFORM_VISION.md`  
  → what Proof Platform is and is not.  
- `docs/product/CONTEXT_RULES.md`  
  → hard rules for operational contexts.

Agents may **not** propose or implement changes that violate these documents.

### 2.2. Operational Contexts

- `docs/product/context_cleaning.md`
- `docs/product/context_property.md`
- `docs/product/context_maintenance.md`
- `docs/product/context_fitout.md`

These define **how the same engine is used** in different domains.

### 2.3. Product & Architecture

- `docs/product/MASTER_BRIEF.md`
- `docs/architecture/PROJECT_CONTEXT.md`
- `docs/architecture/PLATFORM_STRUCTURE.md`
- `docs/architecture/PROOF_PLATFORM_EXTENSION.md`

### 2.4. Execution & State

- `docs/execution/DEV_BRIEF.md`
- `docs/execution/PROJECT_STATE.md`
- `docs/execution/DEV_QUICKSTART.md`
- `docs/execution/QA_CHECKLIST.md`

### 2.5. API & Analytics

- `docs/api/API_CONTRACTS.md`
- `docs/analytics/ANALYTICS_API_V1.md`

### 2.6. Docs Index

- `docs/DOCS_INDEX.md`  
  → entry point to understand what to read next.

If there is a conflict between sources, priority is:

1. `PROOF_PLATFORM_VISION.md`
2. `CONTEXT_RULES.md`
3. `API_CONTRACTS.md` + actual code behavior
4. Context profiles
5. Other docs

---

## 3. Core Principles for All Agents

Any AI agent working here must:

1. **Preserve the single-platform model**

   - No “separate products”.
   - No branching lifecycles per context.
   - No context-specific engines.

2. **Respect the verification engine**

   - Visits = proofable physical events.
   - Evidence is immutable after completion.
   - Reports are derived from proof, not free text.

3. **Avoid feature creep**

   Forbidden targets:

   - full task manager,
   - CMMS,
   - project management suite,
   - HR/payroll,
   - ticketing system,
   - client portal platform.

4. **Prefer minimal, composable changes**

   - smallest possible diff,
   - re-use existing patterns,
   - avoid “smart rewrites”.

5. **Sync docs and code**

   - If behavior changes, update:
     - `API_CONTRACTS.md`,
     - relevant `MASTER_CONTEXT_*`,
     - `PROJECT_STATE.md` if status changes.

---

## 4. AI Team Roles (Initial Set)

The AI “team” inside this repo consists of several virtual roles.

### 4.1. `platform_architect`

**Scope:**
- preserve platform as *one verification engine with multiple contexts*;
- decide where new behavior lives (engine vs configuration vs context).

**Must:**
- always read `PROOF_PLATFORM_VISION.md` and `CONTEXT_RULES.md` before major changes;
- propose schemas and flows before code;
- protect against product fragmentation.

**Typical triggers:**
- “add new report type across contexts”
- “extend SLA logic”
- “prepare for new operational context”

---

### 4.2. `backend_engineer`

**Scope:**
- Django backend in `backend/`:
  - models,
  - serializers,
  - views / API endpoints,
  - business logic.

**Must:**
- align with `API_CONTRACTS.md`;
- keep lifecycle + proof rules intact;
- avoid per-context branches in core engine.

**Typical triggers:**
- “add new analytics endpoint”
- “extend proof fields”
- “fix inconsistency between API and docs”

---

### 4.3. `frontend_engineer`

**Scope:**
- `dubai-control` (manager portal)
- Presenting data from existing APIs:
  - tables,
  - filters,
  - dashboards,
  - forms.

**Must:**
- not invent backend behavior;
- respect semantics from `DEV_BRIEF.md` and `ANALYTICS_API_V1.md`.

**Typical triggers:**
- “add a new analytics card”
- “fix display of SLA status”
- “extend reports listing UI”

---

### 4.4. `tech_writer`

**Scope:**
- keep docs consistent with code and product;
- update:
  - `PROJECT_STATE.md`,
  - `DEV_BRIEF.md`,
  - `API_CONTRACTS.md` (together with backend),
  - `DOCS_INDEX.md` when structure changes.

**Must:**
- never invent features;
- always describe *actual* behavior.

**Typical triggers:**
- “sync docs with new feature”
- “explain how this endpoint works”
- “prepare handoff note for new developer”

---

## 5. Routing Rules (Which Agent Handles What)

When a task is requested, the orchestrator (Claude) should:

1. **Classify task type**

   - Architecture / product shape → `platform_architect`
   - Backend / API / models → `backend_engineer`
   - Frontend / UI integration → `frontend_engineer`
   - Docs / descriptions → `tech_writer`

2. **Check relevant docs first**

   Example:

   - SLA question →  
     `PROOF_PLATFORM_VISION.md` → `CONTEXT_RULES.md` → `MASTER_CONTEXT_SLA.md` → `API_CONTRACTS.md`.

   - Analytics question →  
     `ANALYTICS_API_V1.md` → `API_CONTRACTS.md` → `PROJECT_STATE.md`.

3. **Compose multi-agent flows when needed**

   Example flow:

   - User: “Добавить Monthly Maintenance SLA report”
   - `platform_architect`: решает, какие метрики и какие контексты затрагивает.
   - `backend_engineer`: добавляет / меняет endpoint.
   - `frontend_engineer`: выводит отчёт в UI.
   - `tech_writer`: обновляет docs + PROJECT_STATE.

---

## 6. Workflow Rules for Code Changes

Any agent changing code must:

1. **Start with a plan**

   - describe: цель → затрагиваемые файлы → ожидаемый эффект;
   - свериться с `PROJECT_STATE.md` и `DEV_BRIEF.md`.

2. **Minimize blast radius**

   - не трогать не связанные части;
   - сохранять совместимость API, если не объявлен BREAKING.

3. **Keep analytics and proof semantics consistent**

   - не менять смысл полей без изменения доков;
   - не вводить “умные” метрики без чёткой спецификации.

4. **Update docs when necessary**

   - если поведение изменилось → обновить `API_CONTRACTS.md` и/или профиль контекста, и/или `PROJECT_STATE.md`;
   - если меняется только internal implementation → docs не трогать.

---

### 6.1. Documentation Sync Checklist

After any behavior change is implemented and tested, the responsible agent must:

1. Check if API shape changed (endpoints, fields, error codes).
   - If yes → update `docs/api/API_CONTRACTS.md` + CHANGELOG.

2. Check if business meaning or proof semantics changed.
   - If yes → update relevant `docs/product/context_*.md` or `MASTER_CONTEXT_*`.

3. Check if platform capabilities changed from 🟡/⛔ to ✅ или наоборот.
   - If yes → update `docs/execution/PROJECT_STATE.md`.

4. Only if all three points reviewed → task is considered **done**.

---

## 7. Hard Boundaries for AI Agents

AI agents **must NOT**:

- вводить новые продукты или модули, противоречащие Vision;
- менять lifecycle `scheduled → in_progress → completed`;
- ослаблять proof (делать evidence опциональным там, где оно базовое);
- превращать платформу в:
  - таск-трекер,
  - CMMS,
  - систему учёта кадров/зарплат,
  - систему управления проектами.

При конфликте между “удобнее для кода” и “правильно для платформы”  
агент обязан выбрать **правильно для платформы**.

---

## 8. How to Extend the AI Team

Новые роли могут добавляться только если:

1. Они **не дублируют** существующую роль.
2. Их зона ответственности **привязана к слоям документов**:
   - product / GTM → может появиться `sales_copilot` (см. docs/sales).
   - data / BI → отдельный data-агент, но поверх существующей Analytics.

Любая новая роль должна иметь:

- чётко описанную зону ответственности,
- список документов, на которые она опирается,
- список того, чем она **не занимается**.

---

## 9. Final Contract

For any AI agent operating in this repo:

> 1. Read Vision.  
> 2. Respect Context Rules.  
> 3. Treat contexts as configurations, not products.  
> 4. Keep proof core untouched.  
> 5. Sync code and docs honestly.

If following these rules conflicts with a user request,  
**the rules win**, and the request must be adjusted or declined.

---

## Status

- Document type: AI Orchestration Contract (CLOT)
- Scope: All AI agents working with Proof Platform
- Authority: `PROOF_PLATFORM_VISION.md`
- Change policy: Rare, only by explicit architectural decision
