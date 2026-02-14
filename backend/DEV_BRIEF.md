# Developer Brief

Backend documentation for CleanProof/MaintainProof Django application.

---

## Changelog

### 1.1.0 - 2026-02-15

NEW: Introduced `Job.context` as explicit separator between Cleaning and Maintenance.
- Field location: `apps/jobs/models.py:51-57`
- Migration: `0009_add_job_context.py`

NEW: Added cross-context guardrail tests.
- Test file: `apps/api/tests.py` (class `CrossContextGuardrailTests`)
- 4 test cases for context isolation verification

CHANGED: Filtering strategy for manager job endpoints.
- All cleaning endpoints now filter by `context=Job.CONTEXT_CLEANING`
- Maintenance endpoint filters by `context=Job.CONTEXT_MAINTENANCE`

---

## Cross-Context Smoke Checklist

Use this checklist after any changes to job filtering or context logic.

### Invariants Check (2 min)

- [ ] Cleaning UI/routes unchanged
- [ ] RBAC/lifecycle unchanged
- [ ] Error format unchanged (`{code, message, fields?}`)
- [ ] Maintenance additions are additive (no breaking changes)

### Cross-Context Smoke (5 min)

After deploying changes, verify these pages load without errors:

1. **Login** as manager/owner

2. **Cleaning Context:**
   - [ ] `/dashboard` - loads, shows only cleaning jobs
   - [ ] `/jobs` - loads, shows cleaning jobs list
   - [ ] `/jobs/planning` - loads, shows planning view

3. **Maintenance Context:**
   - [ ] `/maintenance/dashboard` - loads (if exists)
   - [ ] `/maintenance/visits` - loads, shows only maintenance visits

4. **Error checks:**
   - [ ] No 500 errors in any page
   - [ ] No 403 errors (unless expected for role)
   - [ ] No unexpected empty states (cleaning showing 0 when jobs exist)

**If any check fails:** STOP. The task is not complete.

---

## Guardrail Tests

Run the guardrail tests to verify context isolation:

```bash
# Run all tests
python manage.py test apps.api.tests.CrossContextGuardrailTests -v2

# Run specific test
python manage.py test apps.api.tests.CrossContextGuardrailTests.test_cleaning_does_not_show_maintenance_jobs -v2
```

### Test Cases

| Test | Description |
|------|-------------|
| `test_cleaning_jobs_endpoints_return_200` | All cleaning endpoints must return 200 |
| `test_maintenance_service_visits_return_200` | Maintenance endpoint must return 200 |
| `test_cleaning_does_not_show_maintenance_jobs` | Cleaning endpoints must NOT return maintenance jobs |
| `test_maintenance_does_not_show_cleaning_jobs` | Maintenance endpoint must NOT return cleaning jobs |

---

## Context Separation Architecture

### Field Definition

```python
# apps/jobs/models.py
class Job(models.Model):
    CONTEXT_CLEANING = "cleaning"
    CONTEXT_MAINTENANCE = "maintenance"

    context = models.CharField(
        max_length=32,
        choices=CONTEXT_CHOICES,
        default=CONTEXT_CLEANING,
        db_index=True,
    )
```

### Filtering Rules

**Cleaning endpoints:**
```python
Job.objects.filter(
    company=company,
    context=Job.CONTEXT_CLEANING,  # Explicit filter
    ...
)
```

**Maintenance endpoints:**
```python
Job.objects.filter(
    company=company,
    context=Job.CONTEXT_MAINTENANCE,  # Explicit filter
    ...
)
```

### IMPORTANT: Asset Field is NOT a Context Separator

The `asset` field on Job is for tracking which asset a service visit is for.
It does **NOT** determine context:

```python
# WRONG - Do not use this for context separation
Job.objects.filter(asset__isnull=False)  # Does not mean maintenance

# CORRECT - Use explicit context field
Job.objects.filter(context=Job.CONTEXT_MAINTENANCE)
```

---

## Endpoints Reference

### Cleaning Context Endpoints

| Endpoint | Method | Filter |
|----------|--------|--------|
| `/api/manager/jobs/today/` | GET | `context=cleaning` |
| `/api/manager/jobs/active/` | GET | `context=cleaning` |
| `/api/manager/jobs/planning/` | GET | `context=cleaning` |
| `/api/manager/jobs/history/` | GET | `context=cleaning` |
| `/api/manager/jobs/export/` | GET | `context=cleaning` |
| `/api/manager/jobs/` | POST | Accepts `context` param |
| `/api/manager/jobs/<id>/` | GET | No filter (single job) |

### Maintenance Context Endpoints

| Endpoint | Method | Filter |
|----------|--------|--------|
| `/api/manager/service-visits/` | GET | `context=maintenance` |
| `/api/manager/assets/<id>/visits/` | GET | By asset FK |
| `/api/manager/assets/` | GET/POST | No context filter |
| `/api/manager/asset-types/` | GET/POST | No context filter |
| `/api/manager/maintenance-categories/` | GET/POST | No context filter |

---

## Running Tests

```bash
# All tests
python manage.py test -v2

# API tests only
python manage.py test apps.api.tests -v2

# Jobs tests only
python manage.py test apps.jobs.tests -v2

# Guardrail tests only
python manage.py test apps.api.tests.CrossContextGuardrailTests -v2
```

---

## Migration Reference

### 0009_add_job_context.py

Adds `Job.context` field with backfill:

```python
def backfill_context(apps, schema_editor):
    Job = apps.get_model("apps_jobs", "Job")

    # Jobs with asset -> maintenance
    Job.objects.filter(asset__isnull=False).update(context="maintenance")

    # Jobs without asset -> cleaning
    Job.objects.filter(asset__isnull=True).update(context="cleaning")
```

**Apply migration:**
```bash
python manage.py migrate apps_jobs
```
