# MASTER_CONTEXT_ANALYTICS.md

*operational transparency, trends, performance*

---

## 1. Назначение Analytics

Analytics в CleanProof отвечает **не на вопрос “что произошло”**,
а на вопрос:

> **насколько стабильно и качественно работает операционная система**

Это:

* не отчётность,
* не история,
* не owner-summary.

Это **рабочий дашборд менеджера**.

---

## 2. Чёткое разграничение слоёв

Analytics существует **строго поверх**:

* execution layer (jobs, photos, checklist);
* SLA layer (status + reasons).

Analytics:

* **ничего не меняет**;
* **ничего не исправляет**;
* **ничего не интерпретирует вручную**.

Только агрегирует факты.

---

## 3. Analytics — read-only слой

Принцип жёсткий:

> **Analytics никогда не пишет данные**

Она:

* не создаёт записей;
* не хранит состояния;
* не вводит свои модели.

Все данные берутся из:

* `Job`
* `JobChecklistItem`
* `JobPhoto`
* SLA helper (`compute_sla_status_and_reasons_for_job`)

---

## 4. Источник времени и выборки

Analytics считает **только завершённые jobs**:

* `status = completed`
* используется **`actual_end_time.date`**
* scheduled-даты игнорируются

Это исключает:

* двойной учёт;
* “висящие” jobs;
* искажения периода.

---

## 5. Базовые управленческие вопросы Analytics

Analytics обязана отвечать на 5 вопросов:

1. Сколько jobs реально завершено?
2. Насколько часто jobs завершаются вовремя?
3. Насколько стабильно соблюдается proof?
4. Где и у кого возникают SLA-нарушения?
5. Это случайность или системная проблема?

Если метрика не отвечает ни на один из этих вопросов — она лишняя.

---

## 6. Analytics v1 — зафиксированный набор метрик

### KPI Summary

Используются как **верхний слой обзора**:

* jobs completed
* on-time completion rate
* proof completion rate
* average job duration
* issues detected
* issue rate

Все KPI:

* считаются на backend;
* сравниваются с предыдущим периодом той же длины;
* возвращаются с дельтами.

---

### Trends

Analytics v1 включает тренды:

* Jobs Completed (per day)
* Average Job Duration (per day)
* Proof Completion Trend:

  * before-photo rate
  * after-photo rate
  * checklist completion rate
* SLA Violations Trend:

  * jobs completed
  * jobs with violations
  * violation rate

Тренды:

* без “дыр” по датам;
* даже если значение = 0.

---

## 7. Performance analytics

Analytics v1 включает performance-блоки:

### Cleaner Performance

По каждому клинеру:

* jobs completed
* avg duration
* on-time rate
* proof rate
* issues count

Сортировка:

* сначала по issues (desc),
* затем по jobs completed.

### Location Performance

Аналогично:

* где чаще ломается SLA,
* где стабильность ниже.

---

## 8. SLA в Analytics

Analytics **не считает SLA**.

Она:

* читает `sla_status`;
* агрегирует `sla_reasons`;
* группирует по cleaner / location / date.

Ключевой блок:

* SLA Breakdown

  * violation rate
  * top reasons
  * top cleaners
  * top locations

---

## 9. Analytics ≠ Reports

Это принципиально разные вещи.

### Analytics:

* интерактивна;
* работает с диапазонами дат;
* показывает тренды;
* используется ежедневно менеджером.

### Reports:

* статичны;
* narrative;
* owner-facing;
* без трендов и сравнений.

Любая попытка “добавить график в Report” — архитектурная ошибка.

---

## 10. Analytics ≠ Job History

Job History:

* полный архив;
* фильтрация по статусам;
* аудит и разбор конкретных jobs.

Analytics:

* агрегаты;
* относительные показатели;
* системные сигналы.

Analytics никогда не заменяет History.

---

## 11. Drill-down как допустимое исключение

Единственное допустимое “погружение”:

```
Analytics metric
→ SLA reason
→ список jobs (read-only)
→ Job Details
```

Это:

* не изменение слоя;
* не новая логика;
* а навигация по фактам.

---

## 12. Что запрещено добавлять в Analytics

Запрещено:

* бизнес-правила;
* автоматические решения;
* “оценки качества” без SLA;
* рекомендации “что делать”;
* ML / AI / scoring без отдельного продукта.

Analytics — зеркало, не советник.

---

## 13. Будущее Analytics (за границей v1)

Допустимые расширения:

* Performance scoring (поверх SLA);
* Threshold-based alerts;
* Client-specific SLA profiles.

Недопустимые:

* влияние на execution;
* автокоррекция данных;
* скрытие проблем.

---

## 14. Статус Analytics слоя

**Analytics v1 — реализован и зафиксирован.**

Он:

* использует живые backend-данные;
* не содержит mock’ов;
* масштабируется без изменения execution-ядра.

---

### Статус файла

**Зафиксирован. Source of truth для Analytics.**

---
