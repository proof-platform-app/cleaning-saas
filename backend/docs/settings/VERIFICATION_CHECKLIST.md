# Verification Checklist

Pre-deployment and regression testing checklist for CleanProof.

## Automated Tests

### 1. RBAC Smoke Test

```bash
cd backend
./verify_roles.sh
```

**Expected:** ALL PASSED (20/20 tests)

**Tests:**
- Auth/Me endpoints (4 roles)
- SSO password restriction
- Billing access (Owner/Manager allowed, Staff/Cleaner blocked)
- Invoice download (Owner=501, others=403)
- Company profile access
- Cleaner management
- Trial enforcement (job creation blocked when expired)

### 2. Frontend Build

```bash
cd dubai-control
npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### 3. Backend Tests

```bash
cd backend
./venv/bin/python manage.py test
```

**Expected:** All tests pass

## Manual Verification Plan

### By Role

#### Owner (`owner@test.com` / `testpass123!`)

| Action | Expected Result |
|--------|-----------------|
| Login | Success, redirect to dashboard |
| View Dashboard | Shows plan tier, trial status |
| View Billing | `can_manage: true`, all fields visible |
| Download Invoice | 501 NOT_IMPLEMENTED |
| View Company | Full profile visible |
| View Cleaners | List visible |
| Reset Cleaner Access | New 4-digit PIN generated |
| Change Password | Works (unless SSO) |

#### Manager (`manager@test.com` / `testpass123!`)

| Action | Expected Result |
|--------|-----------------|
| Login | Success |
| View Dashboard | Same as Owner |
| View Billing | `can_manage: false` |
| Download Invoice | 403 FORBIDDEN |
| View Company | Visible |
| View Cleaners | Visible |
| Create Job | Works (if not trial_expired) |

#### Staff (`staff@test.com` / `testpass123!`)

| Action | Expected Result |
|--------|-----------------|
| Login | Success |
| View Dashboard | Limited view |
| View Billing | 403 FORBIDDEN |
| View Company | 403 FORBIDDEN |
| View Profile | Own profile only |

#### Cleaner (`+971500000001` / PIN `1234`)

| Action | Expected Result |
|--------|-----------------|
| Login | Success via phone + PIN |
| View /api/me | Own profile |
| View Billing | 403 FORBIDDEN |
| Access console | Should redirect to mobile |

### Trial Flow

| Scenario | Expected |
|----------|----------|
| New company, no trial | Dashboard shows "Start Trial" |
| Active trial | Shows "X days left" |
| Expired trial | Shows "Trial ended", create job blocked |
| After upgrade | Full access restored |

### Plan Tier Display

| Location | Check |
|----------|-------|
| Dashboard banner | Shows correct tier name |
| Billing page | Shows same tier |
| Pricing page | Current tier highlighted |

## Pre-Commit Checklist

Before committing changes:

- [ ] `./verify_roles.sh` passes (20/20)
- [ ] `npm run build` succeeds
- [ ] No console errors in browser
- [ ] RBAC changes documented in API_CONTRACTS.md
- [ ] New error codes added to API_CONTRACTS.md

## CI/CD Integration

```yaml
# Example GitHub Actions
- name: RBAC Smoke Test
  run: |
    cd backend
    ./verify_roles.sh

- name: Frontend Build
  run: |
    cd dubai-control
    npm ci
    npm run build
```
