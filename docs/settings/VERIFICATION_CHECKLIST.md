# Settings v1.1 Verification Checklist

## Quick Automated Verification

Run the RBAC smoke test script to verify all role-based access controls:

```bash
cd backend
./verify_roles.sh
```

**Expected output:**
- 17/17 tests pass
- Exit code 0
- "ALL PASSED" message

The script tests:
- Auth/Me endpoints for all roles
- Billing access (Owner/Manager allowed, Staff/Cleaner blocked)
- Invoice download (Owner-only, Manager/Staff get 403)
- Company profile access
- Trial enforcement (job creation blocked when trial expired)

---

## Quick UI Checks (5 minutes)

### 1. Staff Billing Access (blocked)
- [ ] Login as **staff@test.com**
- [ ] Navigate to `/settings/billing` (direct URL or dropdown)
- [ ] **Expected:** Redirect to `/settings` with "Access restricted" toast
- [ ] **Expected:** "Billing" not visible in account dropdown

### 2. Manager Billing Access (read-only)
- [ ] Login as **manager@test.com**
- [ ] Navigate to `/settings/billing`
- [ ] **Expected:** Page loads with blue info banner "Billing management restricted..."
- [ ] **Expected:** NO "Manage plan" button visible
- [ ] **Expected:** NO "Change payment method" button visible
- [ ] **Expected:** Can view plan, usage, payment info (read-only)

### 3. Owner Billing Access (full)
- [ ] Login as **owner@test.com**
- [ ] Navigate to `/settings/billing`
- [ ] **Expected:** Page loads without restriction banner
- [ ] **Expected:** "Contact to upgrade" button visible
- [ ] **Expected:** Can access all billing features

### 4. Invoice Download (Owner-only)
- [ ] As **owner@test.com**: Click invoice download → 501 "Not available yet"
- [ ] As **manager@test.com**: Invoices section visible, but download → 403

### 5. Trial Expired Job Creation (blocked)
- [ ] Company with expired trial attempts job creation
- [ ] **Expected:** 403 error with `code: "trial_expired"`
- [ ] **Expected:** UI shows trial expired message with upgrade CTA

---

## Prerequisites

```bash
# Start backend
cd backend
./venv/bin/python setup_test_users.py
./venv/bin/python manage.py runserver 8000

# Start frontend
cd dubai-control
npm run dev
```

## Test Users

- **Owner**: owner@test.com / testpass123!
- **Manager**: manager@test.com / testpass123!
- **Staff**: staff@test.com / testpass123!
- **Cleaner**: +971500000001 / PIN 1234
- **SSO Owner**: sso@test.com / testpass123!

---

## Account Settings (`/settings/account`)

### Profile Section

- [ ] **Page loads successfully**
  - Profile form populates with user data from GET /api/me
  - Loading skeleton shows while fetching
  - No console errors

- [ ] **Dirty state tracking**
  - Save/Cancel buttons disabled when form is clean
  - Edit any field → buttons become enabled
  - Click Cancel → confirm dialog shows "Discard changes?"
  - Confirm discard → form resets to original values

- [ ] **Save profile (success)**
  - Edit full_name, phone
  - Click "Save changes"
  - Button shows "Saving..."
  - Success toast: "Profile updated"
  - Form becomes clean (buttons disabled)
  - Data persists on page reload

- [ ] **Save profile (validation error)**
  - Clear full_name field
  - Click "Save changes"
  - Toast shows validation error
  - Field error displays under input
  - Form remains dirty

- [ ] **Email field (SSO users)**
  - Login as sso@test.com
  - Email field is disabled
  - Info text: "Email managed by your organization"

### Password Section

- [ ] **Password section (password-auth users)**
  - Login as owner@test.com (password auth)
  - Password section visible with 3 fields
  - Password strength indicator works
  - Shows weak/medium/strong colors

- [ ] **Password section (SSO users)**
  - Login as sso@test.com
  - Password section shows "Authentication managed by your organization"
  - Shield icon displayed
  - No password fields visible

- [ ] **Change password (success)**
  - Login as owner@test.com
  - Enter current password: testpass123!
  - Enter new password: NewPass456@
  - Confirm password matches
  - Click "Update password"
  - Button shows "Updating..."
  - Success toast: "Password updated"
  - Form clears

- [ ] **Change password (wrong current password)**
  - Enter wrong current password
  - Try to submit
  - Toast: "Current password is incorrect"
  - Error shows under current password field

- [ ] **Change password (SSO user attempt)**
  - Login as sso@test.com (even though section hidden)
  - If somehow POST /api/me/change-password is called
  - Should get 403 FORBIDDEN
  - Toast: "Password change not allowed for SSO users"

### Notifications Section

- [ ] **Notifications load**
  - Preferences load from GET /api/me/notification-preferences
  - Toggle states match API data

- [ ] **Auto-save on toggle**
  - Toggle any preference
  - Loading spinner shows on that specific toggle
  - PATCH /api/me/notification-preferences called
  - Toast: none (auto-save is silent unless error)
  - Toggle state persists on page reload

- [ ] **Master toggle behavior**
  - Turn OFF "Email Notifications" (master)
  - All sub-toggles (Job Alerts, Weekly Summary) become OFF and disabled
  - Turn ON master → sub-toggles become enabled again

- [ ] **Error rollback**
  - Simulate network error (disconnect internet or kill backend)
  - Toggle any preference
  - Error toast: "Failed to save"
  - Toggle reverts to previous state

---

## Billing Page (`/settings/billing`)

### RBAC - Owner

