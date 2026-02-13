# API Contracts v1.1

This document defines the canonical API contracts for CleanProof backend.

## Error Response Format

All error responses follow a unified structure:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "fields": {                    // Optional: validation errors
    "field_name": ["Error 1", "Error 2"]
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHENTICATED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | RBAC restriction or auth_type restriction |
| `NOT_IMPLEMENTED` | 501 | Feature not yet available |
| `access_denied` | 403 | Role-based access denied |
| `company_not_found` | 404 | User has no associated company |
| `validation_error` | 400 | Field-level validation error |

### Commercial Guard Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `trial_expired` | 403 | Trial period ended, upgrade required |
| `company_blocked` | 403 | Company explicitly blocked by admin |
| `trial_jobs_limit_reached` | 403 | Daily job limit reached (trial soft limit) |
| `trial_cleaners_limit_reached` | 403 | Cleaner count limit reached (trial soft limit) |
| `location_inactive` | 400 | Location is deactivated |
| `company_suspended` | 403 | Company account suspended |

## RBAC Matrix

### Roles

| Role | Code | Description |
|------|------|-------------|
| Owner | `owner` | Full administrative access, billing management |
| Manager | `manager` | Operations management, read-only billing |
| Staff | `staff` | Basic operations, no admin access |
| Cleaner | `cleaner` | Field worker, mobile app only |

### Account Endpoints

| Endpoint | Method | Owner | Manager | Staff | Cleaner |
|----------|--------|-------|---------|-------|---------|
| `/api/me/` | GET | 200 | 200 | 200 | 200 |
| `/api/me/` | PATCH | 200 | 200 | 200 | 200 |
| `/api/me/change-password/` | POST | 200* | 200* | 200* | 200* |
| `/api/me/notification-preferences/` | GET | 200 | 200 | 200 | 200 |
| `/api/me/notification-preferences/` | PATCH | 200 | 200 | 200 | 200 |

*403 for SSO users (`auth_type=sso`)

### Billing Endpoints

| Endpoint | Method | Owner | Manager | Staff | Cleaner |
|----------|--------|-------|---------|-------|---------|
| `/api/settings/billing/` | GET | 200 (`can_manage=true`) | 200 (`can_manage=false`) | 403 | 403 |
| `/api/settings/billing/invoices/:id/download/` | GET | 501 | 403 | 403 | 403 |

### Company Endpoints

| Endpoint | Method | Owner | Manager | Staff | Cleaner |
|----------|--------|-------|---------|-------|---------|
| `/api/company/` | GET | 200 | 200 | 403 | 403 |
| `/api/company/` | PATCH | 200 | 200 | 403 | 403 |
| `/api/company/cleaners/` | GET | 200 | 200 | 403 | 403 |
| `/api/company/cleaners/` | POST | 200 | 200 | 403 | 403 |
| `/api/company/cleaners/:id/` | PATCH | 200 | 200 | 403 | 403 |
| `/api/company/cleaners/:id/reset-access/` | POST | 200 | 200 | 403 | 403 |

### Jobs Endpoints (with Commercial Guards)

| Endpoint | Method | Owner | Manager | Staff | Cleaner |
|----------|--------|-------|---------|-------|---------|
| `/api/manager/jobs/` | GET | 200 | 200 | 200 | - |
| `/api/manager/jobs/` | POST | 200** | 200** | 200** | - |
| `/api/manager/jobs/:id/` | GET | 200 | 200 | 200 | - |
| `/api/manager/jobs/:id/` | PATCH | 200** | 200** | 200** | - |

**403 with `trial_expired` or `company_blocked` if company is blocked

## Trial Enforcement

### Trial Expired Semantics

When `company.is_trial_expired() == True`:

1. **Read operations** - ALLOWED (viewing jobs, reports, team)
2. **Write operations** - BLOCKED with 403:
   ```json
   {
     "code": "trial_expired",
     "detail": "Your free trial has ended. You can still view existing jobs and download reports, but creating new jobs requires an upgrade."
   }
   ```

### Affected Endpoints

| Action | When Blocked | Error Code |
|--------|--------------|------------|
| Create job | `POST /api/manager/jobs/` | `trial_expired` |
| Override job | `POST /api/manager/jobs/:id/override/` | `trial_expired` |
| Add cleaner | `POST /api/company/cleaners/` | `trial_expired` |

### Trial Soft Limits

During active trial, soft limits apply (warnings, not hard blocks):

| Resource | Limit | Code when exceeded |
|----------|-------|-------------------|
| Jobs per day | 20 | `trial_jobs_limit_reached` |
| Total cleaners | 5 | `trial_cleaners_limit_reached` |

## Plan Tiers

### Available Tiers

| Tier | Code | Price |
|------|------|-------|
| Standard | `standard` | $29/mo |
| Pro | `pro` | $79/mo |
| Enterprise | `enterprise` | $199/mo |

### API Fields

```json
{
  "plan": "active",           // trial | active | blocked
  "plan_tier": "pro",         // standard | pro | enterprise
  "is_trial_active": false,
  "is_trial_expired": false,
  "days_left": null
}
```

## Deterministic Payloads

All response keys are **always present**, never omitted:

### Billing Response
```json
{
  "can_manage": true,
  "plan": "active",
  "plan_tier": "pro",
  "status": "active",
  "trial_expires_at": null,
  "next_billing_date": null,
  "usage_summary": {
    "users_count": 5,
    "users_limit": null,
    "locations_count": 10,
    "locations_limit": null,
    "jobs_month_count": 150,
    "jobs_month_limit": null
  },
  "payment_method": null,
  "invoices": []
}
```

**Rules:**
- `null` for undefined values (not omitted)
- `[]` for empty arrays (not `null`)
- `*_limit: null` = unlimited (active plan)
- ISO 8601 for datetime strings

## Auth Type Restrictions

| Auth Type | Password Change | Email Change |
|-----------|-----------------|--------------|
| `password` | Allowed | Allowed |
| `sso` | 403 FORBIDDEN | 403 FORBIDDEN |

## Stub Endpoints

These endpoints return 501 NOT_IMPLEMENTED (not bugs):

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/settings/billing/invoices/:id/download/` | 501 | Invoice PDF download not yet implemented |
