# CleanProof Documentation Index

## Quick Links

### Verification & Testing

| Resource | Path | Purpose |
|----------|------|---------|
| **RBAC Smoke Test** | `backend/verify_roles.sh` | Automated RBAC regression guard (20 tests) |
| **Test Users Setup** | `backend/setup_test_users.py` | Create test fixtures for all roles |
| **Verification Checklist** | [docs/settings/VERIFICATION_CHECKLIST.md](settings/VERIFICATION_CHECKLIST.md) | Pre-deployment checklist |

### API Documentation

| Document | Path | Content |
|----------|------|---------|
| **API Contracts** | [docs/api/API_CONTRACTS.md](api/API_CONTRACTS.md) | Error formats, RBAC matrix, trial semantics |
| **Settings RBAC** | [docs/api/SETTINGS_API_RBAC.md](api/SETTINGS_API_RBAC.md) | Detailed Settings API documentation |

### Project Status

| Document | Path | Content |
|----------|------|---------|
| **Project State** | [docs/execution/PROJECT_STATE.md](execution/PROJECT_STATE.md) | Implementation status by layer |
| **Parallel Work Protocol** | [docs/execution/WORKING_MODE_PROTOCOL.md](execution/WORKING_MODE_PROTOCOL.md) | Rules for using parallel agents |
| **Commercial Readiness** | [docs/commercial/COMMERCIAL_READINESS_CHECKLIST.md](commercial/COMMERCIAL_READINESS_CHECKLIST.md) | Pre-revenue go-live checklist |

### Product Specifications

| Document | Path | Content |
|----------|------|---------|
| **Paid Activation Flow** | [docs/product/PAID_ACTIVATION_FLOW_v1.md](product/PAID_ACTIVATION_FLOW_v1.md) | Manual paid plan activation (pre-Paddle) |
| **PDF Reports** | [docs/reports/PDF_REPORTS.md](reports/PDF_REPORTS.md) | Job Report, Company SLA Report, XLSX Export |

### Product Contexts

| Document | Path | Content |
|----------|------|---------|
| **Cleaning Context** | [docs/product/context_cleaning.md](product/context_cleaning.md) | Cleaning services operational context |
| **Maintenance Context V1 Scope** | [docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md](product/MAINTENANCE_CONTEXT_V1_SCOPE.md) | Strict V1 scope definition (assets, visits, boundaries) |
| **Maintenance V2 Strategy** | [docs/product/MAINTENANCE_V2_STRATEGY.md](product/MAINTENANCE_V2_STRATEGY.md) | Stage-based evolution roadmap (Stages 2-5) |
| **Fit-out Context** | [docs/product/context_fitout.md](product/context_fitout.md) | Fit-out/construction operational context |
| **Property Context** | [docs/product/context_property.md](product/context_property.md) | Property management operational context |

### Deployment

| Document | Path | Content |
|----------|------|---------|
| **Production Deployment** | [docs/deployment/PRODUCTION_DEPLOYMENT_V1.md](deployment/PRODUCTION_DEPLOYMENT_V1.md) | VPS deployment guide (Nginx + Gunicorn + Postgres) |
| **Backend Env Example** | `backend/.env.production.example` | Backend environment template |
| **Frontend Env Example** | `dubai-control/.env.production.example` | Frontend Vite environment template |

## Test Credentials

| Role | Email/Phone | Password/PIN |
|------|-------------|--------------|
| Owner | `owner@test.com` | `testpass123!` |
| Manager | `manager@test.com` | `testpass123!` |
| Staff | `staff@test.com` | `testpass123!` |
| SSO Owner | `sso@test.com` | `testpass123!` |
| Cleaner | `+971500000001` | PIN `1234` |

## Running Verification

```bash
# Full RBAC smoke test
cd backend
./verify_roles.sh

# Frontend build check
cd dubai-control
npm run build

# Backend unit tests
cd backend
./venv/bin/python manage.py test
```

## Key Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| `verify_roles.sh` | `backend/` | RBAC regression (20 tests, ~30s) |
| `setup_test_users.py` | `backend/` | Create Owner/Manager/Staff/Cleaner test users |

## Folder Structure

```
docs/
├── DOCS_INDEX.md           # This file
├── api/
│   ├── API_CONTRACTS.md    # Error formats, RBAC matrix
│   └── SETTINGS_API_RBAC.md # Settings API details
├── commercial/
│   ├── COMMERCIAL_READINESS_CHECKLIST.md # Pre-revenue go-live checklist
│   └── FIRST_PAYING_CLIENT_DRY_RUN_REPORT.md # Dry-run simulation results
├── deployment/
│   └── PRODUCTION_DEPLOYMENT_V1.md # VPS deployment guide
├── execution/
│   ├── PROJECT_STATE.md    # Implementation status
│   └── WORKING_MODE_PROTOCOL.md # Parallel agent rules
├── product/
│   ├── PAID_ACTIVATION_FLOW_v1.md # Manual paid activation spec
│   ├── MAINTENANCE_CONTEXT_V1_SCOPE.md # Maintenance V1 strict scope
│   ├── MAINTENANCE_V2_STRATEGY.md # Maintenance V2 evolution roadmap
│   ├── context_cleaning.md     # Cleaning operational context
│   ├── context_maintenance.md  # Maintenance operational context
│   ├── context_fitout.md       # Fit-out operational context
│   └── context_property.md     # Property operational context
├── settings/
│   └── VERIFICATION_CHECKLIST.md # Testing checklist
├── reports/
│   ├── MASTER_CONTEXT_REPORTS.md # Reports overview
│   └── PDF_REPORTS.md      # PDF/XLSX export documentation
├── analytics/              # (future)
├── architecture/           # System architecture docs
├── audit/                  # Audit trail documentation
├── billing/                # (future - payment integration)
├── sla/                    # SLA rules and logic
└── vision/                 # Product vision docs
```

## What's "Done"

See [PROJECT_STATE.md](execution/PROJECT_STATE.md) for full details.

**Completed layers:**
- Roles/RBAC
- Company/Team management
- Trial enforcement
- Billing stub (invoice download = 501, not a bug)
- Plan tiers (standard/pro/enterprise)

## Error Code Reference

See [API_CONTRACTS.md](api/API_CONTRACTS.md) for full list.

| Code | Meaning |
|------|---------|
| `trial_expired` | Trial ended, upgrade required |
| `FORBIDDEN` | RBAC access denied |
| `NOT_IMPLEMENTED` | Feature stub (501) |
