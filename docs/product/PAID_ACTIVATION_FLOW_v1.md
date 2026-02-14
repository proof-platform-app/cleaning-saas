# Paid Activation Flow v1.0 (Pre-Paddle)

> **Purpose:** Define manual paid plan activation before payment integration.
> **Version:** 1.0
> **Status:** Specification
> **Created:** 2026-02-13

---

## 1. Company Billing States

### State Definitions

| State | Value | Description |
|-------|-------|-------------|
| **Trial Active** | `trial_active` | Company is within trial period, all features available |
| **Trial Expired** | `trial_expired` | Trial ended, job creation blocked, read-only access |
| **Paid Active** | `paid_active` | Paid plan active, all features available, no trial limits |
| **Suspended** | `suspended` | Reserved for future use (non-payment, violations) |

### State Transitions

```
┌─────────────────┐
│  trial_active   │
└────────┬────────┘
         │ trial period ends
         ▼
┌─────────────────┐     manual activation     ┌─────────────────┐
│  trial_expired  │ ────────────────────────► │   paid_active   │
└─────────────────┘                           └─────────────────┘
         ▲                                            │
         │              manual deactivation           │
         └────────────────────────────────────────────┘
                    (future: non-payment)
```

### State Storage

```python
# Company model
billing_status = models.CharField(
    max_length=20,
    choices=[
        ("trial_active", "Trial Active"),
        ("trial_expired", "Trial Expired"),
        ("paid_active", "Paid Active"),
        ("suspended", "Suspended"),
    ],
    default="trial_active",
)
```

---

## 2. What Changes When Company Becomes Paid

### Feature Access

| Feature | Trial Active | Trial Expired | Paid Active |
|---------|--------------|---------------|-------------|
| View Dashboard | Yes | Yes | Yes |
| View Jobs | Yes | Yes | Yes |
| Create Jobs | Yes | **No** | Yes |
| Edit Jobs | Yes | No | Yes |
| Download Reports | Yes | Yes | Yes |
| View Billing | Yes | Yes | Yes |
| Download Invoices | Stub (501) | Stub (501) | Stub (501) |

### Trial Check Bypass

When `billing_status == "paid_active"`:
- `trial_expires_at` field is **ignored**
- No trial countdown displayed
- No trial banners shown
- Job creation always allowed (no `trial_expired` error)

### Billing Page Display

| State | Banner | CTA | Status Display |
|-------|--------|-----|----------------|
| `trial_active` | "Trial ends in X days" | "Contact to upgrade" | Trial |
| `trial_expired` | "Trial expired" | "Contact to upgrade" | Expired |
| `paid_active` | None | None | "Active Plan" |

### Dashboard & Planning Pages

| State | Trial Banner | Create Job Button |
|-------|--------------|-------------------|
| `trial_active` | Shows days remaining | Enabled |
| `trial_expired` | "Upgrade required" | Disabled |
| `paid_active` | Hidden | Enabled |

---

## 3. Manual Activation Process (Pre-Payment)

### Overview

Until payment provider is integrated, plan activation is manual:

1. Customer contacts sales via `/cleanproof/contact`
2. Sales confirms payment (offline)
3. Admin runs management command
4. Company immediately gains `paid_active` status

### Management Command

```bash
# Activate paid plan
python manage.py activate_paid_plan --company-id 18

# Optional: specify plan tier
python manage.py activate_paid_plan --company-id 18 --tier pro

# Deactivate (revert to trial_expired)
python manage.py activate_paid_plan --company-id 18 --deactivate
```

### Command Behavior

**On Activation:**
1. Set `billing_status = "paid_active"`
2. Set `plan_tier` if specified (default: keep current)
3. Clear `trial_expires_at` (optional, for clarity)
4. Log activation with timestamp
5. Print confirmation message

**On Deactivation:**
1. Set `billing_status = "trial_expired"`
2. Print confirmation message

### Activation Record

For audit purposes, store:
- `activated_at` timestamp
- `activated_by` admin username (from command)
- Future: payment reference ID

---

## 4. Non-Goals (v1.0)

The following are explicitly **out of scope**:

| Feature | Status | Notes |
|---------|--------|-------|
| Payment provider integration | Not implemented | Manual activation only |
| Webhooks | Not implemented | No automated status changes |
| Automated billing | Not implemented | Offline invoicing |
| Subscription management | Not implemented | Admin-controlled |
| Plan downgrades | Not implemented | Contact support |
| Prorated billing | Not implemented | Full month only |
| Self-service upgrade | Not implemented | Contact sales |

---

## 5. API Behavior

### Job Creation Endpoint

`POST /api/manager/jobs/`

**Authorization Logic:**
```python
def check_job_creation_allowed(company):
    # Paid companies bypass trial check
    if company.billing_status == "paid_active":
        return True

    # Trial active - check expiry
    if company.billing_status == "trial_active":
        if company.trial_expires_at and company.trial_expires_at > now():
            return True
        # Trial just expired - update status
        company.billing_status = "trial_expired"
        company.save()
        return False

    # Trial expired or suspended
    return False
```

**Error Response (when blocked):**
```json
{
  "code": "trial_expired",
  "message": "Trial expired — upgrade required to create new jobs"
}
```

### Billing Summary Endpoint

`GET /api/manager/billing/summary/`

**Response includes:**
```json
{
  "billing_status": "paid_active",
  "plan_tier": "pro",
  "is_trial_active": false,
  "is_trial_expired": false,
  "is_paid": true
}
```

---

## 6. Verification

### Test Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Paid company creates job | 201 Created |
| 2 | Paid company with past trial_expires_at creates job | 201 Created |
| 3 | Trial expired company creates job | 403 + `trial_expired` |
| 4 | Trial active company creates job | 201 Created |
| 5 | Billing summary for paid company | `is_paid: true` |

### Verification Command

```bash
# Add to verify_roles.sh
# Test: Paid company can create jobs
```

---

## 7. Implementation Checklist

- [ ] Add `billing_status` field to Company model
- [ ] Create migration
- [ ] Update trial enforcement logic in job creation
- [ ] Create `activate_paid_plan` management command
- [ ] Update billing summary API response
- [ ] Update frontend Billing page
- [ ] Update frontend Dashboard
- [ ] Update frontend JobPlanning page
- [ ] Add test to verify_roles.sh
- [ ] Update API_CONTRACTS.md
- [ ] Update PROJECT_STATE.md

---

## Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-02-13 | 1.0 | Initial specification |
