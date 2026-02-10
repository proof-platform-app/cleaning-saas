# CLAUDE CODE PLAYBOOK — Proof Platform

This document is a **practical guide** for working with Claude Code  
inside VS Code and terminal while developing Proof Platform.

It answers:
- how to start work,
- what commands to give,
- how to structure tasks,
- how to avoid common mistakes.

This is **not Claude documentation** — this is **our internal playbook**.

---

## 1. What Claude Code Is Used For (In This Project)

Claude Code is used as:

- a controlled executor over the repository,
- a reader and editor of code and documentation,
- a helper for running commands and inspecting results,
- an orchestrator for AI agents (via CLOT rules).

Claude Code is **not** used for:
- defining product vision,
- inventing features,
- autonomous refactors,
- committing without approval.

---

## 2. Where Claude Code Operates

Claude Code operates inside:

- VS Code workspace,
- terminal in project root (`Cleaning-saas/`).

All commands and file paths are **relative to repo root** unless stated otherwise.

---

## 3. Before You Start Any Task (Mandatory)

Before giving Claude Code a task, always state:

1. **Goal**
2. **Scope**
3. **Files allowed to change**
4. **Files that must NOT change**
5. **Docs that must be synced if behavior changes**

### Example (good instruction)

> Goal: add a new analytics endpoint for monthly SLA summary  
> Scope: backend only  
> Allowed files: apps/api/analytics_views.py, API_CONTRACTS.md  
> Must NOT change: lifecycle, proof rules  
> Docs to sync: API_CONTRACTS.md, PROJECT_STATE.md

---

## 4. Standard Command Patterns

### 4.1. Exploration / Read-Only Tasks

Use when you want understanding before changes.

Examples:
- “Scan the repo and explain how SLA is computed.”
- “Find where job lifecycle transitions are enforced.”

Typical Claude actions:
- `ls`
- `grep`
- `cat`
- reading multiple files

👉 **Never allow write access at this stage.**

---

### 4.2. Planning Tasks (No Code Changes)

Use when you want a proposal first.

Examples:
- “Propose how to add X without breaking Vision.”
- “Suggest minimal schema changes.”

Expected output:
- written plan,
- list of files,
- risks,
- doc impact.

👉 Only after approval do you move to execution.

---

### 4.3. Execution Tasks (Controlled Changes)

Use only after plan approval.

Typical instruction format:

> Implement the approved plan.  
> Make minimal changes.  
> Do not refactor unrelated code.  
> Report all modified files.

Claude Code may:
- edit files,
- run dev commands,
- show diffs.

Claude Code must:
- explain *why* each change exists.

---

## 5. Common Terminal Commands Claude May Run