- [ ] **Owner access**
  - Login as owner@test.com
  - Navigate to /settings/billing
  - Page loads successfully
  - No access denied banner
  - "Manage plan" button visible
  - "Change payment method" button visible

### RBAC - Manager

- [ ] **Manager access (read-only)**
  - Login as manager@test.com
  - Navigate to /settings/billing
  - Page loads successfully
  - Blue info banner: "Billing management restricted to account owner"
  - "Manage plan" button NOT visible
  - "Change payment method" button NOT visible
  - Can view all data (plan, usage, payment method, invoices)

### RBAC - Staff

- [ ] **Staff access (blocked)**
  - Login as staff@test.com
  - Navigate to /settings/billing
  - Immediately redirected to /settings
  - Toast: "Access restricted" / "Billing access restricted to administrators"

### Billing Data Display

- [ ] **Plan summary**
  - Plan name displays (Trial Plan / Pro Plan / etc)
  - Status badge shows correct color:
    - trial → blue
    - active → green
    - past_due → red
    - cancelled → yellow
  - Next billing date displays (or "N/A" if null)

- [ ] **Usage summary**
  - Three metrics: Active Users, Locations, Job Volume
  - Progress bars show correct percentage
  - Progress bar colors:
    - 0-79%: Blue (accent)
    - 80-99%: Yellow (warning)
    - 100%+: Red (error)
  - Helper text shows remaining count
  - Unlimited (null limit) displays correctly without progress bar

- [ ] **Payment method**
  - If payment method exists:
    - Card icon, brand, last4, expiry display
  - If null:
    - "No payment method on file" shows
    - Owner sees "Add payment method" button

- [ ] **Invoices table**
  - If invoices exist:
    - Table with Date, Amount, Status, Download columns
    - Status badges colored correctly (paid=green, failed=red)
  - If empty:
    - Empty state: "No invoices yet"

### Invoice Download

- [ ] **Invoice download (501 not implemented)**
  - Click download icon on any invoice
  - Loading spinner shows in button
  - Toast: "Not available yet" / "Invoice download is not available yet"
  - Returns status 501

- [ ] **Invoice download (403 for Staff - if they somehow access)**
  - If Staff user somehow calls download endpoint
  - Should get 403 with toast: "Access denied"

---

## AccountDropdown (Billing visibility)

- [ ] **Billing link (Owner/Manager)**
  - Login as owner@test.com
  - Click account dropdown (top right)
  - "Billing" menu item visible
  - Click → navigates to /settings/billing

- [ ] **Billing link (Staff)**
  - Login as staff@test.com
  - Click account dropdown
  - "Billing" menu item NOT visible
  - Only "Account settings" shows

---

## Error Handling

### Standardized Error Format

- [ ] **400 Validation Error**
  - Trigger validation error (empty required field)
  - Toast shows: code="VALIDATION_ERROR", message + field errors
  - Fields object with error messages displays

- [ ] **403 Forbidden**
  - SSO user tries password change
  - Staff user accesses billing
  - Toast shows: code="FORBIDDEN", message

- [ ] **501 Not Implemented**
  - Try invoice download
  - Toast shows: code="NOT_IMPLEMENTED", message

### Network Errors

- [ ] **API unreachable**
  - Kill backend server
  - Try to load /settings/account
  - Error state displays with Retry button
  - Click Retry → page reloads

---

## Loading & Error States

- [ ] **Loading skeletons**
  - Kill backend, start frontend first
  - Visit /settings/account
  - Loading skeletons show for 3 sections
  - No UI "jump" when data loads

- [ ] **Error displays**
  - Simulate API error (500)
  - Error card with AlertCircle icon
  - Error message displays
  - Retry button works

---

## Manual Verification Commands

```bash
# Backend RBAC verification (automated)
cd backend
./verify_roles.sh

# Expected output:
# ============================================================
# RBAC SMOKE TEST — verify_roles.sh
# ============================================================
# [1/7] Setting up test users ... OK
# [2/7] Checking server ... OK
# [3/7] Getting auth tokens ... OK
# [4/7] Testing Auth/Me endpoints ... PASS (4 tests)
# [5/7] Testing Settings/Billing endpoints ... PASS (7 tests)
# [6/7] Testing Company/Team endpoints ... PASS (5 tests)
# [7/7] Testing Trial enforcement ... PASS (1 test)
# ============================================================
# Total tests: 17
# Passed: 17
# Failed: 0
# ALL PASSED
# ============================================================
# Exit code: 0

# Frontend build
cd dubai-control
npm run build

# Expected output:
# ✓ built in ~4s
# No TypeScript errors
# No linting errors
```

---

## Summary Checklist

- [ ] `./verify_roles.sh` passes (17/17 tests, exit code 0)
- [ ] All Account Settings features work
- [ ] Password section respects auth_type (password vs sso)
- [ ] Notifications auto-save correctly
- [ ] Billing RBAC enforced:
  - [ ] Staff blocked (403)
  - [ ] Manager read-only (`can_manage=false`)
  - [ ] Owner full access (`can_manage=true`)
- [ ] Invoice download RBAC enforced:
  - [ ] Owner gets 501 (stub)
  - [ ] Manager gets 403 (owner-only action)
- [ ] Trial enforcement works:
  - [ ] Job creation blocked when trial expired (403, `code: "trial_expired"`)
- [ ] AccountDropdown hides Billing for Staff
- [ ] Error handling uses standardized format
- [ ] Loading and error states display correctly
- [ ] Frontend builds successfully

---

**Status**: All features verified ✅

**Last verified**: 2026-02-13

**Verification script**: `backend/verify_roles.sh`
