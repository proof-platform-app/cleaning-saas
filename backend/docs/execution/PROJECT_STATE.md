# Project State — Implementation Status

Last updated: 2026-02-13

## Layer Status

### Core Infrastructure

| Layer | Status | Notes |
|-------|--------|-------|
| Django Backend | Done | Django 4.x, DRF |
| Authentication | Done | Token-based (console), Phone+PIN (cleaners) |
| Database | Done | PostgreSQL |
| Frontend | Done | React + Vite + TypeScript |

### RBAC & Authorization

| Layer | Status | Verified By |
|-------|--------|-------------|
| Role System | Done | `verify_roles.sh` |
| Owner permissions | Done | 20 tests passing |
| Manager permissions | Done | 20 tests passing |
| Staff permissions | Done | 20 tests passing |
| Cleaner permissions | Done | 20 tests passing |
| SSO restrictions | Done | Password change blocked |

### Company & Team

| Layer | Status | Notes |
|-------|--------|-------|
| Company profile | Done | GET/PATCH by Owner/Manager |
| Cleaners list | Done | CRUD by Owner/Manager |
| Reset access | Done | 4-digit PIN generation |
| Access audit log | Done | Tracks password resets |

### Trial & Commercial

| Layer | Status | Notes |
|-------|--------|-------|
| Trial enforcement | Done | 7-day trial, auto-block after expiry |
| Plan tiers | Done | standard/pro/enterprise |
| Soft limits | Done | 20 jobs/day, 5 cleaners (trial) |
| Upgrade flow | Done | Trial → Active with tier selection |
| Company blocked | Done | Explicit admin block support |

### Billing

| Layer | Status | Notes |
|-------|--------|-------|
| Billing summary | Done | GET /api/settings/billing/ |
| Usage stats | Done | Users, locations, jobs counts |
| Invoice download | **Stub (501)** | NOT A BUG — not yet implemented |
| Payment method | Stub | Returns `null` |
| Invoice list | Stub | Returns `[]` |

### Jobs & Operations

| Layer | Status | Notes |
|-------|--------|-------|
| Job CRUD | Done | Full lifecycle |
| Job assignment | Done | Cleaner assignment |
| Commercial guards | Done | trial_expired blocks create/modify |
| Locations | Done | CRUD with company scoping |

## Intentional Stubs

These are **not bugs** — features intentionally returning 501:

| Endpoint | Response | Reason |
|----------|----------|--------|
| `GET /api/settings/billing/invoices/:id/download/` | 501 | Stripe integration pending |

## Verification Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `verify_roles.sh` | RBAC regression guard | 20/20 tests pass |
| `setup_test_users.py` | Create test fixtures | Working |

## Frontend Build

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npm run build` | No errors |
| Lint | `npm run lint` | Clean |

## Next Steps

1. **Stripe Integration** — Payment method, invoice generation
2. **Email Notifications** — Job assignment alerts
3. **Reports Export** — PDF generation
