# Analytics API v1 — semantics only

Документ фиксирует **первую версию контрактов Analytics API**.  
Это не план на немедрую разработку, а «каркас» для будущей реализации.

- Текущий статус всех эндпоинтов: **NOT IMPLEMENTED**
- Модели / миграции под них специально не заводим
- Реализация позже должна опираться на уже существующие сущности:
  - `Job`
  - `JobCheckEvent`
  - `JobChecklistItem`
  - `JobPhoto`
- Любая оптимизация (агрегирующие таблицы, кэш, события) — **отдельным этапом**, поверх этих контрактов.

Общее:

- Все эндпоинты доступны **только менеджеру** (`User.role = manager`)
- Скоуп — **в пределах компании** (`user.company`)
- Auth: `TokenAuthentication` (как во всём API)
- Формат дат: `YYYY-MM-DD` (UTC или GST — TBD, но единообразно для всех эндпоинтов)

---

## 1. Summary — верхние KPI карточки

Карточки на странице Analytics:

- Jobs Completed Today
- On-time Completion
- Proof Completion
- Avg Job Duration
- Issues Detected

### 1.1. Endpoint

`GET /api/manager/analytics/summary/`

### Query params

- `from` — дата начала периода, `YYYY-MM-DD` (обязательный)
- `to` — дата конца периода, включительно, `YYYY-MM-DD` (обязательный)

Примеры:

