# PLATFORM LAYER v1 — DEFINITION OF DONE

**Status:** LOCKED
**Version:** 1.0
**Last Updated:** 2026-02-12

This document defines the stable baseline for Platform Layer v1 and acts as an architectural guardrail against uncontrolled scope expansion.

---

## 1. Scope

Platform Layer v1 includes:

- **Authentication system** (token-based, Django Token Authentication)
- **User roles:** owner, manager, staff, cleaner
- **Standardized error format:** `{code, message, fields?}`
- **Deterministic API payload guarantees** (all keys present, null if no value)
- **RBAC enforcement** across Settings and Billing endpoints
- **Settings API v1.1** (Account + Billing MVP)
  - Profile management (GET/PATCH /api/me)
  - Password change (password-auth only, SSO → 403)
  - Notification preferences (auto-save)
  - Billing summary (plan, status, usage, payment method stub, invoices stub)
  - Invoice download endpoint (501 NOT_IMPLEMENTED stub)
  - RBAC: Owner (full), Manager (read-only billing), Staff/Cleaner (403 blocked)
- **Trial lifecycle** + usage-summary (jobs/cleaners limits)
- **Verification discipline:**
  - `backend/verify_rbac.sh` — automated RBAC verification
  - `docs/settings/VERIFICATION_CHECKLIST.md` — manual QA checklist

**Reference documents:**
- `docs/api/API_CONTRACTS.md` — API contract (section 9: Settings API)
- `docs/execution/DEV_BRIEF.md` — Settings v1.1 implementation details
- `docs/execution/PROJECT_STATE.md` — current state tracker

---

## 2. Core Invariants (Locked)

The following **cannot change** in Platform Layer v1 without explicit version bump:

### 2.1. Role Model
- Four roles: `owner`, `manager`, `staff`, `cleaner`
- **Owner uniqueness:** exactly one Owner per company (first user = Owner)
- RBAC matrix for Settings/Billing endpoints
- Role-based visibility (e.g., Staff cannot see Billing link)
- Management command `ensure_company_owner` for data integrity

### 2.2. Error Response Structure
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "fields": { "field_name": ["error message"] }  // optional, validation only
}
```

Standard codes: `VALIDATION_ERROR` (400), `FORBIDDEN` (403), `NOT_IMPLEMENTED` (501), `UNAUTHENTICATED` (401)

### 2.3. Billing Semantics
- Billing page shows plan, status, usage, payment method stub, invoices stub
- Invoice download returns **501 NOT_IMPLEMENTED** (no payment provider integration)
- Payment method is a stub (UI ready, backend not connected to provider)

### 2.4. Trial State Logic
- Trial lifecycle: active → expired
- Usage limits: jobs/cleaners
- Enforcement codes: `trial_expired`, `trial_jobs_limit_reached`, `company_blocked`

### 2.5. Deterministic Payload Guarantees
- All API responses include all keys (never omit keys)
- Use `null` or `[]` for missing/empty values

### 2.6. Lifecycle Invariants
- Settings API endpoints are stable
- RBAC enforcement is consistent
- Verification scripts must pass before deployment

**Change requirement:** Any modification requires version bump, changelog, contract review, verification update.

---

## 3. Explicitly NOT Included in v1

Platform Layer v1 **does not include**:

- ❌ Payment provider integration (Stripe, Paddle, etc.)
- ❌ Real invoice generation
- ❌ Live subscription lifecycle management
- ❌ Payment webhooks
- ❌ Provider-specific logic
- ❌ 2FA / MFA
- ❌ Session management (logout, session expiry, refresh tokens)
- ❌ Context-specific logic (Cleaning vs Fit-out vs Property business rules)
- ❌ New roles beyond owner/manager/staff/cleaner
- ❌ Email verification
- ❌ Password reset flow
- ❌ Organization-level settings
- ❌ Team invites

---

## 4. Change Policy

Any modification to Platform Layer v1 requires:

1. Update this document (version + changelog)
2. Update API_CONTRACTS.md
3. Update PROJECT_STATE.md
4. Update verification checklist
5. Pass verification scripts (`backend/verify_rbac.sh`)

**Breaking changes:**
- Must bump version (v1 → v2)
- Must be marked as `BREAKING` in changelog
- Must update all dependent documentation

---

## 5. Relationship to Operational Contexts

**Platform Layer is context-neutral.**

Operational contexts (Cleaning, Fit-out, Maintenance, Property) **must not modify** Platform Layer invariants:
- Cannot change role model
- Cannot change error format
- Cannot change billing semantics
- Cannot change RBAC rules

---

## 6. Verification Discipline

### Automated verification:
```bash
cd backend
./verify_rbac.sh
```

Expected: Owner/Manager/Staff RBAC passes, invoice 501 stub verified, error format standardized.

### Manual verification:
Follow `docs/settings/VERIFICATION_CHECKLIST.md`

---

## 7. Changelog

### v1.0 — 2026-02-12
- Initial definition of Platform Layer v1
- Locked core invariants (roles, errors, billing, trial, payloads)
- Established change policy
- Formalized verification discipline

---

**END OF DOCUMENT**
