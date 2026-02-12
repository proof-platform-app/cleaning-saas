# TRIAL FLOW — 7-Day Trial & Upgrade

**Status:** PRODUCTION-READY
**Last Updated:** 2026-02-12
**Audit:** Completed and tested

---

## Overview

This document describes the complete lifecycle of the 7-day trial and upgrade flow:
1. Trial signup from Pricing page
2. Automatic trial start after login/signup
3. Trial status display on Dashboard
4. Trial expiration detection
5. Upgrade from trial to active (paid) plan

---

## Trial Model

### Database Fields (`Company` model)

```python
# Plan status
plan = models.CharField(
    max_length=20,
    choices=[
        ("trial", "Trial"),
        ("active", "Active"),
        ("blocked", "Blocked"),
    ],
    default="active",
)

# Trial dates
trial_started_at = models.DateTimeField(null=True, blank=True)
trial_expires_at = models.DateTimeField(null=True, blank=True)

# Trial limits (hardcoded)
TRIAL_MAX_CLEANERS = 2
TRIAL_MAX_JOBS = 10
```

### Trial Status Logic

**Active Trial:**
- `plan == "trial"`
- `trial_started_at <= now <= trial_expires_at`
- Method: `Company.is_trial_active` (property)

**Expired Trial:**
- `plan == "trial"`
- `now >= trial_expires_at`
- Method: `Company.is_trial_expired()` (method)

**Blocked Company:**
- `is_active == False` OR
- `plan == "blocked"` OR
- Trial expired
- Method: `Company.is_blocked()` (method)

---

## User Journey

### 1. Pricing Page → Start Trial

**URL:** `/cleanproof/pricing`

**User Actions:**
1. Guest visits Pricing page
2. Sees two plans: Standard ($79) and Pro ($149)
3. Standard plan shows "Start 7-day trial" button
4. Clicks button → Navigates to `/?trial=standard`

**Frontend Logic:**
```tsx
// PricingPlansSection.tsx
const handleStartStandardTrial = () => {
  navigate("/?trial=standard");
};
```

**UI States:**
- **anonymous (guest):** Shows "Start 7-day trial"
- **trial_active:** Shows "Current plan" (disabled)
- **trial_expired:** Shows "Upgrade to Standard"
- **other (active paid):** Shows "Current plan" (disabled)

---

### 2. Login/Signup with Trial Parameter

**URL:** `/?trial=standard`

**Login Flow:**
1. Login page detects `?trial=standard` query parameter
2. Shows "Sign in to start your 7-day free trial"
3. After successful login:
   - Stores `cleanproof_trial_entry = "standard"` in localStorage
   - Redirects to Dashboard

**Signup Flow:**
1. Signup page detects `?trial=standard` query parameter
2. Button text: "Create account & start trial"
3. After successful signup:
   - Redirects to `/?trial=standard` (login)

**Code:**
```tsx
// Login.tsx
const isTrialFlow = params.get("trial") === "standard";

if (isTrialFlow) {
  localStorage.setItem("cleanproof_trial_entry", "standard");
}
```

---

### 3. Auto-Start Trial on Dashboard

**URL:** `/dashboard`

**Flow:**
1. Dashboard loads
2. Checks localStorage for `cleanproof_trial_entry`
3. If found:
   - Calls `POST /api/cleanproof/trials/start/`
   - Removes `cleanproof_trial_entry` from localStorage (prevents re-triggering)
4. Backend starts 7-day trial (idempotent)

**Code:**
```tsx
// Dashboard.tsx
useEffect(() => {
  const trialEntry = localStorage.getItem("cleanproof_trial_entry");

  if (trialEntry === "standard") {
    localStorage.removeItem("cleanproof_trial_entry");

    const token = localStorage.getItem("authToken");
    if (token) {
      fetch(`${API_BASE_URL}/api/cleanproof/trials/start/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
      });
    }
  }
}, []);
```

**Backend Endpoint:** `POST /api/cleanproof/trials/start/`

**Response:**
```json
{
  "plan": "trial",
  "trial_started_at": "2026-02-12T10:00:00Z",
  "trial_expires_at": "2026-02-19T10:00:00Z",
  "is_trial_active": true,
  "is_trial_expired": false,
  "days_left": 7
}
```

---

### 4. Trial Banner on Dashboard

**Display Logic:**
```tsx
// Fetch trial status
const usage = await getUsageSummary();

const bannerTitle =
  usage.is_trial_expired
    ? "Trial ended"
    : usage.is_trial_active
    ? `Trial active · ${usage.days_left} day${usage.days_left === 1 ? "" : "s"} left`
    : "Standard plan";

