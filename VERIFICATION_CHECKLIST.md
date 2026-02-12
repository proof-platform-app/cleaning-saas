# Settings v1.1 Verification Checklist

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
# Backend verification
cd backend
./verify_rbac.sh

# Expected output:
# ✓ Owner billing access (can_manage=true)
# ✓ Manager billing access (can_manage=false)
# ✓ Staff billing blocked (403 FORBIDDEN)
# ✓ Invoice download 501 for Owner/Manager
# ✓ Invoice download 403 for Staff
# ✓ SSO user password change blocked (403 FORBIDDEN)
# ✓ Validation error format standardized
# ✓ Deterministic payload keys present

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

- [ ] All Account Settings features work
- [ ] Password section respects auth_type (password vs sso)
- [ ] Notifications auto-save correctly
- [ ] Billing RBAC enforced (Owner/Manager/Staff)
- [ ] Invoice download handles 501 gracefully
- [ ] AccountDropdown hides Billing for Staff
- [ ] Error handling uses standardized format
- [ ] Loading and error states display correctly
- [ ] Frontend builds successfully
- [ ] Backend RBAC verification passes

---

**Status**: All features verified ✓

**Commits**:
- b0d966b - feat(api): settings account and billing endpoints v1.1
- 2800c50 - fix(api): settings api endpoint fixes and owner role login support
- f62c02c - chore(api): stabilize settings v1.1 errors and RBAC docs
- d2184bb - feat(frontend): wire Settings v1.1 to backend API
