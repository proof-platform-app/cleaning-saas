# Analytics API v1 — semantics only

Документ фиксирует **первую версию контрактов Analytics API**.
Это не план на немедленную разработку, а «каркас» для будущей реализации.

* Текущий статус всех эндпоинтов: **NOT IMPLEMENTED**
* Модели / миграции под них специально не заводим
* Реализация позже должна опираться на уже существующие сущности:

  * `Job`
  * `JobCheckEvent`
  * `JobChecklistItem`
  * `JobPhoto`
* Любая оптимизация (агрегирующие таблицы, кэш, события) — **отдельным этапом**, поверх этих контрактов.

Общее:

* Все эндпоинты доступны **только менеджеру** (`User.role = manager`)
* Скоуп — **в пределах компании** (`user.company`)
* Auth: `TokenAuthentication` (как во всём API)
* Формат дат: `YYYY-MM-DD` (UTC или GST — TBD, но единообразно для всех эндпоинтов)

---

## 📌 Time Semantics & Source-of-Truth Rules

Analytics API v1 relies on **explicit and consistent time semantics** to avoid ambiguity between planning, execution and communication layers.

For every metric, the **source-of-truth timestamp** must be clearly defined.

### Core rules

1. **Job-based metrics**

   * Metrics related to job completion (e.g. `jobs_completed`, trends):

     * are calculated based on the date of **actual job completion**;
     * source field: `actual_end_time`.
   * `scheduled_date` is never used for analytics aggregation.

2. **Duration-based metrics**

   * Job duration is calculated strictly as:

     * `actual_end_time - actual_start_time`.
   * Scheduled times are not used for duration analytics.

3. **Proof-related metrics**

   * Proof completion (before / after / checklist) is evaluated:

     * at the moment the job reaches `completed` status;
     * regardless of when individual proof items were uploaded.
   * Late uploads do not shift the analytics date.

4. **Issue / SLA-related metrics**

   * Issues are attributed to the **job completion date**,
     not to the date when the issue was detected or reported.

5. **Communication & delivery events**

   * Email delivery and report sending:

     * use their own timestamps (`created_at`);
     * are explicitly **out of scope** for Analytics API v1 metrics.
   * Communication timelines must never affect execution analytics.

---

## 1. Summary — верхние KPI карточки

Карточки на странице Analytics:

* Jobs Completed Today
* On-time Completion
* Proof Completion
* Avg Job Duration
* Issues Detected

### 1.1. Endpoint

`GET /api/manager/analytics/summary/`

### Query params

* `from` — дата начала периода, `YYYY-MM-DD` (обязательный)
* `to` — дата конца периода, включительно, `YYYY-MM-DD` (обязательный)

Примеры:

```http
GET /api/manager/analytics/summary/?from=2026-01-06&to=2026-01-19
```

Response (v1, минимальный):

```json
{
  "jobs_completed": 24,
  "on_time_completion_rate": 0.94,
  "proof_completion_rate": 0.98,
  "avg_job_duration_hours": 2.4,
  "issues_detected": 3
}
```

### Семантика полей

* **jobs_completed** — количество job в статусе `completed` за период
  (по `actual_end_time`).

* **on_time_completion_rate** — доля job, завершённых не позже планового времени окончания
  (TBD: точное правило формализуется при реализации).

* **proof_completion_rate** — доля job, где выполнен полный proof:

  * есть before_photo;
  * есть after_photo;
  * все обязательные пункты чек-листа закрыты.

* **avg_job_duration_hours** — средняя фактическая длительность job
  (`actual_start_time → actual_end_time`) в часах.

* **issues_detected** — количество job, помеченных как issue
  (TBD: источник флага будет определён при реализации).

Status: **NOT IMPLEMENTED**

---

## 2. Jobs Completed — дневной тренд

Линейный график «Jobs Completed» за период.

### 2.1. Endpoint

`GET /api/manager/analytics/jobs-completed/`

### Query params

* `from` — дата начала, `YYYY-MM-DD` (обязательный)
* `to` — дата конца, `YYYY-MM-DD` (обязательный)

Пример:

```http
GET /api/manager/analytics/jobs-completed/?from=2026-01-06&to=2026-01-19
```

Response:

