# Cleaning SaaS — FACTUAL PROJECT STATE (v6.1)

**Формат статусов:**
✅ сделано 🟡 частично / в процессе ⛔ не делали

Документ фиксирует **исключительно текущее фактическое состояние проекта**,
без планов, гипотез, предположений и дорожных карт.

---

## 🧠 СЛОЙ 0 — ЯДРО (Backend + Manager Portal)

### Backend (Django, API-first)

#### Core execution (Jobs)

* Jobs: модель, связи, бизнес-логика ✅
* Статусный флоу: `scheduled → in_progress → completed` ✅

**Check-in / Check-out**

* GPS check-in/out
* distance validation ✅

**Checklist**

* JobChecklistItem
* required items
* toggle / bulk update ✅

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
* используется теми же данными, что UI (single source of truth) ✅

👉 Backend-ядро job execution **полностью закрыто**.

---

### Backend — Trial & Usage Layer

*(состояние подтверждено, без изменений)*

👉 Trial / usage слой — **backend source of truth**
с реальным enforcement лимитов trial.

---

## Manager Portal (Web)

### Jobs / Execution

* Today Jobs (API-driven) ✅
* Job Details (manager view) ✅

**Job Details включает:**

* timeline из `check_events`
* фото before / after
* чеклист (read-only)
* GPS check-in/out + Open in Maps
* Generate PDF (реальный backend PDF)
* Download PDF (без повторной генерации)

**Email Job PDF**

* endpoint: `POST /api/manager/jobs/<id>/report/email/`
* используется тот же PDF-код, что и Download
* email:

  * по умолчанию `request.user.email`
  * кастомный email через `{ "email": "..." }`
* UI:

  * модалка выбора получателя
  * inline success / error
* каждая отправка логируется в БД ✅

---

### Job Planning

*(состояние подтверждено)*

👉 Работает end-to-end: API → UI → Create Job → refetch.

---

### Job History

*(состояние подтверждено)*

---

## Performance Layer (SLA aggregation v1.5 → Reports v2)

### Backend

* `/api/manager/performance/?date_from=&date_to=` ✅

**SLA aggregation**

* `/api/manager/reports/weekly/` ✅
* `/api/manager/reports/monthly/` ✅

**PDF**

* `/api/manager/reports/weekly/pdf/` ✅
* `/api/manager/reports/monthly/pdf/` ✅

**Email**

* `/api/manager/reports/weekly/email/` ✅
* `/api/manager/reports/monthly/email/` ✅
* принимают optional `email`
* fallback → `request.user.email`
* формируют тот же PDF, что `/pdf/`
* реальная отправка через Django Email backend
* каждая отправка логируется в БД ✅

---

### ReportEmailLog (Reports v2)

**Модель**

* company
* user (инициатор)
* kind: `job_report / weekly_report / monthly_report`
* job (для job-level)
* period_from / period_to
* to_email
* subject
* status: `sent / failed`
* error_message
* created_at

**Логируются**

* Job PDF email
* Weekly report email
* Monthly report email

Доступно в Django Admin (фильтры, поиск, хронология) ✅

---

### Frontend (Performance & Reports)

* `/performance` ✅
* `/reports` ✅

**Reports UI**

* переключение Weekly / Monthly (frontend state)
* summary, таблицы, top reasons
* View jobs → Job History с фильтрами
* Download PDF (backend)
* Email report:

  * выбор email
  * loading / success / error
  * отправка на любой email (SMTP-зависимо)

👉 Performance Layer полностью замкнут:
Execution → SLA → Reports → PDF → Email → Audit log

---

## Trial UX (Manager Dashboard & Settings)

*(состояние подтверждено)*

👉 Информационный слой, синхронизированный
с реальными backend-ограничениями.

---

## Commercial enforcement & Read-only mode

### Backend

* `Company.is_active`, `suspended_at`, `suspended_reason` ✅
* backend-permissions для suspended компаний (`company_blocked`) ✅
* error codes:

  * `company_blocked`
  * `trial_expired`

Backend остаётся **единственным источником истины**.

### Frontend

* Create Job:

  * read-only warning при `company_blocked`
  * кнопка дизейблится
  * данные остаются доступными
* `trial_expired` → upgrade message
* обработка ошибок по machine-readable `code`

