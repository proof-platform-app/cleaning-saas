# Owner/Manager Role Model — v1.0

**Status:** Design Spec
**Version:** 1.0
**Date:** 2026-02-13

---

## 1. Terminology

| Role | Alias | Definition |
|------|-------|------------|
| **Owner** | Billing Admin | Company creator. Full control over billing, plan, payment methods. One per company. |
| **Manager** | Ops Admin | Operational administrator. Can manage jobs, cleaners, locations, reports. No billing access. |
| **Staff** | — | Future role (not implemented). Read-only or limited ops access. |
| **Cleaner** | — | Field worker. Mobile app only. No console access. |

### Key Distinction

- **Owner** = controls **money** (billing, subscription, payment)
- **Manager** = controls **operations** (jobs, team, locations, reports)

Both Owner and Manager are "managers" from operational perspective, but **only Owner can pay**.

---

## 2. Onboarding Model

### Option A: Self-Serve (Recommended for MVP)

```
User signs up → First user becomes Owner → Owner can invite Managers
```

**Flow:**
1. User lands on `/pricing` → clicks "Start free trial"
2. Fills registration form (email, password, company name)
3. System creates Company + User with `role=owner`
4. Owner is automatically logged in
5. Trial starts (7 days)

**Invariants:**
- First registered user = Owner (automatic)
- No public Manager registration (Managers are invited by Owner)
- One Owner per company (immutable in v1)

### Option B: Sales-Assisted (Current State)

```
Admin/Script creates Company + Owner → Owner logs in
```

**Flow:**
1. Sales qualifies lead
2. Admin runs script: `create_company_with_owner.py`
3. Owner receives credentials via secure channel
4. Owner logs in and starts trial

**Why this exists:**
- No public signup implemented yet
- Allows controlled onboarding during beta
- Prevents spam/abuse companies

---

## 3. RBAC Rules (Existing Features Only)

### 3.1 Billing & Subscription

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View current plan | ✅ | ✅ (read-only) | ❌ | ❌ |
| View usage stats | ✅ | ✅ (read-only) | ❌ | ❌ |
| Change plan | ✅ | ❌ | ❌ | ❌ |
| Add payment method | ✅ | ❌ | ❌ | ❌ |
| View invoices | ✅ | ❌ | ❌ | ❌ |
| Cancel subscription | ✅ | ❌ | ❌ | ❌ |

**Rationale:** Manager sees billing status (for operational awareness) but cannot modify.

### 3.2 Company Profile

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View company profile | ✅ | ✅ | ❌ | ❌ |
| Edit company name | ✅ | ✅ | ❌ | ❌ |
| Upload/change logo | ✅ | ✅ | ❌ | ❌ |
| Edit contact info | ✅ | ✅ | ❌ | ❌ |

**Decision:** Owner and Manager both can edit company profile.
**Rationale:** Branding updates are operational, not billing-sensitive.

### 3.3 Team & Cleaners

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View cleaner list | ✅ | ✅ | ❌ | ❌ |
| Add cleaner | ✅ | ✅ | ❌ | ❌ |
| Deactivate cleaner | ✅ | ✅ | ❌ | ❌ |
| Reset cleaner access | ✅ | ✅ | ❌ | ❌ |
| View access audit log | ✅ | ✅ | ❌ | ❌ |

**Decision:** Both Owner and Manager can manage cleaners.
**Rationale:** Team management is operational.

### 3.4 Jobs & Scheduling

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View jobs | ✅ | ✅ | ❌ | Own only |
| Create job | ✅ | ✅ | ❌ | ❌ |
| Force-complete job | ✅ | ✅ | ❌ | ❌ |
| View job history | ✅ | ✅ | ❌ | ❌ |

### 3.5 Locations

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View locations | ✅ | ✅ | ❌ | ❌ |
| Create location | ✅ | ✅ | ❌ | ❌ |
| Edit location | ✅ | ✅ | ❌ | ❌ |
| Deactivate location | ✅ | ✅ | ❌ | ❌ |

### 3.6 Reports & Analytics

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View analytics | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ❌ | ❌ |
| Download PDF | ✅ | ✅ | ❌ | Own jobs |
| Email report | ✅ | ✅ | ❌ | ❌ |
| Export CSV | ✅ | ✅ | ❌ | ❌ |

### 3.7 Settings

| Action | Owner | Manager | Staff | Cleaner |
|--------|-------|---------|-------|---------|
| View account settings | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ |
| Access billing settings | ✅ | ❌ | ❌ | ❌ |

---

## 4. Non-Goals (Explicitly Out of Scope)

| Feature | Status | Notes |
|---------|--------|-------|
| Transfer ownership | ❌ Later | Complex legal/billing implications |
| Manager invitations | ❌ Later | Requires invite flow + email verification |
| Multi-owner | ❌ No | One Owner per company is architectural constraint |
| Payment provider integration | ❌ Later | Stripe integration planned for billing v2 |
| Staff role implementation | ❌ Later | Placeholder in model, not implemented |
| Role change (Owner → Manager) | ❌ No | Owner cannot be demoted |
| Self-serve signup | ❌ Later | Currently sales-assisted only |

---

## 5. Implementation Notes

### Database Model (Existing)

```python
class User(AbstractBaseUser):
    ROLE_OWNER = "owner"
    ROLE_MANAGER = "manager"
    ROLE_STAFF = "staff"
    ROLE_CLEANER = "cleaner"

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
```

### Frontend RBAC Hook (Existing)

```typescript
// useUserRole.ts
export function canAccessBilling(role: string): boolean {
  return role === "owner";
}

export function canManageTeam(role: string): boolean {
  return role === "owner" || role === "manager";
}
```

### Backend Permission Classes (Existing)

```python
# permissions.py
class IsOwnerUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == User.ROLE_OWNER

class IsManagerUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in [User.ROLE_OWNER, User.ROLE_MANAGER]
```

---

## 6. Migration Path

### Current State (v7.x)
- Owner and Manager roles exist
- RBAC enforced on frontend and backend
- Billing UI shows read-only for Manager
- Team management works for both

### Future State (v8.x)
- Manager invitation flow
- Email verification for new managers
- Audit log for role changes

### v2.x (Later)
- Transfer ownership
- Multi-location permissions (granular)
- Staff role activation

---

## CHANGELOG

### v1.0 — 2026-02-13
- Initial design spec
- Documented current RBAC implementation
- Defined Owner vs Manager distinction
- Listed non-goals explicitly
