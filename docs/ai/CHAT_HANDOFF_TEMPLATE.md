# CHAT HANDOFF TEMPLATE — Proof Platform

This template is used when starting a **new chat (ChatGPT / Claude / Claude Code)**  
to ensure full continuity, correct context, and architectural safety.

Copy this template into a new chat and fill in the variable sections.

---

## 1. Project Identity

- Project name: **Proof Platform**
- Repository: `Cleaning-saas`
- Branch: `main`
- Platform type: **Single veri  fication platform with multiple operational contexts**
- Core principle: **One proof engine, multiple configurations**

---

## 2. Authoritative Documents (Must Read First)

The following documents define the system and must be treated as **source of truth**:

### Vision & Guardrails
- `docs/vision/PROOF_PLATFORM_VISION.md`
- `docs/product/CONTEXT_RULES.md`

### Operational Contexts
- `docs/product/context_cleaning.md`
- `docs/product/context_property.md`
- `docs/product/context_maintenance.md`
- `docs/product/context_fitout.md`

### Product & Architecture
- `docs/product/MASTER_BRIEF.md`
- `docs/architecture/PROJECT_CONTEXT.md`
- `docs/architecture/PLATFORM_STRUCTURE.md`
- `docs/architecture/PROOF_PLATFORM_EXTENSION.md`

### Execution & State
- `docs/execution/DEV_BRIEF.md`
- `docs/execution/PROJECT_STATE.md`
- `docs/execution/DEV_QUICKSTART.md`
- `docs/execution/QA_CHECKLIST.md`

### API & Analytics
- `docs/api/API_CONTRACTS.md`
- `docs/analytics/ANALYTICS_API_V1.md`

### AI Orchestration
- `docs/ai/CLOT.md`
- `docs/DOCS_INDEX.md`

If there is any conflict between assumptions and these documents,  
**the documents win**.

---

## 3. Current Project State (Fill In)

**Last known state of the project:**

- Platform vision: ✅ fixed
- Documentation structure: ✅ fixed
- Operational contexts: ✅ defined
- AI orchestration (CLOT): ✅ active
- Code status: ⬜ / 🟡 / ✅ (specify)

**Last commit hash (if relevant):**
```

<commit-hash>
```

---

## 4. What Has Already Been Done

Brief factual summary (no plans, no wishes):

* Example:

  * Documentation architecture finalized
  * Proof Platform Vision fixed
  * Context rules and 4 operational contexts created
  * AI orchestration contract (CLOT) added
  * Docs fully synced and committed

(Adjust to actual state.)

---

## 5. What We Are Doing Now

**Current focus:**

> <Describe the single current objective in 1–2 sentences>

Examples:

* “Preparing AI workflow documentation for effective Claude Code usage.”
* “Aligning PROJECT_STATE with actual backend implementation.”
* “Designing next incremental improvement without violating Vision.”

---

## 6. What Must NOT Be Changed

The following are **non-negotiable**:

* Platform vision (`PROOF_PLATFORM_VISION.md`)
* Context Rules (`CONTEXT_RULES.md`)
* Core lifecycle: `scheduled → in_progress → completed`
* Single proof engine (no per-context engines)
* Immutable evidence after completion

Any proposal violating these must be rejected or reframed.

---

## 7. Rules for This Chat

This chat must:

* Respect the Proof Platform vision and architecture.
* Treat operational contexts as **configurations**, not products.
* Sync documentation if behavior changes.
* Prefer minimal, composable changes.
* Avoid speculative features and future hypotheticals unless explicitly requested.

---

## 8. Expected Outcome of This Chat

By the end of this chat, we expect:

* <Clear outcome 1>
* <Clear outcome 2>

If the chat drifts from these outcomes, it must be corrected.

---

## 9. Language & Interaction Rules

* Language: English for docs and code, Russian allowed for discussion.
* No hallucinated features.
* No silent assumptions.
* If context is missing — ask before acting.

---

## 10. Confirmation

Before proceeding, confirm:

> “I have read and understood the Proof Platform Vision, Context Rules, and CLOT.”

Only after this confirmation may work begin.