👉 Реализован полноценный read-only режим.

---

## Reports → Evidence (SLA drill-down, v1)

### Backend

* `GET /api/manager/reports/violations/jobs/`
* фильтры: reason, period_start, period_end
* возвращает jobs с SLA reason
* использует ту же SLA-логику (single source of truth)
* read-only

### Frontend

* маршрут `/reports/violations`
* экран доступен только по прямому переходу
* View job → `/jobs/:id`

👉 Evidence слой архитектурно закрыт и не влияет на execution.

---

## Reports & PDF — подтверждённое поведение

* Weekly / Monthly SLA PDF доступны
* Owner overview реализован в UI
* Отдельного owner-PDF нет — **осознанно**

---

## Checklist Templates & Job Checklist

### Backend

* ChecklistTemplate / ChecklistTemplateItem ✅
* автоинициализация дефолтных шаблонов ✅
* валидация шаблонов ✅
* интеграция с Create Job Meta API ✅

### Frontend

* стабильный список шаблонов
* preview + details в Create Job Drawer

👉 Блок чеклистов **закрыт и прод-готов**.

---

## Cleaner Authentication

* Phone + PIN login
* Cleaner accounts создаёт manager
* PIN reset — только manager
* PIN показывается один раз
* self-service recovery отсутствует (by design) ✅

---

## Job PDF (v1)

* полный evidence PDF:

  * summary
  * notes
  * photos
  * checklist
  * audit
  * SLA & proof
* SLA — backend source of truth
* mobile enforcement снижает нарушения
* reports не затронуты

---

## Job PDF Email (v1)

* бизнес-ориентированный email
* SLA статус и контекст job
* каждая отправка логируется

---

## Email History (Reports)

✅ Реализована единая история email-отправок:

* job / weekly / monthly
* фильтры, календарь
* статусы доставки
* серверная пагинация

Раздел стабилен и готов для аудита.

---

## Job Timeline & SLA — текущее состояние

* полный execution flow
* violations-only filter как audit-инструмент
* empty violations = fully compliant job
* логика финальная для v1 / v1.5

---

## SLA & Force-complete (фактическое состояние)

### Backend

* `POST /api/manager/jobs/{id}/force-complete/`
* manager-only
* переводит job в completed
* SLA = violated
* сохраняет:

  * force_completed
  * force_completed_at
  * force_completed_by

### Frontend

* SLA & Proof блок
* Force complete modal
* выбор причины + комментарий
* автообновление Job details

### ⚙️ SLA Engine

SLA Engine v1 — ядро ✅
- compute_sla_status_and_reasons_for_job(job) — единый helper для оценки SLA.
- Используется в:
  - Analytics summary (`issues_detected`);
  - Cleaner performance (`issues`);
  - Weekly/Monthly reports (violations, top_reasons).

SLA Analytics v2 — причинный разбор нарушений ✅
- Реализован эндпоинт:
  - `GET /api/manager/analytics/sla-breakdown/`
- Даёт:
  - общее количество нарушений и долю (`violation_rate`);
  - разбивку по причинам (`reasons`);
  - топ клинеров по нарушениям (`top_cleaners`);
  - топ локаций по нарушениям (`top_locations`).

Ограничения текущей версии:
- нет real-time алертов и конфигурируемых порогов;
- нет отдельного UI-таба “SLA Performance” (используется Analytics page);
- нет клиент-специфичных SLA-профилей (всё считается по общим правилам).

---

## Analytics

### Analytics — v1 (Manager) ✅

* KPI summary — live data
* Cleaner performance — live data
* Trends (jobs, duration, proof) — live data
* Unified date range (date_from / date_to)
* UI подключён к backend без моков

