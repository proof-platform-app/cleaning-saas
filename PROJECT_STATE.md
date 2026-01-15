# Cleaning SaaS — Project State

## Project Overview
Cleaning SaaS — backend-first MVP для **контроля выполнения клининговых работ**.

Проект решает задачу:
- фиксации факта выполнения работы,
- контроля качества,
- доказательной базы (чек-листы, фото, аудит, PDF).

Frontend будет подключаться позже.  
Backend считается **основой продукта**.

---

## Roles

### Cleaner
- видит свои jobs
- выполняет check-in / check-out
- отмечает чек-лист
- загружает фото before / after
- генерирует PDF отчёт

### Manager
- создаёт locations, jobs, checklist templates
- назначает cleaners
- контролирует выполнение
- просматривает фото, чек-листы, audit
- скачивает PDF отчёты

---

## Architecture (Fixed)

### Django apps
- `apps.accounts`
  - User
  - Company
  - roles: manager / cleaner

- `apps.locations`
  - Location
  - ChecklistTemplate
  - ChecklistTemplateItem

- `apps.jobs`
  - Job
  - JobChecklistItem (snapshot)
  - JobCheckEvent
  - File
  - JobPhoto

- `apps.api`
  - DRF API
  - auth
  - jobs
  - checklist
  - photos
  - pdf

---

## What works (DONE)

### Auth
- `POST /api/auth/login/`
- email + password
- TokenAuthentication
- role-based access
- tests passing

---

### Jobs (Cleaner flow)
- `GET /api/jobs/today/`
- `POST /api/jobs/<id>/check-in/`
  - GPS validation (≤ 100m)
  - status: scheduled → in_progress
- `POST /api/jobs/<id>/check-out/`
  - GPS validation
  - checklist validation
  - status: in_progress → completed
- audit via `JobCheckEvent`

---

### Checklist
- snapshot from template
- toggle + bulk update
- доступ:
  - только назначенный cleaner
  - только when job = in_progress

---

### Photos (Phase 9 — DONE)
- `GET /api/jobs/<id>/photos/`
- `POST /api/jobs/<id>/photos/`
- before / after rules:
  - after нельзя без before
  - только 1 фото каждого типа
- EXIF extraction:
  - latitude / longitude / datetime
  - GPS validation (≤ 100m)
  - exif_missing flag
- storage через `MEDIA_ROOT`
- tests passing

---

### PDF
- `POST /api/jobs/<id>/report/pdf/`
- ReportLab
- включает:
  - job summary
  - checklist
  - audit events
- корректные headers
- скачивается через curl / browser

---

## Current Status
- Django system check: OK
- Migrations applied
- Tests passing (`manage.py test`)
- API протестирован через curl
- Фото реально сохраняются
- PDF валиден

---

## Known Limitations (MVP by design)
- Нет frontend UI
- Нет object storage (S3)
- Нет background jobs
- Нет публичного доступа к файлам

---

## Next Steps (Post-MVP)
- Frontend integration
- S3 / STORAGES
- Permissions hardening
- Pagination / filtering
- Manager-side APIs

---

## Workflow Rules
- Passing tests = source of truth
- Не ломать существующий API без причины
- Все изменения — пошагово
- Файлы:
  - маленькие → целиком
  - большие → точечные патчи
