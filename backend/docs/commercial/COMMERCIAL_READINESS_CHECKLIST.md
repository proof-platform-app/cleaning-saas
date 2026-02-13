# Commercial Readiness Checklist (Pre-Revenue Lock)

> **Purpose:** This document confirms CleanProof is ready for paying customers.
> **Last Updated:** 2026-02-13
> **Status:** Pre-revenue validation complete — Manual paid activation implemented

---

## 1. Platform Stability

Core technical foundation verified and locked.

| Checkpoint | Status | Evidence |
|------------|--------|----------|
| `verify_roles.sh` passes 17/17 tests | **DONE** | Exit code 0, all assertions green |
| Trial enforcement blocks job creation | **DONE** | Error code `trial_expired` returned, UI shows banner |
| Invoice download returns 501 (stub) | **DONE** | Documented as intentional in API_CONTRACTS.md |
| Error responses use standardized format | **DONE** | `{code, message, detail?}` per API_CONTRACTS.md |
| API payloads are deterministic | **DONE** | No random fields, consistent snake_case |

### Verification Command
```bash
cd backend && ./verify_roles.sh
# Expected: 17/17 tests pass, exit code 0
```

---

## 2. Operational Readiness

Day-to-day operations can be performed by support/admin staff.

| Checkpoint | Status | Notes |
|------------|--------|-------|
| Company creation via Django Admin | **DONE** | `/admin/companies/company/add/` |
| Owner assignment to company | **DONE** | CompanyMembership with role=owner |
| Password reset for any user | **DONE** | Django Admin → Users → Change password |
| Cleaner deactivation | **DONE** | `is_active=False` on User model |
| Contact route exists | **DONE** | `/cleanproof/contact` (frontend), leads to support |

### Admin Access
- URL: `https://{domain}/admin/`
- Requires: Superuser credentials
- Key models: `Company`, `CompanyMembership`, `User`, `Job`

---

## 3. Financial Readiness

Pre-payment flow is complete and honest.

| Checkpoint | Status | Notes |
|------------|--------|-------|
| All upgrade CTAs point to `/cleanproof/contact` | **DONE** | Unified in `CTA_COPY.contactHref` |
| No Stripe/Paddle/payment provider references | **DONE** | Billing page is contact-based |
| Billing copy is accurate | **DONE** | "No payment method on file" + contact CTA |
| Manual activation process documented | **DONE** | `activate_paid_plan` management command |
| `is_paid` flag in API responses | **DONE** | `/api/cleanproof/usage-summary/`, `/api/settings/billing/` |
| Paid companies bypass trial checks | **DONE** | Job creation allowed regardless of `trial_expires_at` |

### Trial to Paid Conversion Flow
1. Customer contacts via `/cleanproof/contact`
2. Sales confirms upgrade request
3. Admin updates company in Django Admin:
   - `plan_tier` → `standard` / `pro` / `enterprise`
   - `status` → `active`
   - `trial_expires_at` → `null`
4. Customer refreshes dashboard

---

## 4. Security & Deployment

Production security baseline.

| Checkpoint | Status | Notes |
|------------|--------|-------|
| `DEBUG=False` in production | **REQUIRED** | `.env` or environment variable |
| No sensitive data in logs | **REQUIRED** | Passwords, tokens, PII excluded |
| `SECRET_KEY` is unique | **REQUIRED** | Generate new key for production |
| `ALLOWED_HOSTS` configured | **REQUIRED** | Only production domains |
| CORS restricted | **REQUIRED** | Only frontend domain(s) |
| Admin endpoints protected | **DONE** | Requires superuser authentication |
| Token authentication secure | **DONE** | DRF TokenAuthentication |

### Pre-Deployment Checklist
```bash
# Verify production settings
python manage.py check --deploy

# Expected: No critical issues
```

---

## 5. Documentation Lock

All contracts and state documents are current.

| Document | Path | Status |
|----------|------|--------|
| API Contracts | `docs/api/API_CONTRACTS.md` | **LOCKED** |
| Project State | `docs/execution/PROJECT_STATE.md` | **LOCKED** (v7.8) |
| Verification Checklist | `docs/settings/VERIFICATION_CHECKLIST.md` | **LOCKED** |
| Settings API RBAC | `docs/api/SETTINGS_API_RBAC.md` | **LOCKED** |
| Docs Index | `docs/DOCS_INDEX.md` | **CURRENT** |

### What "LOCKED" Means
- Document reflects actual implementation
- Changes require corresponding code changes (or vice versa)
- Used as source of truth for support and onboarding

---

## 6. Go-Live Criteria

### Ready for First Customer When:

- [ ] `verify_roles.sh` passes in production environment
- [ ] Admin can create company + assign owner
- [ ] Owner can log in and see Dashboard
- [ ] Trial expiry blocks job creation with correct error
- [ ] Contact form/route is operational
- [ ] Production `DEBUG=False` confirmed
- [ ] `ALLOWED_HOSTS` and CORS configured

### Not Required for Go-Live:

- Payment gateway integration (manual billing)
- Automated invoicing (manual process)
- Mobile app (web-first)
- Analytics dashboard (future)
- Multi-language support (English first)

---

## Summary

| Area | Status |
|------|--------|
| Platform Stability | **READY** |
| Operational Readiness | **READY** |
| Financial Readiness | **READY** (manual) |
| Security Baseline | **CONFIGURE PER ENV** |
| Documentation | **LOCKED** |

**Verdict:** CleanProof is ready for commercial pilot with manual billing workflow.

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-13 | Manual paid activation implemented (`activate_paid_plan` command) |
| 2026-02-13 | Initial checklist created (pre-revenue lock) |
