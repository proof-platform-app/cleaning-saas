# First Paying Client Dry-Run Report

> **Date:** 2026-02-13
> **Environment:** Local development (DEBUG=True)
> **Verdict:** ALL STEPS PASSED

---

## Test Company Details

| Property | Value |
|----------|-------|
| Company Name | BluePalm Cleaning LLC |
| Company ID | 22 |
| Plan (final) | `active` (paid) |
| Plan Tier | `standard` |

---

## Test Users

| Role | Email | ID | Auth |
|------|-------|-----|------|
| Owner | owner+blp@test.com | 27 | password |
| Manager | manager+blp@test.com | 28 | password |
| Cleaner | Ahmed Cleaner (+971501111111) | 29 | PIN 1234 |
| Cleaner | Sara Cleaner (+971502222222) | 30 | PIN 5678 |

---

## Test Location & Jobs

| Entity | ID | Details |
|--------|-----|---------|
| Location | 14 | BluePalm HQ, 123 Palm Street, Dubai |
| Job (trial) | 70 | Ahmed @ BluePalm HQ, 2026-02-13 |
| Job (paid) | 71 | Ahmed @ BluePalm HQ, 2026-02-13 |

---

## Step-by-Step Results

### STEP 1: Create Company + Owner (Sales-Assisted Flow)

**Command:**
```bash
python manage.py create_company_with_owner \
  --company-name "BluePalm Cleaning LLC" \
  --owner-email "owner+blp@test.com" \
  --owner-name "BluePalm Owner" \
  --temp-password "testpass123!" \
  --plan trial
```

**Result:** PASS
- Company created with ID 22
- Owner created with ID 27
- 7-day trial started automatically
- Owner login returns token with role=owner
- Owner can access `/api/settings/billing/` with `can_manage: true`

---

### STEP 2: Owner Creates Manager

**Endpoint:** `POST /api/company/users/`

**Request:**
```json
{
  "email": "manager+blp@test.com",
  "full_name": "BluePalm Manager",
  "role": "manager"
}
```

**Result:** PASS
- Manager created with ID 28
- temp_password returned for secure delivery
- `must_change_password` enforced on first login
- After password change, Manager can login
- Manager sees billing with `can_manage: false` (read-only)

---

### STEP 3: Manager Sets Up Team

**Endpoints:**
- `POST /api/manager/locations/`
- `POST /api/manager/cleaners/`
- `POST /api/manager/jobs/`

**Result:** PASS

| Entity | ID | Created By |
|--------|-----|-----------|
| Location (BluePalm HQ) | 14 | Manager |
| Cleaner (Ahmed) | 29 | Manager |
| Cleaner (Sara) | 30 | Manager |
| Job #70 | 70 | Manager |

- All entities created successfully during active trial
- Usage counts updated correctly (users_count: 2, locations_count: 1)

---

### STEP 4: Trial Usage + Expiration Test

**Test:** Force trial expiry and verify job creation blocked

**Actions:**
1. Set `trial_expires_at` to yesterday
2. Attempt job creation

**Result:** PASS

**API Response (403):**
```json
{
  "code": "trial_expired",
  "detail": "Your free trial has ended. You can still view existing jobs..."
}
```

**Billing API Response:**
```json
{
  "is_paid": false,
  "is_trial_active": false,
  "is_trial_expired": true,
  "status": "past_due"
}
```

---

### STEP 5: Paid Activation (Manual)

**Command:**
```bash
python manage.py activate_paid_plan --company-id 22 --tier standard
```

**Result:** PASS
- Plan changed from `trial` to `active`
- Job creation now succeeds (Job #71 created)
- Billing API shows:
  - `is_paid: true`
  - `plan: active`
  - `status: active`
  - `is_trial_expired: false` (bypassed)

---

### STEP 6: Cleaner Login and Access Enforcement

**Endpoint:** `POST /api/auth/cleaner-login/`

**Request:**
```json
{
  "phone": "+971501111111",
  "pin": "1234"
}
```

**Result:** PASS

| Test | Expected | Actual |
|------|----------|--------|
| Login returns token | token + role=cleaner | PASS |
| `/api/jobs/today/` accessible | 2 jobs visible | PASS |
| `/api/manager/company/` blocked | 403 | PASS |
| `/api/settings/billing/` blocked | 403 FORBIDDEN | PASS |

---

## Issues Found

**NONE** - All flows completed successfully.

---

## Observations

1. **Password Reset Flow**: The `must_change_password` flag is enforced, requiring manual clearance for testing. In production, users would complete password change via UI flow.

2. **Trial Expiry Precision**: Trial uses `timezone.now() >= trial_expires_at` logic, so expiry happens the instant the timestamp is reached.

3. **Paid Bypass**: Setting `plan=active` immediately allows job creation regardless of `trial_expires_at` value.

4. **RBAC Enforcement**: All endpoints correctly block unauthorized roles with appropriate error messages.

---

## Test Data Cleanup

To reset for future dry-runs:
```bash
python manage.py shell -c "
from apps.accounts.models import Company, User
from apps.jobs.models import Job
from apps.locations.models import Location

Company.objects.filter(id=22).delete()
# Cascade deletes all related users, jobs, locations
print('BluePalm Cleaning LLC deleted')
"
```

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Company + Owner creation | PASS |
| 2 | Manager creation by Owner | PASS |
| 3 | Team setup (cleaners, location, job) | PASS |
| 4 | Trial expiration enforcement | PASS |
| 5 | Manual paid activation | PASS |
| 6 | Cleaner access restrictions | PASS |

**Final Verdict:** CleanProof is ready for first paying customer onboarding.

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-13 | Initial dry-run completed - all 6 steps passed |
