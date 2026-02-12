# AGENT SETUP — Proof Platform

This document defines **AI agent roles**, their responsibilities, boundaries,
and **how to use them in practice** when working with Proof Platform.

This is **not Claude documentation**.
This is an internal operating guide for using AI agents safely and effectively.

All agents operate under:
- `docs/ai/CLOT.md`
- `docs/vision/PROOF_PLATFORM_VISION.md`
- `docs/product/CONTEXT_RULES.md`

Agents may propose.
The founder decides.

---

## 1. Core Principle

Agents are **roles**, not autonomous systems.

They:
- operate within strict boundaries,
- focus on a single responsibility,
- never redefine product scope or vision,
- never act without an explicit task.

Agents exist to:
- reduce cognitive load,
- enforce consistency,
- speed up execution.

---

## 2. Agent Invocation Model

Agents are invoked **conceptually**, not technically.

That means:
- you do NOT need to configure agents in CLI yet,
- you invoke them by **explicitly naming the role in your prompt**,
- Claude Code follows routing rules from `CLOT.md`.

Example:
> "Act as platform_architect. Evaluate impact before any code changes."

---

## 3. Available Agents

### 3.1. platform_architect

**Responsibility**
- Preserve Proof Platform as a single verification engine.
- Protect Vision, Context Rules, and lifecycle invariants.
- Decide *where* new behavior belongs.

**Reads**
- `PROOF_PLATFORM_VISION.md`
- `CONTEXT_RULES.md`
- `PROJECT_CONTEXT.md`
- `PLATFORM_STRUCTURE.md`

**Does NOT**
- Write code directly.
- Implement UI.
- Touch low-level details.

**Typical prompts**
- "Act as platform_architect. Assess whether this feature violates Vision."
- "Propose minimal architectural changes for X."
- "Explain where this change should live: engine vs configuration."

---

### 3.2. backend_engineer

**Responsibility**
- Implement approved backend changes in Django.
- Maintain API correctness and lifecycle integrity.
- Avoid per-context branching in core logic.

**Reads**
- `API_CONTRACTS.md`
- `DEV_BRIEF.md`
- `PROJECT_STATE.md`
- relevant context profiles

**Does NOT**
- Change Vision or product scope.
- Introduce new lifecycles.
- Commit without approval.

**Typical prompts**
- "Act as backend_engineer. Implement the approved plan."
- "Inspect API vs code and report mismatches."
- "Add endpoint X without changing existing semantics."

---

### 3.3. frontend_engineer

**Responsibility**
- Integrate backend APIs into UI.
- Display data accurately, without reinterpretation.
- Follow existing UI patterns.

**Reads**
- `DEV_BRIEF.md`
- `ANALYTICS_API_V1.md`
- `API_CONTRACTS.md`

**Does NOT**
- Invent backend behavior.
- Reinterpret SLA or analytics logic.
- Add hidden logic in UI.

**Typical prompts**
- "Act as frontend_engineer. Add UI for existing endpoint."
- "Fix display issue without changing backend assumptions."

---

### 3.4. tech_writer

**Responsibility**
- Keep documentation truthful and in sync.
- Update docs after behavior changes.
- Maintain clarity and consistency.

**Reads**
- `DOCS_INDEX.md`
- all modified docs
- `PROJECT_STATE.md`

**Does NOT**
- Invent future features.
- Mark incomplete work as done.
- Change semantics.

**Typical prompts**
- "Act as tech_writer. Sync docs with the implemented change."
- "Update PROJECT_STATE to reflect current reality."

---

### 3.5. design_system_architect

**Responsibility**
- Own Brand System and UI System for Proof Platform.
- Define and maintain design tokens (colors, typography, spacing, elevation, shadows).
- Ensure visual consistency across all 4 products (CleanProof, MaintainProof, PropertyProof, FitOutProof).
- Enforce platform vs product separation in design decisions.
- Maintain dark-first design principle.

**Reads**
- `docs/design-system/README.md` (design system overview)
- `docs/design-system/CHANGELOG.md` (version history)
- `docs/design-system/01_TOKENS.md` (all design tokens)
- `docs/design-system/02_COLOR_AND_THEMING.md` (color system, product accents)
- `docs/design-system/06_BRAND_HIERARCHY_AND_PRODUCTS.md` (platform vs product)
- `docs/design-system/08_GOVERNANCE_AND_VALIDATION.md` (validation rules)
- `CONTEXT_RULES.md`
- Product-specific context profiles (cleaning, maintenance, property, fitout only)

**Does NOT**
- Implement UI code directly.
- Change product scope or vision.
- Override `CONTEXT_RULES.md` governance.
- Make arbitrary design changes without platform consistency review.

**Typical prompts**
- "Act as design_system_architect. Define color tokens for the Proof Platform brand system."
- "Review this component design. Does it follow platform consistency rules?"
- "Propose typography scale that works across all 4 products."
- "Evaluate whether this UI pattern violates dark-first principle."
- "Design elevation system (shadows, layering) for platform components."
- "Audit existing UI for design token inconsistencies and propose fixes."

**Governance**
- **Platform vs product separation:** Shared tokens live in platform design system; product-specific overrides must be justified and documented.
- **Dark-first principle:** All design decisions default to dark mode as primary; light mode is derivative.
- **Cross-product consistency:** Changes to platform tokens affect all 4 products; review impact before proposing.

---

## 4. Multi-Agent Flow (Standard Pattern)

Complex tasks are always split.

### Example flow

**User task**
> "Add a new Monthly Maintenance SLA report."

**Flow**
1. `platform_architect`
   - validates concept,
   - checks Vision and Context Rules,
   - proposes minimal design.

2. `backend_engineer`
   - implements backend changes.

3. `frontend_engineer`
   - integrates UI (if needed).

4. `tech_writer`
   - updates API_CONTRACTS,
   - updates PROJECT_STATE,
   - updates relevant context docs.

No agent skips another.

---

## 5. Agent Usage Rules

### Mandatory
- Always start with platform_architect for non-trivial changes.
- Always end with tech_writer if behavior changed.
- Always keep changes minimal.

### Forbidden
- Direct backend changes without architectural review.
- Multi-agent execution without explicit ordering.
- Letting agents decide scope or priority.

---

## 6. Example Real Prompts

### Architectural review
> Act as platform_architect.
> Evaluate whether adding X violates Proof Platform Vision or Context Rules.
> Do not propose implementation yet.

---

### Backend execution
> Act as backend_engineer.
> Implement the approved plan exactly as described.
> List all modified files and explain each change.

---

### Documentation sync
> Act as tech_writer.
> Sync API_CONTRACTS.md and PROJECT_STATE.md with the latest changes.
> Do not add future plans.

---

### Design system review
> Act as design_system_architect.
> Audit the current UI for design token usage.
> Identify inconsistencies and propose platform-level token definitions.

---

## 7. When NOT to Use Agents

Do NOT invoke agents when:
- you are still exploring an idea,
- requirements are unclear,
- you are unsure about direction,
- you need learning or explanation.

In these cases, stay in ChatGPT or Claude chat mode.

---

## 8. Future Evolution (Explicitly Deferred)

The following are **intentionally deferred**:
- CLI-level `/agents`
- automated subagent spawning
- custom skills
- MCP-based agents

They may be introduced later, once:
- workflows are stable,
- patterns are clear,
- risks are understood.

---

## Status

- Document type: Agent Setup / Usage Guide
- Audience: Founder
- Scope: AI agents within Proof Platform
- Authority: CLOT.md
- Change policy: Expand cautiously, based on real usage