```http
GET /api/manager/analytics/summary/?from=2026-01-06&to=2026-01-19
Response (v1, минимальный)
json
Копировать код
{
  "jobs_completed": 24,
  "on_time_completion_rate": 0.94,
  "proof_completion_rate": 0.98,
  "avg_job_duration_hours": 2.4,
  "issues_detected": 3
}
Семантика полей:

jobs_completed — количество job в статусе completed за период.

on_time_completion_rate — доля job, завершённых не позже планового времени окончания (TBD: точное правило будем формализовать при реализации).

proof_completion_rate — доля job, где выполнен полный proof:

есть before_photo

есть after_photo

все обязательные пункты чек-листа закрыты.

avg_job_duration_hours — средняя фактическая длительность job (по actual_start_time → actual_end_time) в часах.

issues_detected — количество job, отмеченных как «issue» (TBD: источник статуса issue или набора флагов определим позже).

Status: NOT IMPLEMENTED

2. Jobs Completed — дневной тренд
Линейный график «Jobs Completed» за период.

2.1. Endpoint
GET /api/manager/analytics/jobs-completed/

Query params
from — дата начала, YYYY-MM-DD (обязательный)

to — дата конца, YYYY-MM-DD (обязательный)


GET /api/manager/analytics/jobs-completed/?from=2026-01-06&to=2026-01-19
Response

[
  { "date": "2026-01-06", "jobs_completed": 18 },
  { "date": "2026-01-07", "jobs_completed": 21 },
  { "date": "2026-01-08", "jobs_completed": 23 }
]
Семантика:

date — календарная дата.

jobs_completed — количество job в статусе completed за этот день.

Status: NOT IMPLEMENTED

3. Job Duration — тренд средней длительности
Линейный график «Average Job Duration» за период.

3.1. Endpoint
GET /api/manager/analytics/job-duration/

Query params
from — дата начала, YYYY-MM-DD (обязательный)

to — дата конца, YYYY-MM-DD (обязательный)


GET /api/manager/analytics/job-duration/?from=2026-01-06&to=2026-01-19
Response

[
  { "date": "2026-01-06", "avg_job_duration_hours": 2.3 },
  { "date": "2026-01-07", "avg_job_duration_hours": 2.1 },
  { "date": "2026-01-08", "avg_job_duration_hours": 2.5 }
]
Семантика:

avg_job_duration_hours — средняя фактическая длительность job за день, в часах.

Status: NOT IMPLEMENTED

4. Proof Completion Trend
Столбчатый график: Before / After / Checklist completion per day.

4.1. Endpoint
GET /api/manager/analytics/proof-completion/

Query params
from — дата начала, YYYY-MM-DD (обязательный)

to — дата конца, YYYY-MM-DD (обязательный)


GET /api/manager/analytics/proof-completion/?from=2026-01-06&to=2026-01-19
Response

[
  {
    "date": "2026-01-06",
    "before_photo_rate": 0.95,
    "after_photo_rate": 0.92,
    "checklist_rate": 0.88
  },
  {
    "date": "2026-01-07",
    "before_photo_rate": 0.97,
    "after_photo_rate": 0.94,
    "checklist_rate": 0.90
  }
]
Семантика:

before_photo_rate — доля job за день, где загружено before-фото.

after_photo_rate — доля job за день, где загружено after-фото.

checklist_rate — доля job за день, где все обязательные пункты чек-листа закрыты.

Базируется на текущей логике proof из Job Planning:

before_uploaded

after_uploaded

checklist_completed

Status: NOT IMPLEMENTED

5. Cleaner Performance — таблица по клинерам
Таблица «Cleaner Performance» + бар-чарт «Jobs by Cleaner».

5.1. Endpoint
GET /api/manager/analytics/cleaners-performance/

Query params
from — дата начала, YYYY-MM-DD (обязательный)

to — дата конца, YYYY-MM-DD (обязательный)


GET /api/manager/analytics/cleaners-performance/?from=2026-01-06&to=2026-01-19
Response

[
  {
    "cleaner_id": 3,
    "cleaner_name": "Ahmed Hassan",
    "jobs_completed": 48,
    "avg_duration_hours": 2.2,
    "on_time_rate": 0.98,
    "proof_rate": 1.0,
    "issues": 0
  },
  {
    "cleaner_id": 4,
    "cleaner_name": "Fatima Al-Rashid",
    "jobs_completed": 45,
    "avg_duration_hours": 2.3,
    "on_time_rate": 0.96,
    "proof_rate": 0.98,
    "issues": 1
  }
]
Семантика:

cleaner_id, cleaner_name — идентификатор и имя клинера.

jobs_completed — количество job в статусе completed за период.

avg_duration_hours — средняя длительность job для этого клинера.

on_time_rate — доля job, завершённых вовремя.

proof_rate — доля job с полным proof (before + after + checklist).

issues — количество job с issue (точное определение будет описано при реализации).

Status: NOT IMPLEMENTED

6. Правила развития API
Эти контракты — источник истины для Analytics.
Любая реализация или оптимизация должна соответствовать описанным схемам.

Backward-compatible изменения:

можно добавлять новые поля в ответ (UI их просто не будет использовать);

можно добавлять новые query-параметры с дефолтами.

Breaking changes:

переименование существующих полей;

изменение семантики полей без смены имени;

изменение обязательности параметров.

Такие изменения допускаются только с явной пометкой v2 и новой секцией в этом файле.

В этой версии (v1) мы сознательно:

не вводим отдельные таблицы для агрегатов,

не обсуждаем обновление данных в реальном времени,

считаем, что «обновление раз в N минут» — задача будущего этапа.

## 📌 Relationship to SLA Performance & Reports (UI Layer)

Analytics API v1 is designed as a **foundational data layer**, not as a one-to-one mapping to UI pages.

At the current stage, CleanProof exposes **multiple manager-facing views** that consume analytics-related data with different intent:

### SLA Performance (Operational View)

* Focus: **problem detection and accountability**
* Typical questions:

  * Who violates SLA most often?
  * Which locations generate repeated issues?
* Characteristics:

  * Narrow scope
  * SLA-specific metrics only
  * Short date ranges
* This view may consume:

  * Aggregated SLA counters
  * Violation reasons
  * Job-level SLA flags

This view is **not full analytics**, but an operational lens built on top of analytics primitives.

---

### Reports (Owner / Stakeholder View)

* Focus: **summary and communication**
* Typical questions:

  * How did we perform this week/month?
  * What should I report to an owner or client?
* Characteristics:

  * Pre-aggregated
  * Opinionated structure (weekly / monthly)
  * Human-readable
* Reports reuse analytics data, but apply:

  * Fixed periods
  * Simplified metrics
  * Narrative grouping (top reasons, top locations, etc.)

Reports are considered a **presentation layer**, not analytics exploration.

---

### Analytics (Future Unified View)

Analytics API v1 exists to support a future **unified Analytics page**, which may consolidate:

* SLA Performance
* Reports
* Trend-based analytics (jobs over time, duration, compliance rates)

In future UI iterations:

* SLA Performance and Reports may become **sub-tabs** of a single **Analytics** section
* Analytics API endpoints will serve as the **single source of truth**
* UI organization may evolve without requiring changes to Analytics API contracts

---

### Design Principle

> **Analytics API defines facts.
> SLA and Reports define interpretations of those facts.**

This separation allows CleanProof to:

* Introduce advanced analytics incrementally
* Avoid breaking UI when navigation changes
* Support multiple UX layers (operational, managerial, executive) on the same data

---