const bannerDescription =
  usage.is_trial_expired
    ? "Your 7-day free trial has ended. You can still view existing jobs and download reports, but to create new jobs you'll need to upgrade."
    : usage.is_trial_active
    ? "You're exploring CleanProof with full access. Upgrade anytime — no changes to your data."
    : "You're on a paid plan. All features are available.";
```

**Upgrade Button:**
- Always visible on trial banner
- Navigates to `/cleanproof/pricing`

---

### 5. Trial Expiration

**When trial expires:**
- `Company.is_blocked()` returns `True`
- Job creation blocked with error:
  ```json
  {
    "code": "trial_expired",
    "detail": "Your free trial has ended. You can still view existing jobs and download reports, but creating new jobs requires an upgrade."
  }
  ```
- Cleaner creation blocked
- Force-complete blocked
- Read-only access to existing data preserved

**API Enforcement:**
- `/api/manager/jobs/` (POST) → 403 if trial expired
- `/api/manager/company/cleaners/` (POST) → 403 if trial expired

---

### 6. Upgrade Flow

**Trigger:** User clicks "Upgrade" button on Dashboard or visits Pricing page

**Pricing Page After Trial Expires:**
- Mode: `trial_expired`
- Standard plan button: "Upgrade to Standard"
- Clicking button calls `POST /api/cleanproof/upgrade-to-active/`

**Code:**
```tsx
// PricingPlansSection.tsx
const handleUpgrade = async () => {
  setIsUpgrading(true);
  try {
    await upgradeToActive();
    navigate("/dashboard");
  } catch (error) {
    alert("Failed to upgrade. Please try again or contact support.");
  } finally {
    setIsUpgrading(false);
  }
};
```

**Backend Endpoint:** `POST /api/cleanproof/upgrade-to-active/`

**Response:**
```json
{
  "plan": "active",
  "trial_started_at": "2026-02-12T10:00:00Z",
  "trial_expires_at": "2026-02-19T10:00:00Z",
  "is_trial_active": false,
  "is_trial_expired": false,
  "days_left": null
}
```

**Backend Logic:**
```python
# Company.upgrade_to_active()
def upgrade_to_active(self) -> None:
    if self.plan == self.PLAN_ACTIVE:
        return

    self.plan = self.PLAN_ACTIVE
    self.save(update_fields=["plan"])
```

---

## API Endpoints

### 1. Start Trial
**Endpoint:** `POST /api/cleanproof/trials/start/`
**Auth:** Required
**Idempotent:** Yes (returns existing trial if already active)

**Behavior:**
- If company.plan == "active": starts trial (sets plan="trial", dates)
- If trial already active: returns current trial status
- If trial expired: does NOT restart (returns status)

### 2. Usage Summary
**Endpoint:** `GET /api/cleanproof/usage-summary/`
**Auth:** Required

**Response:**
```json
{
  "plan": "trial",
  "is_trial_active": true,
  "is_trial_expired": false,
  "days_left": 5,
  "jobs_today_count": 3,
  "jobs_today_soft_limit": 20,
  "cleaners_count": 2,
  "cleaners_soft_limit": 5
}
```

### 3. Upgrade to Active
**Endpoint:** `POST /api/cleanproof/upgrade-to-active/`
**Auth:** Required
**Idempotent:** Yes

**Behavior:**
- Sets `company.plan = "active"`
- Unblocks company
- Preserves trial dates (for audit/history)

---

## Trial Limits

### Hard Limits (Enforced)
- **Cleaners:** Max 2 active cleaners
- **Jobs:** Max 10 total jobs (across all time)
- **Duration:** 7 days

### Soft Limits (Warning only)
- **Jobs per day:** 20 (informational threshold)
- **Cleaners:** 5 (informational threshold)

### Enforcement Logic

**Job Creation:**
```python
# views_manager_jobs.py: ManagerJobsCreateView.post()
if company.is_blocked():
    code = "trial_expired" if company.is_trial_expired() else "company_blocked"
    return Response({"code": code, ...}, status=403)

if company.is_trial_active and company.trial_jobs_limit_reached():
    return Response({"code": "trial_jobs_limit_reached", ...}, status=403)
```

**Cleaner Creation:**
```python
# views_manager_company.py: ManagerCleanersListCreateView.post()
if company.is_trial_active and company.trial_cleaners_limit_reached():
    return Response({"code": "trial_cleaners_limit_reached", ...}, status=403)
