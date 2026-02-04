# Cleaning SaaS — FACTUAL PROJECT STATE (v7.0)

Обновлено: 2026-02-04

**Формат статусов:**  
✅ сделано 🟡 частично / в процессе ⛔ не делали

Документ фиксирует **исключительно текущее фактическое состояние проекта**.  
Без планов, гипотез, обещаний и дорожных карт.

---

## 🧠 СЛОЙ 0 — ЯДРО (Backend + Manager Portal)

### Backend (Django, API-first)

#### Core execution (Jobs)

* Jobs: модель, связи, бизнес-логика ✅
* Статусный флоу: `scheduled → in_progress → completed` ✅

**Check-in / Check-out**
* GPS check-in/out
* distance validation (≤ 100 м) ✅

**Checklist**
* JobChecklistItem (snapshot)
* required items enforcement
* toggle / bulk update (cleaner-only) ✅

**Photos before / after**
* EXIF extraction
* distance validation
* normalization to JPEG
* storage + File model
* связь с Job ✅

**Audit**
* JobCheckEvent (полный audit trail) ✅

**Job PDF**
* реальная генерация бинарного PDF
* endpoint `/api/jobs/<id>/report/pdf/`
* single source of truth (те же данные, что UI)
* используется для download и email ✅

👉 Backend-ядро job execution **полностью закрыто**.

---

### Backend — Trial & Commercial Enforcement

* Trial lifecycle (create / active / expired) ✅
* Usage tracking (jobs / cleaners) ✅
* Enforcement через error codes:
  * `trial_expired`
  * `trial_jobs_limit_reached`
  * `company_blocked` ✅
* `Company.is_active`, suspended state ✅

👉 Backend — **единственный источник истины**.

---

## 🧑‍💼 Manager Portal (Web)

### Jobs / Execution

* Today Jobs (API-driven) ✅
* Job Details (manager view) ✅

**Job Details включает:**
* timeline (`JobCheckEvent`)
* фото before / after
* чеклист (read-only)
* GPS + Open in Maps
* SLA status + reasons
* Generate / Download PDF
* Email PDF (см. ниже)

---

### Job PDF Email (Manager)

* endpoint: `POST /api/manager/jobs/<id>/report/email/`
* используется тот же PDF, что и download
* email:
  * default → `request.user.email`
  * optional custom email
* UI:
  * modal выбора получателя
  * loading / success / error
* каждая отправка логируется в БД ✅

---

### Job Planning

* `/planning` — работает end-to-end ✅
* API → UI → Create Job → refetch
* editing existing jobs — ⛔ (осознанно)

---

### Job History

* Полный архив jobs
* Фильтры, периоды, SLA-фильтр
* Основа для audit и reports ✅

---

## 📊 Performance & SLA Layer

### SLA Engine (micro-SLA v1)

* `sla_status` (`ok` / `violated`) ✅
* `sla_reasons[]` (machine-readable) ✅
* единый helper:
  `compute_sla_status_and_reasons_for_job(job)` ✅
* используется в:
  * Job Details
  * Planning
  * History
  * Reports
  * Analytics ✅

---

### Force-complete (Manager-only)

**Backend**
* `POST /api/manager/jobs/{id}/force-complete/`
* переводит job → `completed`
* SLA = `violated`
* сохраняет audit-поля:
  * `force_completed`
  * `force_completed_at`
  * `force_completed_by` ✅

**Frontend**
* Force-complete modal
* выбор reason + comment
* auto-refetch Job Details ✅

---

## 📈 Reports v2 (PDF + Email + Audit)

### Backend

* Weekly reports:
  * `/api/manager/reports/weekly/`
  * `/api/manager/reports/weekly/pdf/`
  * `/api/manager/reports/weekly/email/` ✅
* Monthly reports:
  * `/api/manager/reports/monthly/`
  * `/api/manager/reports/monthly/pdf/`
  * `/api/manager/reports/monthly/email/` ✅
* Performance aggregation:
  * completed jobs only
  * SLA-based calculations ✅

---

### ReportEmailLog (Audit)

**Модель**
* company
* user (инициатор)
* kind: `job_report / weekly_report / monthly_report`
* job / period_from / period_to
* to_email
* subject
* status: `sent / failed`
* error_message
* created_at

Логируется:
* Job PDF email
* Weekly report email
* Monthly report email ✅

---

### Frontend (Reports)

* `/reports` ✅
* Owner view — read-only summary
* Manager view — actionable blocks:
  * top SLA reasons
  * cleaners with issues
  * locations with issues
* Download PDF
* Email report (любой email)
* Email history (`/reports/email-logs`) ✅

👉 Цепочка полностью замкнута:  
Execution → SLA → Reports → PDF → Email → Audit

---

## 🔍 Reports → Evidence (SLA Drill-down)

**Backend**
* `GET /api/manager/reports/violations/jobs/`
* фильтры: reason / cleaner / location / period
* SLA single source of truth
* read-only ✅

**Frontend**
* `/reports/violations`
* вход только через контекстные ссылки
* Quick view (`JobSidePanel`)
* переход к полной странице job’а ✅

---

## 📊 Analytics (Manager)

### Analytics — v1 (DONE)

* `/analytics` маршрут ✅
* KPI summary (live)
* Trends:
  * jobs completed
  * duration
  * proof completion
  * SLA violations
* Cleaner performance
* SLA Performance:
  * overview
  * violation reasons
  * hotspots (cleaners / locations)
* Unified date range
* completed jobs only
* frontend без бизнес-логики ✅

👉 Analytics **реально работает**, не stub.

---

## 📋 Checklist Templates

### Backend

* ChecklistTemplate / ChecklistTemplateItem ✅
* автоинициализация дефолтных шаблонов ✅
* Create Job Meta API интеграция ✅

### Frontend

* стабильный список шаблонов
* preview + details в Create Job Drawer ✅

---

## 📱 СЛОЙ 1 — Mobile Cleaner App

**Статус:** 🟡 рабочий MVP

* Login (PIN)
* Today Jobs
* Job Details
* Check-in / Check-out
* Photos before / after
* Checklist completion
* Timeline
* Job PDF
* GPS enforcement

Execution-логика закрыта, дальше — UI-полировка.

---

## 🧑‍💼 СЛОЙ 2 — Управление

* Manager Portal стабилен ✅
* Planning / History / Reports / Analytics работают ✅

---

## 💳 СЛОЙ 3 — Коммерция

* Trial lifecycle ✅
* Usage limits (jobs / cleaners) ✅
* Billing ⛔

---

## 🌍 СЛОЙ 4 — Маркетинг

* Landing + Demo (static) 🟡

---

## 📊 СЛОЙ 5 — Масштаб

* SLA aggregation ✅
* Performance layer ✅
* Reports v2 (PDF + Email + Audit) ✅
* Analytics v1 ✅
* Multi-company roles ⛔
* Data export ⛔

---

## Known limitations

* Нет биллинга
* Trial ограничен jobs / cleaners
* Mobile camera UX требует полировки
* Locations без advanced features
* Email delivery зависит от SMTP

---

## Итог

* Core execution — DONE ✅
* SLA + Performance — DONE ✅
* Reports v2 — DONE ✅
* Analytics — DONE ✅
* Product = **операционный SaaS без биллинга**  
  с реальной управленческой ценностью, доказательствами и audit trail.

**Статусы слоёв:**
* Слой 0 — DONE ✅
* Слой 1 — MVP 🟡
* Слой 2 — DONE ✅
* Слой 3 — готов к биллингу
* Слои 4–5 — заделы
```

---

