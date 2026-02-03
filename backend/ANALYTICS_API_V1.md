# Analytics API v1 — operational analytics (implemented)

Документ фиксирует **фактические контракты Analytics API v1**,
которые реализованы в CleanProof backend и используются в UI.

Analytics API v1 — это **операционный аналитический слой**:
он отвечает на вопрос **«что произошло»**,  
но не интерпретирует причины отклонений (это задача SLA Engine и Reports).

---

## Статус

* Core endpoints — **IMPLEMENTED**
* Используются в:
  * Manager Analytics UI
  * SLA Performance
  * Weekly / Monthly Reports
* Source of truth:
  * `Job`
  * `compute_sla_status_and_reasons_for_job(job)`

Оптимизации (агрегирующие таблицы, кэш, события) —
**отдельный этап**, поверх этих контрактов.

---

## Общие правила

* Все эндпоинты доступны **только менеджеру** (`User.role = manager`)
* Скоуп — **в пределах компании** (`user.company`)
* Auth: `TokenAuthentication`
* Формат дат: `YYYY-MM-DD`
* Источник времени:
  * все агрегаты считаются по `actual_*_time`,
  * время нормализуется на backend (UTC / GST единообразно)

---

## 📌 Time Semantics & Source-of-Truth Rules

Analytics API v1 relies on **explicit and consistent time semantics**
to avoid ambiguity between planning, execution and communication layers.

For every metric, the **source-of-truth timestamp** is clearly defined.

### Core rules

### 1. Job-based metrics

* Метрики, связанные с выполнением job (`jobs_completed`, тренды):
  * считаются по дате **фактического завершения job**;
  * source field: `actual_end_time`.
* `scheduled_date` **никогда не используется** для аналитических агрегатов.

### 2. Duration-based metrics

* Длительность job рассчитывается строго как:
  * `actual_end_time - actual_start_time`.
* Плановые времена не участвуют в аналитике длительности.

### 3. Proof-related metrics

* Proof completion (before / after / checklist):
  * оценивается **в момент перехода job в `completed`**;
  * не зависит от времени загрузки отдельных элементов proof.
* Поздние загрузки не смещают аналитическую дату.

### 4. Issue / SLA-related metrics

* Нарушения SLA:
  * атрибутируются **к дате завершения job**;
  * не зависят от момента обнаружения или репорта.

### 5. Communication & delivery events

* Email, PDF и другие коммуникации:
  * используют собственные timestamps (`created_at`);
  * **намеренно исключены** из Analytics API v1.
* Коммуникации не влияют на execution-аналитику.

---

## 1. Summary — верхние KPI карточки

Карточки на странице Analytics:

* Jobs Completed
* On-time Completion
* Proof Completion
* Avg Job Duration
* Issues Detected

### 1.1. Endpoint

`GET /api/manager/analytics/summary/`

### Query params

* `from` — дата начала периода, `YYYY-MM-DD` (обязательный)
* `to` — дата конца периода, включительно, `YYYY-MM-DD` (обязательный)

Пример:

