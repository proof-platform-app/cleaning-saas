# PROOF TASK PROTOCOL v1.0

Status: Active
Scope: All repository-changing tasks
Applies to: All Claude Code execution agents

---

## 1. Purpose

This document defines the mandatory execution protocol for all tasks that modify the repository.

No task is considered complete unless all protocol steps are executed.

---

## 2. When This Protocol Is Required

This protocol MUST be used when:

- Creating new files
- Updating existing files
- Refactoring documents
- Adding documentation
- Modifying design system
- Changing API contracts
- Updating UI components
- Any task requiring git commit

This protocol is NOT required for:
- Brainstorming
- Architecture discussions
- Draft generation not persisted to repo

---

## 3. Mandatory Execution Flow

Every repository-changing task must follow this sequence:

### Step 1 — File Operation

- Ensure target directory exists
- Create or overwrite specified file
- No partial output
- No truncated content
- No placeholders

If modifying:
- Overwrite entire file unless explicitly instructed otherwise

---

### Step 2 — Filesystem Verification

Return:

```
ls -la <target-directory>
git status
```

---

### Step 3 — Git Commit

```
git add <file-path>
git commit -m "<clear conventional commit message>"
```

---

### Step 4 — Commit Verification

Return:

```
git log -1 --oneline
```

Must include commit hash.

---

### Step 5 — Final Output

Agent must return:

1. Short confirmation summary
2. File path created/modified
3. Git status
4. Commit hash
5. FULL file content (complete)

---

## 4. Constraints

- No commentary beyond scope
- No scope expansion
- No hidden changes
- No modification of unrelated files
- No diff-only output (must return full file)
- No skipping git verification

---

## 5. Failure Conditions

Task is considered FAILED if:

- File not physically created
- File truncated
- Git commit not executed
- Commit hash not returned
- Additional files modified without instruction

---

## 6. Governance

This document overrides informal task execution.

If a task conflicts with this protocol, the protocol wins.

---

End of Document
