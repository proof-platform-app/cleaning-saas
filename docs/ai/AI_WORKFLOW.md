# AI WORKFLOW — Proof Platform

This document defines **how the founder works with AI systems**  
(ChatGPT, Claude, Claude Code) while building Proof Platform.

It is a **human workflow**, not an agent instruction.

Purpose:
- preserve architectural clarity,
- avoid chaos between tools,
- make AI work repeatable and scalable,
- reduce cognitive load for the founder.

---

## 1. Core Principle

AI is used as a **force multiplier**, not as an autonomous decision-maker.

The founder:
- defines direction,
- approves changes,
- owns architecture and vision.

AI:
- accelerates thinking,
- executes well-defined tasks,
- enforces consistency,
- reduces manual effort.

---

## 2. Tool Roles (Strict Separation)

### 2.1. ChatGPT

**Primary role:**  
Architecture, reasoning, planning, documentation design, learning.

Used for:
- defining platform vision and boundaries,
- designing documentation structure,
- thinking through product and architecture decisions,
- translating ideas into structured docs,
- learning new tools and approaches (Claude Code, agents).

ChatGPT **does not**:
- directly modify code,
- run commands,
- touch the repository.

---

### 2.2. Claude (Chat)

**Primary role:**  
Contextual reasoning and validation.

Used for:
- reviewing ideas or documents,
- sanity-checking architecture,
- discussing alternative approaches,
- high-level design questions.

Claude chat **does not**:
- directly operate on the repo,
- run terminal commands,
- replace Claude Code.

---

### 2.3. Claude Code (VS Code / Terminal)

**Primary role:**  
Execution and orchestration over the repository.

Used for:
- reading and modifying code,
- editing documentation files,
- running backend / frontend commands,
- creating diffs,
- coordinating AI agents.

Claude Code **does not**:
- invent product direction,
- override Vision or Context Rules,
- auto-commit without explicit instruction.

---

## 3. Standard Work Cycle

Every task follows this flow unless explicitly stated otherwise.

### Step 1. Formulate the task (ChatGPT)

- Define **what** needs to be done and **why**.
- Identify:
  - affected layer (architecture / product / execution / docs),
  - risk to Vision or Context Rules.
- Decide if this is:
  - thinking,
  - execution,
  - or both.

---

### Step 2. Prepare instructions for Claude Code

ChatGPT produces:
- a clear task description,
- expected outcome,
- constraints,
- list of files to inspect or modify,
- explicit rules (what must not change).

No execution happens here.

---

### Step 3. Execute in Claude Code

In VS Code / terminal:
- Claude Code reads the repo,
- performs changes,
- runs checks if needed,
- reports back:
  - what was changed,
  - where,
  - why.

Claude Code must follow:
- `docs/ai/CLOT.md`,
- platform Vision,
- Context Rules.

---

### Step 4. Review and validate (Human)

Founder:
- reviews changes,
- checks alignment with Vision and Context Rules,
- verifies no unintended scope expansion.

Only after this:
- approval is given,
- commit is created manually or with explicit instruction.

---

### Step 5. Sync documentation (Mandatory)

If behavior, API, or semantics changed:
- update `API_CONTRACTS.md`,
- update relevant context or MASTER_CONTEXT file,
- update `PROJECT_STATE.md`.

No task is considered **done** without this check.

---

## 4. Working With New Chats

When starting a new chat (any AI):

1. Use `docs/ai/CHAT_HANDOFF_TEMPLATE.md`.
2. Paste it into the new chat.
3. Fill in:
   - current state,
   - last commit,
   - current focus.

This ensures:
- continuity,
- no re-explaining,
- no architectural drift.

---

## 5. Working With AI Agents

AI agents are **not free actors**.

Rules:
- all agents operate under `docs/ai/CLOT.md`,
- agents do not redefine vision or scope,
- agents propose, founder decides.

Agents are invoked:
- only when a task is clear,
- only when outcome is defined,
- only within documented boundaries.

---

## 6. Safety Rules

The following are hard rules:

- Never let AI introduce new products or lifecycles.
- Never accept large refactors without architectural review.
- Never trust AI memory across chats — always rely on docs.
- Never skip documentation sync.

If something feels “too clever” — stop and review.

---

## 7. Learning Mode

Because the founder is learning AI agents and Claude Code:

- start with small tasks,
- prefer explicit instructions,
- review diffs line by line,
- document lessons learned in `CLAUDE_CODE_PLAYBOOK.md`.

The goal is **progressive confidence**, not blind automation.

---

## 8. Definition of “Done”

A task is done only if:

- the intended change is implemented,
- architecture remains intact,
- documentation is up to date,
- codebase is clean,
- founder understands what changed.

Speed without understanding is failure.

---

## Status

- Document type: AI Workflow / Operating Manual
- Audience: Founder only
- Scope: All AI-assisted work on Proof Platform
- Change policy: Evolve slowly, based on real experience