Ограничения v1:
* без SLA breakdown по причинам
* без алертов и скоринга
```
👉 Важно: **убираем противоречие** — сейчас Analytics реально работает.

## Analytics / SLA

* SLA-движок (расчёт `sla_status` + `sla_reasons` для Job) — ✅ реализован.
* `GET /api/manager/analytics/sla-breakdown/` — ✅ реализован, подключён к Analytics UI
  (блок SLA Performance: overview, violation reasons, hotspots по клинерам и локациям).
* Reports (weekly / monthly) пока считают SLA отдельно — 🟡 потенциальная зона
  для выравнивания с Analytics v1/v2.


### Статус

* UI + API контракт — ✅
* Live data — ⛔ (кроме summary и cleaners)

### Реализовано

* `/analytics`
* KPI summary (backend)
* Cleaner performance (backend)
* layout fixes

### Не реализовано

* trends с live data
* кеширование
* связка с SLA Engine

### Design decision: Jobs vs Job History separation

**Jobs** and **Job History** are intentionally separated by purpose.

- **Jobs** is an operational view for day-to-day management:
  - Today — jobs scheduled for the current date.
  - Upcoming — jobs scheduled for future dates.
  - Completed — only recently completed jobs (last 30 days by default).

- **Job History** is the full historical archive:
  - supports arbitrary date ranges,
  - filtering and analysis,
  - used for audits, reporting, and long-term review.

This decision prevents the Jobs page from becoming overloaded over time,
keeps the UI performant, and clearly separates operational workflows
from historical analysis.

---
**Design decision: Reports vs Analytics separation**

Reports and Analytics are intentionally separated at both UX and conceptual levels.

* **Reports** answer *“what is happening and who is accountable”*.
* **Analytics** answer *“how metrics evolve over time and why”*.

Design rules:

* Reports are narrative and summary-driven.
* Reports use the same data source as PDFs and emails.
* Owner access is summary-only, manager access is actionable.
* No drill-down from owner view is allowed.

** Design decision: Layout widening**

Main application layout was adjusted to reduce excessive horizontal whitespace.
Content containers now align closer to the sidebar, improving readability of tables and reports without changing navigation or sidebar behavior.

Design decisions

Reports ≠ Analytics ≠ Job History — слои сознательно разведены.
Owner view зафиксирован как read-only summary без drill-down.
SLA-метрики считаются от violations, а не от jobs.

Current state

Исправлены и стабилизированы Analytics и SLA breakdown (/manager/analytics/sla-breakdown/).
Добавлен /api/health/ для web/mobile liveness-check.
Reports и Email history приведены к единой логике и визуальной иерархии.

Mobile Cleaner App успешно работает с тем же backend, что и web (единый API_BASE_URL).
---
### ## SLA Violations Drill-down — Completed

Завершена реализация функциональности просмотра задач с нарушениями SLA из отчётов.

**Фактическое состояние:**

* реализован backend-эндпоинт `/api/manager/reports/violations/jobs/`
* входные параметры валидируются на уровне API
* Reports-страница формирует корректные переходы с фильтрами
* `ViolationJobsPage` стабильно обрабатывает все сценарии входа
* реализован Quick view через `JobSidePanel`
* доступен переход к полной странице job’а

Функциональность считается завершённой в рамках текущей версии.
Дополнительные расширения (пагинация, экспорт, дополнительные фильтры) вынесены за рамки текущего этапа.

---



## 📱 СЛОЙ 1 — Mobile Cleaner App

Статус: 🟡 рабочий MVP

---

## 🧑‍💼 СЛОЙ 2 — Управление

*(состояние подтверждено)*

---

## 💳 СЛОЙ 3 — Коммерция

*(без биллинга)*

---

## 🌍 СЛОЙ 4 — Маркетинг

*(базовые заготовки)*

---

## 📊 СЛОЙ 5 — Масштаб

* Performance aggregation ✅
* Reports (UI + PDF + Email + audit) ✅
* Analytics ✅
* Multi-company roles ⛔
* Audit exports ⛔

---

## Known limitations

* Нет биллинга
* Trial ограничен jobs / cleaners
* Mobile camera UX нестабилен
* Locations без advanced-фич
* Email-доставка зависит от SMTP

---

## Итог

* Reports v2 реализован полностью
* Архитектура чистая, без костылей
* Проект — **операционный SaaS без биллинга**,
  с реальной управленческой ценностью и контролем качества

**Статусы:**

* Слой 0 — DONE ✅
* Слой 1 — MVP 🟡
* Слой 2 — стабилен ✅
* Слой 3 — готов к биллингу
* Слои 4–5 — заделы

👉 Устойчивый продукт с micro-SLA, audit trail, trial-onboarding и self-serve signup.