```json
[
  { "date": "2026-01-06", "jobs_completed": 18 },
  { "date": "2026-01-07", "jobs_completed": 21 },
  { "date": "2026-01-08", "jobs_completed": 23 }
]
```

### Семантика

* **date** — календарная дата (по `actual_end_time`).
* **jobs_completed** — количество job в статусе `completed` за день.

Status: **NOT IMPLEMENTED**

---

## 3. Job Duration — тренд средней длительности

Линейный график «Average Job Duration» за период.

### 3.1. Endpoint

`GET /api/manager/analytics/job-duration/`

### Query params

* `from` — дата начала, `YYYY-MM-DD` (обязательный)
* `to` — дата конца, `YYYY-MM-DD` (обязательный)

Пример:

```http
GET /api/manager/analytics/job-duration/?from=2026-01-06&to=2026-01-19
```

Response:

```json
[
  { "date": "2026-01-06", "avg_job_duration_hours": 2.3 },
  { "date": "2026-01-07", "avg_job_duration_hours": 2.1 },
  { "date": "2026-01-08", "avg_job_duration_hours": 2.5 }
]
```

### Семантика

* **avg_job_duration_hours** — средняя фактическая длительность job за день
  (`actual_end_time - actual_start_time`).

Status: **NOT IMPLEMENTED**

---

## 4. Proof Completion Trend

Столбчатый график: Before / After / Checklist completion per day.

### 4.1. Endpoint

`GET /api/manager/analytics/proof-completion/`

### Query params

* `from` — дата начала, `YYYY-MM-DD` (обязательный)
* `to` — дата конца, `YYYY-MM-DD` (обязательный)

Пример:

```http
GET /api/manager/analytics/proof-completion/?from=2026-01-06&to=2026-01-19
```

Response:

```json
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
```

### Семантика

* **before_photo_rate** — доля job с загруженным before-фото.
* **after_photo_rate** — доля job с загруженным after-фото.
* **checklist_rate** — доля job, где все обязательные пункты чек-листа закрыты.

Оценка производится **в момент completion job**, независимо от времени загрузки отдельных элементов proof.

Status: **NOT IMPLEMENTED**

---

## 5. Cleaner Performance — таблица по клинерам

Таблица «Cleaner Performance» + бар-чарт «Jobs by Cleaner».

### 5.1. Endpoint

`GET /api/manager/analytics/cleaners-performance/`

### Query params

* `from` — дата начала, `YYYY-MM-DD` (обязательный)
* `to` — дата конца, `YYYY-MM-DD` (обязательный)

Пример:

```http
GET /api/manager/analytics/cleaners-performance/?from=2026-01-06&to=2026-01-19
```

Response:

```json
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
```

### Семантика

* **jobs_completed** — количество job в статусе `completed` за период.
* **avg_duration_hours** — средняя фактическая длительность job.
* **on_time_rate** — доля job, завершённых вовремя.
* **proof_rate** — доля job с полным proof.
* **issues** — количество job с issue-флагом.

Status: **NOT IMPLEMENTED**

---

## 6. Правила развития API

Эти контракты — источник истины для Analytics.

Backward-compatible изменения:

* добавление новых полей в ответы;
* добавление новых query-параметров с дефолтами.

Breaking changes:

* переименование полей;
* изменение семантики без смены имени;
* изменение обязательности параметров.

Такие изменения допускаются **только с явной версией v2** и новой секцией в этом файле.

---

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
### Operational Analytics — v1 scope (current)

Версия Analytics v1 покрывает базовые операционные метрики и служит «точкой входа» в аналитику:

- `analytics/summary` — агрегированное состояние выполнения работ за период (jobs completed, on-time rate, proof rate, avg duration, issues);
- `analytics/cleaners-performance` — сравнительная аналитика по клинерам (объём работ, скорость, соблюдение сроков, качество пруфов, нарушения).

Данный слой фиксирует **факт выполнения работ**, но не раскрывает причины отклонений.

**Следующий этап (v1.1 / v2):**
расширение аналитики за счёт SLA-движка:
- breakdown нарушений по типам (late start, checklist_not_completed, proof_missing и т.д.);
- временные графики SLA-соблюдения;
- связка аналитики с checklist templates и PlanningMeta.
