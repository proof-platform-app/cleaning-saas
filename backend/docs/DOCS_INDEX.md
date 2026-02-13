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
├── execution/
│   └── PROJECT_STATE.md    # Implementation status
├── settings/
│   └── VERIFICATION_CHECKLIST.md # Testing checklist
├── analytics/              # (future)
├── architecture/           # (future)
├── audit/                  # (future)
├── billing/                # (future)
├── product/                # (future)
├── reports/                # (future)
├── sla/                    # (future)
└── vision/                 # (future)
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
