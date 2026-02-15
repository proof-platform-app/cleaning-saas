# API Contracts

This document tracks API contract changes for the CleanProof/MaintainProof backend.

**Rules:**
- Entries are added at the TOP (newest first)
- Use format: `X.Y.Z - YYYY-MM-DD`
- Tags: `NEW:`, `CHANGED:`, `FIXED:`, `BREAKING:` (if applicable)
- Document any filtering behavior changes

---

## Changelog

### 1.2.0 - 2026-02-15

**Standardized Job Completion Error Format (Platform Invariant)**

NEW: `JOB_COMPLETION_BLOCKED` error code for job check-out failures.
- Endpoint: `POST /api/jobs/<id>/check-out/`
- HTTP Status: 400

**Error payload structure:**
```json
{
  "code": "JOB_COMPLETION_BLOCKED",
  "message": "Cannot complete job",
  "fields": {
    "status": "must_be_in_progress",
    "photos.before": "required",
    "photos.after": "required",
    "checklist.required": [1, 2, 3]
  }
}
```

**Field conditions:**
- `status` - included when job status is not `in_progress`
- `photos.before` - included when before photo is missing
- `photos.after` - included when after photo is missing
- `checklist.required` - included when required checklist items are incomplete (contains list of item IDs)

**Platform invariant:** All validation errors on this endpoint use `{code, message, fields?}` format.
- No `{detail: ...}` responses allowed
- Fallback errors use `code: "VALIDATION_ERROR"`

---

### 1.1.0 - 2026-02-15

**Context Separation Implementation (Cross-Context Guardrails v1)**

NEW: `Job.context` field introduced as explicit cross-context separator.
- Allowed values: `cleaning`, `maintenance`
- Default: `cleaning`
- Indexed field for performance

CHANGED: Cleaning job endpoints now filter by `Job.context="cleaning"`.
- `/api/manager/jobs/today/` - returns only cleaning context jobs
- `/api/manager/jobs/active/` - returns only cleaning context jobs
- `/api/manager/jobs/planning/` - returns only cleaning context jobs
- `/api/manager/jobs/history/` - returns only cleaning context jobs
- `/api/manager/jobs/export/` - exports only cleaning context jobs

CHANGED: Maintenance service-visits endpoint filters by `Job.context="maintenance"`.
- `/api/manager/service-visits/` - returns only maintenance context jobs

CHANGED: Job creation via `/api/manager/jobs/` accepts optional `context` field.
- Default: `cleaning`
- Maintenance UI should explicitly pass `context: "maintenance"`

FIXED: Maintenance jobs no longer appear in Cleaning endpoints.
- Previously could leak through if `asset IS NOT NULL` was used as separator
- Now uses explicit `context` field

**Migration notes:**
- Migration `0009_add_job_context` adds field with backfill
- Existing jobs with `asset IS NOT NULL` backfilled to `context="maintenance"`
- Existing jobs with `asset IS NULL` backfilled to `context="cleaning"`

**Backward compatibility:**
- `context IS NULL` treated as `cleaning` during transitional phase
- No breaking changes to existing API response formats

---

### 1.0.0 - Initial Release

Initial API implementation.
