# Analytics API v1 — Operational Analytics (IMPLEMENTED)

Этот документ фиксирует **фактические контракты Analytics API v1**,  
которые реализованы в CleanProof backend и используются в UI.

Analytics API v1 — это **операционный аналитический слой**.

Он отвечает на вопрос:

> **«Что фактически произошло?»**

Он **не интерпретирует причины отклонений** —  
это задача SLA Engine и Reports.

This API exposes operational analytics derived from proof data.
It is not intended for business intelligence or predictive analysis.

---

## When to use this document

Обращаться к этому файлу **не каждый день**, а когда:

- добавляется **новая аналитическая метрика**;
- возникают вопросы «почему цифры такие»;
- требуется проверить **семантику времени**;
- Analytics, SLA и Reports начинают расходиться;
- планируется Analytics v2 или рефакторинг агрегаций.

Для UI, интеграций и текущей работы  
используются `DEV_BRIEF.md` и `API_CONTRACTS.md`.

---

## Статус

* Core endpoints — **IMPLEMENTED**
* Используются в:
  - Manager Analytics UI
  - SLA Performance
  - Weekly / Monthly Reports
* Source of truth:
  - `Job`
  - `compute_sla_status_and_reasons_for_job(job)`

Оптимизации (кэш, агрегирующие таблицы, события)
**не входят в v1** и не влияют на контракты.

---

## Общие правила

* Все эндпоинты доступны **только менеджеру**
* Скоуп — **в пределах компании**
* Auth: `TokenAuthentication`
* Формат дат: `YYYY-MM-DD`
* Все расчёты выполняются на backend
* Frontend **не пересчитывает** агрегаты

---

## Time Semantics & Source-of-Truth Rules

Analytics API v1 использует **жёстко зафиксированную семантику времени**.

Это сделано намеренно, чтобы:
- избежать расхождений;
- не смешивать planning, execution и communication.

---

### 1. Job-based metrics

* Все job-метрики считаются:
  - **по дате фактического завершения job**
  - source field: `actual_end_time`
* `scheduled_date` **никогда не используется** в аналитике.

---

### 2. Duration-based metrics

* Фактическая длительность job:
```

actual_end_time - actual_start_time

````
* Плановые времена в расчёты не входят.

---

### 3. Proof-related metrics

* Proof completion оценивается **в момент completion job**
* Время загрузки отдельных элементов proof не влияет на аналитику
* Поздние загрузки **не смещают** дату метрик

---

### 4. SLA-related metrics

* SLA violations:
- атрибутируются к дате завершения job;
- не зависят от момента обнаружения или репорта.

---

### 5. Communication & delivery events

* Email и PDF:
- имеют собственные timestamps (`created_at`);
- **не входят** в Analytics API v1.
* Communication ≠ execution analytics.

---

## 1. Summary — KPI cards

`GET /api/manager/analytics/summary/`

Query:
- `from`
- `to`

Response:
```json
{
"jobs_completed": 24,
"on_time_completion_rate": 0.94,
"proof_completion_rate": 0.98,
"avg_job_duration_hours": 2.4,
"issues_detected": 3
}
````

**Семантика зафиксирована и стабильна.**

Status: **IMPLEMENTED**

---

## 2. Jobs Completed — Daily trend

`GET /api/manager/analytics/jobs-completed/`

Считает количество завершённых job по `actual_end_time`.

Status: **IMPLEMENTED**

---

## 3. Job Duration — Trend

`GET /api/manager/analytics/job-duration/`

Средняя фактическая длительность job.

Status: **IMPLEMENTED**

---

## 4. Proof Completion Trend

`GET /api/manager/analytics/proof-completion/`

Отражает completion:

* before photo
* after photo
* checklist

Status: **IMPLEMENTED**

---

## 5. Cleaner Performance

`GET /api/manager/analytics/cleaners-performance/`

Используется для:

* таблиц;
* сравнений;
* SLA Performance UI.

Status: **IMPLEMENTED**

---

## SLA Integration (v1)

Analytics API **не рассчитывает SLA**.

Источник истины:

* `compute_sla_status_and_reasons_for_job(job)`

Analytics:

* агрегирует violations;
* не анализирует причины во времени.

---

## Relationship to SLA & Reports

### Analytics

* фиксирует **факты**;
* без интерпретации.

### SLA Engine

* определяет:

  * violated / ok;
  * причины.

### Reports

* превращают факты в:

  * narrative;
  * PDF;
  * email;
  * audit trail.

---

## Design Principle

> **Analytics defines facts.
> SLA and Reports define interpretation.**

---

## Operational Analytics v1 — scope

Этот слой **считается завершённым**.

Он:

* стабилен;
* используется в UI;
* служит фундаментом для Analytics v2.

---

## Future extensions (out of scope v1)

* временные SLA-тренды;
* deeper breakdown;
* advanced comparisons;
* caching & pre-aggregation.

Эти изменения **не должны ломать v1 контракты**.

```