```http
GET /api/manager/analytics/summary/?from=2026-01-06&to=2026-01-19
````

### Response

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

* **jobs_completed** — количество job в статусе `completed`
  за период (по `actual_end_time`).

* **on_time_completion_rate** — доля job,
  завершённых не позже планового времени окончания
  (`actual_end_time <= scheduled_end_datetime`).

* **proof_completion_rate** — доля job,
  в которых выполнен полный proof:

  * загружено before-фото;
  * загружено after-фото;
  * все обязательные пункты чек-листа закрыты.

* **avg_job_duration_hours** — средняя фактическая длительность job
  (`actual_start_time → actual_end_time`) в часах.

* **issues_detected** — количество job,
  для которых SLA Engine вернул статус `violated`
  (`compute_sla_status_and_reasons_for_job(job)`).

Status: **IMPLEMENTED (Analytics API v1)**

---

## 2. Jobs Completed — дневной тренд

Линейный график «Jobs Completed» за период.

### 2.1. Endpoint

`GET /api/manager/analytics/jobs-completed/`

### Query params

* `from` — дата начала, `YYYY-MM-DD`
* `to` — дата конца, `YYYY-MM-DD`

### Response

```json
[
  { "date": "2026-01-06", "jobs_completed": 18 },
  { "date": "2026-01-07", "jobs_completed": 21 },
  { "date": "2026-01-08", "jobs_completed": 23 }
]
```

### Семантика

* **date** — календарная дата (по `actual_end_time`).
* **jobs_completed** — количество завершённых job за день.

Status: **IMPLEMENTED**

---

## 3. Job Duration — тренд средней длительности

Линейный график «Average Job Duration».

### 3.1. Endpoint

`GET /api/manager/analytics/job-duration/`

### Response

```json
[
  { "date": "2026-01-06", "avg_job_duration_hours": 2.3 },
  { "date": "2026-01-07", "avg_job_duration_hours": 2.1 }
]
```

### Семантика

* **avg_job_duration_hours** —
  средняя фактическая длительность job за день
  (`actual_end_time - actual_start_time`).

Status: **IMPLEMENTED**

---

## 4. Proof Completion Trend

График completion по proof-элементам.

### 4.1. Endpoint

`GET /api/manager/analytics/proof-completion/`

### Response

```json
[
  {
    "date": "2026-01-06",
    "before_photo_rate": 0.95,
    "after_photo_rate": 0.92,
    "checklist_rate": 0.88
  }
]
```

### Семантика

* **before_photo_rate** — доля job с before-фото.
* **after_photo_rate** — доля job с after-фото.
* **checklist_rate** — доля job,
  где закрыты все обязательные пункты чек-листа.

Status: **IMPLEMENTED**

---

## 5. Cleaner Performance — аналитика по клинерам

Таблица + бар-чарт «Jobs by Cleaner».

### 5.1. Endpoint

`GET /api/manager/analytics/cleaners-performance/`

### Response

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
  }
]
```

### Семантика

* **jobs_completed** — количество job за период.
* **avg_duration_hours** — средняя длительность job.
* **on_time_rate** — доля job, завершённых вовремя.
* **proof_rate** — доля job с полным proof.
* **issues** — количество job с SLA-нарушениями.

Status: **IMPLEMENTED**

---

## SLA Integration (v1)

Analytics API v1 **не рассчитывает SLA самостоятельно**.

Источник истины по нарушениям:

* helper `compute_sla_status_and_reasons_for_job(job)`
* поле `job.sla_reasons` (включая force-complete overrides)

Analytics использует SLA:

* агрегированно (`issues_detected`, `violation_rate`);
* без детализации причин во времени.

Детализация причин и breakdown по типам
реализованы в SLA Engine v2
(`GET /api/manager/analytics/sla-breakdown/`).

---

## 📌 Relationship to SLA Performance & Reports

### SLA Performance (Operational View)

* Фокус: **обнаружение проблем и ответственность**
* Использует:

  * SLA breakdown;
  * violation rate;
  * агрегаты по клинерам и локациям.
* Является операционным слоем поверх Analytics API.

---

### Reports (Owner / Stakeholder View)

* Фокус: **сводка и коммуникация**
* Характеристики:

  * фиксированные периоды (weekly / monthly);
  * предагрегированные данные;
  * narrative presentation.
* Reports используют Analytics и SLA Engine
  как **source of truth**, не пересчитывая метрики.

---

### Analytics (Unified View — future)

Analytics API v1 является фундаментом
для будущей единой Analytics-страницы,
которая может объединять:

* SLA Performance
* Reports
* Trend-based analytics

Изменение структуры UI
не требует изменения Analytics API контрактов.

---

## Design Principle

> **Analytics API defines facts.
> SLA and Reports define interpretations of those facts.**

---

## Operational Analytics — v1 scope (current)

Analytics v1 покрывает базовые операционные метрики:

* `analytics/summary`
* `analytics/jobs-completed`
* `analytics/job-duration`
* `analytics/proof-completion`
* `analytics/cleaners-performance`

Этот слой фиксирует **факт выполнения работ**.

---

## Next steps (v1.1 / v2)

* временные тренды SLA-нарушений;
* breakdown SLA по типам во времени;
* связка аналитики с checklist templates и PlanningMeta;
* advanced operational analytics.