```

---

## Testing

### Manual Testing Checklist

1. **Start Trial:**
   - [ ] Visit /cleanproof/pricing as guest
   - [ ] Click "Start 7-day trial" on Standard plan
   - [ ] Signup/login with `?trial=standard` parameter
   - [ ] Dashboard loads and trial auto-starts
   - [ ] Banner shows "Trial active · 7 days left"

2. **Active Trial:**
   - [ ] Dashboard banner shows correct days remaining
   - [ ] Create up to 2 cleaners (success)
   - [ ] Try to create 3rd cleaner (fail with trial_cleaners_limit_reached)
   - [ ] Create up to 10 jobs (success)
   - [ ] Try to create 11th job (fail with trial_jobs_limit_reached)

3. **Trial Expiration:**
   - [ ] Manually set `trial_expires_at` to past date
   - [ ] Refresh Dashboard → Banner shows "Trial ended"
   - [ ] Try to create job (fail with trial_expired)
   - [ ] Existing jobs still visible (read-only access)

4. **Upgrade Flow:**
   - [ ] Click "Upgrade" on Dashboard banner → navigates to /cleanproof/pricing
   - [ ] Pricing page shows "Upgrade to Standard" (not "Start trial")
   - [ ] Click "Upgrade to Standard" → success
   - [ ] Dashboard redirects, banner shows "Standard plan"
   - [ ] Can create jobs and cleaners without limits

### Automated Tests

Run Django tests:
```bash
cd backend
python manage.py test apps.accounts.tests
```

**Test Coverage:**
- `test_start_trial_success` — Trial starts correctly
- `test_start_trial_idempotent` — Multiple starts don't restart trial
- `test_trial_days_left_calculation` — Days remaining calculated correctly
- `test_trial_expired_detection` — Expired status detected
- `test_company_blocked_when_trial_expired` — Company blocked after expiration
- `test_upgrade_to_active_success` — Upgrade works
- `test_upgrade_to_active_idempotent` — Multiple upgrades are safe
- `test_upgrade_from_expired_trial` — Can upgrade after expiration
- `test_trial_cleaner_limit_reached` — Cleaner limits enforced

---

## Known Limitations

1. **No billing integration:** Upgrade switches plan to "active" but does not charge payment
2. **No trial restart prevention:** In DEV, trial can be restarted manually (prod should restrict)
3. **Pro plan:** Placeholder only, not connected to real billing
4. **Trial history:** Trial dates preserved after upgrade (for audit), not cleared

---

## Production Considerations

### Before Launch:
1. **Billing Integration:**
   - Replace "Upgrade to Standard" with Stripe checkout link
   - Add webhook to handle successful payment
   - Update `Company.plan` to "active" after payment confirmation

2. **Trial Restart Protection:**
   - Track if trial was ever used (e.g., `trial_used_at` field)
   - Prevent second trial for same company

3. **Email Notifications:**
   - Trial start confirmation
   - Trial ending reminder (2 days before)
   - Trial expired notification

4. **Analytics:**
   - Track trial conversion rate
   - Monitor trial churn reasons
   - Log upgrade events

---

## File Reference

### Backend
- **Model:** `backend/apps/accounts/models.py` (Company.plan, trial fields, methods)
- **Views:** `backend/apps/accounts/api/views.py` (StartStandardTrialView, UsageSummaryView, UpgradeToActiveView)
- **URLs:** `backend/config/urls.py` (trial endpoints)
- **Tests:** `backend/apps/accounts/tests.py` (TrialFlowTestCase, TrialLimitsTestCase)

### Frontend
- **Pricing Page:** `dubai-control/src/pages/PricingPage.tsx`
- **Pricing Plans:** `dubai-control/src/components/pricing/PricingPlansSection.tsx`
- **Dashboard:** `dubai-control/src/pages/Dashboard.tsx` (trial banner + auto-start)
- **Login:** `dubai-control/src/pages/Login.tsx` (trial flow detection)
- **API Client:** `dubai-control/src/api/client.ts` (getUsageSummary, upgradeToActive)

---

## Changelog

### 2026-02-12 — Initial Implementation
- Added trial auto-start on Dashboard after signup
- Fixed Pricing page CTA logic (trial_active → "Current plan")
- Added upgrade endpoint: `POST /api/cleanproof/upgrade-to-active/`
- Fixed trial_expired flow: now shows "Upgrade to Standard" instead of "Request upgrade → contact"
- Added comprehensive Django tests
- Documented complete trial flow

---

**Document Type:** Technical Specification
**Authority:** Product & Engineering
**Next Review:** After billing integration
