# Cleaning SaaS — Project State

## What works
- Auth: login via /api/auth/login/
- Today jobs: GET /api/jobs/today/
- Check-in: POST /api/jobs/<id>/check-in/
  - GPS validation
  - status: scheduled → in_progress
  - JobCheckEvent created
- Check-out: POST /api/jobs/<id>/check-out/
  - status: in_progress → completed
  - JobCheckEvent created
- Admin:
  - Job
  - JobCheckEvent (inline + list)
  - No conflicts, system check clean

## Current status
- Django system check: OK
- Server starts without errors
- DB in sync with models

## Next planned steps
- Phase 9: Photos (before / after)
- File storage
- EXIF validation

## Project Status (MVP)

Current state:
- Django backend (API-first)
- Auth via Token (cleaner login)
- Jobs:
  - today jobs list
  - check-in / check-out with geo validation
  - checklist (per job)
- PDF job report generation (ReportLab)

Status:
- Core MVP functionality implemented
- Tests passing
- API tested via curl