Allowed:
```bash
ls
cat <file>
grep -R "pattern" .
python manage.py runserver
python manage.py test
npm run dev
git diff
````

Forbidden unless explicitly allowed:

```bash
git commit
git push
rm -rf
database migrations without review
```

---

## 6. Working With Documentation Files

Claude Code may edit docs only when:

* behavior changed,
* API shape changed,
* semantics changed,
* PROJECT_STATE status must be updated.

Required behavior:

* update content,
* keep structure intact,
* add CHANGELOG entries where required.

Claude Code must never:

* invent future plans,
* mark things as done when they are not.

---

## 7. Using Claude Code With AI Agents

When invoking agents via Claude Code:

* agents follow `docs/ai/CLOT.md`,
* routing is role-based (architect → backend → frontend → docs),
* agents may propose, not decide.

### Example

> Use platform_architect to assess impact, then backend_engineer to implement, then tech_writer to sync docs.

---

## 8. Typical Mistakes to Avoid

* Asking Claude Code to “just improve” something.
* Letting Claude refactor large files without approval.
* Skipping documentation sync.
* Trusting Claude memory across sessions.
* Mixing planning and execution in one step.

If unsure — split the task.

---

## 9. Debugging With Claude Code

Good debugging prompt:

> Investigate why X behaves incorrectly.
> Do not change code yet.
> Identify the root cause and exact location.

Only after root cause is clear → allow fixes.

---

## 10. Commit Discipline

Claude Code must never commit unless explicitly instructed.

Recommended flow:

1. Claude prepares changes.
2. Founder reviews.
3. Founder commits manually or explicitly instructs Claude.

---

## 11. Learning Strategy (Important)

Because Claude Code is new for the founder:

* start with doc edits and small backend tasks,
* review every diff,
* document patterns that work well,
* add lessons learned to this playbook over time.

---

## 12. Definition of a Successful Claude Code Session

A session is successful if:

* the task is completed as intended,
* no architectural boundaries are crossed,
* documentation remains truthful,
* the founder understands the result.

Speed without control is failure.

---

## 13. Approved Claude Code Commands (Proof Platform)

### Default launch mode
claude --mode plan

### Allowed slash commands
/help
/clear
/compact
/context
/usage
/resume
/copy

### Explicitly forbidden on early stages
--mode auto
/mcp
/skills
custom system prompts via CLI
automatic commits

### Agent usage
Agents are defined conceptually in CLOT.md.
CLI-level /agents command is not used until AGENT_SETUP.md is finalized.

---
## Battle Scenarios

### Propose a New Analytics Report (Guardrail-Safe)

### Контекст (system / preamble)

> You are working inside **Proof Platform** — a single verification engine with multiple operational contexts.
>
> The platform principles are defined in:
>
> * `PROOF_PLATFORM_VISION.md`
> * `MASTER_CONTEXT_ANALYTICS.md`
> * `CONTEXT_RULES.md`
>
> Analytics is a **read-only operational layer**.
> It aggregates completed, immutable proof data.
>
> Analytics must NEVER:
>
> * introduce business logic,
> * modify execution behavior,
> * predict, score, or recommend actions,
> * turn into BI, CMMS, HR, or PM tooling.

---

### Задача (user prompt)

> Propose a **new Analytics report** that:
>
> * works for **ALL operational contexts**
>   (Cleaning, Property, Maintenance, Fit-out),
> * uses **only existing execution + SLA data**,
> * respects all Analytics guardrails,
> * strengthens operational transparency,
> * helps identify **systemic issues**, not individual blame.
>
> The report must be:
>
> * strictly read-only,
> * derived only from completed jobs,
> * based on actual execution timestamps,
> * explainable without introducing new concepts.

---

### Формат ответа (обязателен)

Claude **must respond using this exact structure**:

1. **Report Name**
   (neutral, non-marketing, operational)

2. **Primary Question Answered**
   (one managerial question this report answers)

3. **Why This Report Is Needed**
   (operational signal, not business insight)

4. **Data Sources Used**
   (explicit list of existing models / fields)

5. **Metrics Included**
   (clear, minimal, guardrail-safe)

6. **Aggregation Logic**
   (time range, grouping, exclusions)

7. **How This Report Works Across Contexts**
   (explain why it is context-agnostic)

8. **What This Report Does NOT Do**
   (explicit non-goals to prevent scope creep)

9. **Guardrail Check**
   Confirm explicitly:

   * no execution logic added
   * no SLA recomputation
   * no recommendations
   * no scoring or ranking beyond existing metrics

---

### Explicit Constraints (hard rules)

Claude must NOT:

* introduce new entities or tables,
* suggest ML / AI / scoring,
* propose alerts or automation,
* mention forecasting or optimization,
* assume changes to UI or workflows.

If any of these are required — the report must be rejected.

---

### Acceptance Criteria

The proposal is valid **only if**:

* it could be implemented **purely as a backend read-only endpoint**,
* it could be added without changing `API_CONTRACTS.md`,
* it would not require changes to execution or SLA logic,
* it would still make sense if industry labels were removed.

---

### Closing Instruction

> If the proposed report violates any rule above,
> you must explicitly state **“This report is invalid under Proof Platform constraints.”**

---

## Battle Scenarios

### Propose a Context-Specific Feature (Invariant-Safe)

### Контекст (system / preamble)

> You are working inside **Proof Platform** — a single verification engine with multiple operational contexts.
>
> Platform invariants are defined in:
>
> * `PROOF_PLATFORM_VISION.md`
> * `CONTEXT_RULES.md`
> * `ANALYTICS_EXTENSION_RULES.md`
>
> Operational contexts are **configurations**, not products.
> No context may introduce new lifecycles, engines, or logic forks.

---

### Задача (user prompt)

> Propose a **new feature for ONE operational context**
> (Cleaning OR Property OR Maintenance OR Fit-out),
>
> such that:
>
> * the feature delivers **clear, context-specific value**,
> * it does **not modify** the core proof engine,
> * it does **not introduce** context-specific backend logic,
> * it works as **configuration or interpretation only**,
> * it would still be valid if the platform served 10 more contexts.
>
> The feature must strengthen the platform,
> not fragment it.

---

### Формат ответа (обязателен)

Claude **must respond using this exact structure**:

1. **Selected Context**
   (explicitly name ONE context)

2. **Problem This Context Faces**
   (business reality, not missing features)

3. **Proposed Feature (High-Level)**
   (describe in neutral, non-marketing language)

4. **How This Feature Uses the Existing Proof Engine**
   (explicit mapping to current concepts)

5. **Configuration Layer Only**
   Explain exactly:

   * what is configuration,
   * what remains untouched.

6. **Why This Feature Does NOT Require New Backend Logic**

7. **Why This Feature Works for Other Contexts in Principle**
   (even if not enabled)

8. **What This Feature Explicitly Does NOT Do**
   (anti-scope section)

9. **Invariant Check**
   Confirm explicitly:

   * no lifecycle changes
   * no new entities
   * no execution logic
   * no SLA recomputation
   * no analytics drift

---

### Hard Constraints (Non-Negotiable)

Claude must NOT:

* add new lifecycle states,
* introduce context-specific models or tables,
* fork API behavior by context,
* add workflow, ticketing, or task logic,
* propose pricing or packaging changes,
* assume UI redesign as the “solution”.

If any of these are required,
the feature must be rejected.

---

### Acceptance Criteria

A proposal is valid **only if**:

* it could be implemented via:

  * configuration,
  * templates,
  * interpretation,
  * or reporting semantics;
* it strengthens Proof Platform as a **standard**;
* it does not require a separate roadmap.

---

### Closing Instruction

> If the proposed feature violates any rule above,
> you must explicitly state:
>
> **“This feature is invalid under Proof Platform constraints.”**

---

## Status

* Document type: Claude Code Playbook
* Audience: Founder
* Scope: VS Code + Terminal usage
* Authority: CLOT.md, Vision, Context Rules
* Change policy: Evolve with experience

