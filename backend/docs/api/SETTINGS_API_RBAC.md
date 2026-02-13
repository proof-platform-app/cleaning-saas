# Settings API v1.1 - RBAC Matrix

This document defines Role-Based Access Control rules for Settings API endpoints.

## Roles
- **Owner**: Company owner with full administrative access
- **Manager**: Administrative user with read-only billing access
- **Staff**: Regular staff member (no billing access)
- **Cleaner**: Field worker (no settings access)

## RBAC Matrix

### Account Endpoints

| Endpoint | Method | Owner | Manager | Staff | Cleaner | Notes |
|----------|--------|-------|---------|-------|---------|-------|
| `/api/me/` | GET | 200 | 200 | 200 | 200 | All authenticated users can view their own profile |
| `/api/me/` | PATCH | 200 | 200 | 200 | 200 | All authenticated users can update their own profile |
| `/api/me/change-password/` | POST | 200/400/403 | 200/400/403 | 200/400/403 | 200/400/403 | 403 for SSO users, 400 for validation errors |

### Notification Endpoints

| Endpoint | Method | Owner | Manager | Staff | Cleaner | Notes |
|----------|--------|-------|---------|-------|---------|-------|
| `/api/me/notification-preferences/` | GET | 200 | 200 | 200 | 200 | All authenticated users can view preferences |
| `/api/me/notification-preferences/` | PATCH | 200 | 200 | 200 | 200 | All authenticated users can update preferences |

### Billing Endpoints

| Endpoint | Method | Owner | Manager | Staff | Cleaner | Notes |
|----------|--------|-------|---------|-------|---------|-------|
| `/api/settings/billing/` | GET | 200 (can_manage=true) | 200 (can_manage=false) | 403 | 403 | Only Owner/Manager roles allowed |
| `/api/settings/billing/invoices/:id/download/` | GET | 501 | 403 | 403 | 403 | Owner-only; Not implemented yet (501); Others get 403 |

## Response Examples

### 200 OK (Success)
```json
{
  "id": 1,
  "full_name": "John Doe",
  "email": "john@example.com"
}
```

### 400 Validation Error
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "fields": {
    "full_name": ["This field is required"],
    "phone": ["Invalid phone number format"]
  }
}
```

### 403 Forbidden (RBAC)
```json
{
  "code": "FORBIDDEN",
  "message": "Billing access restricted to administrators"
}
```

### 403 Forbidden (SSO)
```json
{
  "code": "FORBIDDEN",
  "message": "Password change not allowed for SSO users"
}
```

### 501 Not Implemented
```json
{
  "code": "NOT_IMPLEMENTED",
  "message": "Invoice download is not available yet"
}
```

## Deterministic Payloads

All endpoints return consistent JSON structures with all keys present:

### GET /api/settings/billing/
All keys are **always present**, even if values are `null` or `[]`:

```json
{
  "can_manage": true,
  "plan": "active",
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
- `can_manage`: Boolean (Owner=true, Manager=false)
- `payment_method`: Object if exists, `null` if not configured
- `invoices`: Empty array `[]` if no invoices
- `*_limit`: `null` for unlimited (active plans), number for trial plans
- `trial_expires_at`: ISO 8601 datetime string or `null`
- `next_billing_date`: ISO 8601 datetime string or `null`

### GET /api/me/notification-preferences/
All notification preference keys are always present:

```json
{
  "email_notifications": true,
  "job_assignment_alerts": true,
  "weekly_summary": false
}
```

## Auth Type Rules

### Password Change Restrictions
| Auth Type | Can Change Password | Response |
|-----------|---------------------|----------|
| `password` | Yes | 200 or 400 (validation) |
| `sso` | No | 403 FORBIDDEN |

## Testing

See `backend/verify_settings_api.sh` for automated endpoint verification.

For manual testing:
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/manager/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"testpass123!"}' | jq -r '.token')

# Test billing endpoint (Owner - should work)
curl -X GET http://localhost:8000/api/settings/billing/ \
  -H "Authorization: Token $TOKEN"

# Test with Staff user (should get 403)
STAFF_TOKEN=$(curl -s -X POST http://localhost:8000/api/manager/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@test.com","password":"testpass123!"}' | jq -r '.token')

curl -X GET http://localhost:8000/api/settings/billing/ \
  -H "Authorization: Token $STAFF_TOKEN"
```

## RBAC Smoke Test Script

A comprehensive automated RBAC regression test is available:

### Running the Test

```bash
cd backend
./verify_roles.sh
```

### What It Tests

The script performs 20 tests across all roles (Owner, Manager, Staff, Cleaner):

1. **Auth/Me endpoints** (5 tests)
   - GET /api/me - all roles can access
   - POST /api/me/change-password - 403 for SSO users

2. **Settings/Billing endpoints** (7 tests)
   - GET /api/settings/billing - Owner/Manager can access, Staff/Cleaner blocked
   - GET /api/settings/billing/invoices/:id/download - Owner-only (501), others blocked (403)

3. **Company/Team endpoints** (6 tests)
   - GET /api/company - Owner/Manager can access, Staff blocked
   - GET /api/company/cleaners - Owner/Manager can access
   - POST /api/company/cleaners/:id/reset-access - Owner/Manager can reset, Staff blocked

4. **Trial enforcement** (2 tests)
   - Job creation blocked with expired trial (returns code `trial_expired`)

### Test Credentials

The script uses these test users (created via `setup_test_users.py`):

| Role | Email/Phone | Password/PIN |
|------|-------------|--------------|
| Owner | owner@test.com | testpass123! |
| Manager | manager@test.com | testpass123! |
| Staff | staff@test.com | testpass123! |
| SSO Owner | sso@test.com | testpass123! |
| Cleaner | +971500000001 | PIN 1234 |

### Expected Output

```
============================================================
RBAC SMOKE TEST — verify_roles.sh
============================================================

[1/7] Setting up test users
  ✓ Test users created/updated

[2/7] Checking server
  ✓ Server already running

[3/7] Getting auth tokens
  ✓ Owner token acquired
  ✓ Manager token acquired
  ✓ Staff token acquired
  ✓ Cleaner token acquired

[4/7] Testing Auth/Me endpoints
  → Owner GET /api/me... ✓ Owner can access /api/me
  → Manager GET /api/me... ✓ Manager can access /api/me
  ...

============================================================
SUMMARY
============================================================

Total tests: 20
Passed: 20
Failed: 0

============================================================
ALL PASSED
============================================================
```

### Usage Notes

- No `jq` dependency - uses Python for JSON parsing
- Runs in ~30-60 seconds
- Automatically creates test users if needed
- Restores trial state after testing
- Exit code 0 = all passed, non-zero = failures
