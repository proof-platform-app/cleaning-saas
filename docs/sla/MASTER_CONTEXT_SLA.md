# MASTER_CONTEXT_SLA.md

*micro-SLA, proof-first, violations as facts*

---

## 1. Назначение SLA в CleanProof

SLA в CleanProof — **не отчёт и не наказание**.
Это автоматический слой **оценки корректности выполнения job по фактам**.

Ключевая идея:

> **Если нет доказательства — работа считается выполненной с нарушением.**

SLA:

* не требует ручной проверки;
* не хранится в базе как состояние;
* всегда вычисляется из фактов выполнения.

---

## 2. SLA как вычисляемый слой (важно)

SLA:

* **не модель**;
* **не поле в БД как источник истины**;
* **не UI-логика**.

Для каждой завершённой job backend вычисляет:

```ts
sla_status: "ok" | "violated"
sla_reasons: string[]
```

Единственный источник расчёта — backend helper:

```
compute_sla_status_and_reasons_for_job(job)
```

---

## 3. Что проверяет SLA (micro-SLA v1)

SLA v1 проверяет **базовую дисциплину выполнения job**.

### Основные группы проверок

#### 1. Тайминг

* `late_start`
* `late_finish`

#### 2. Proof completeness

* `missing_before_photo`
* `missing_after_photo`

#### 3. Checklist

* `checklist_not_completed`

  * хотя бы один required-пункт не закрыт

#### 4. Execution integrity

* `check_in_missing`
* `check_out_missing`

---

## 4. Happy-path (нормальный сценарий)

Если клинер:

1. сделал check-in;
2. загрузил before-photo;
3. закрыл обязательные пункты чек-листа;
4. загрузил after-photo;
5. сделал check-out;

→ backend выставляет:

```json
{
  "sla_status": "ok",
  "sla_reasons": []
}
```

Это **ожидаемое и желаемое состояние** системы.

---

## 5. Нарушение SLA — это факт, а не ошибка

SLA violation означает:

* job **завершена**;
* работа **выполнена**;
* но **доказательства или процесс неполные**.

Это важно:

* SLA ≠ job failure;
* SLA ≠ cleaner fault;
* SLA = сигнал для менеджера.

---

## 6. Force-complete (manager override)

### Зачем существует

Реальность:

* клиент ушёл;
* фото не загрузилось;
* интернет пропал;
* чек-лист закрыт устно.

Без override система либо ломается, либо врёт.

---

### Как работает force-complete

Force-complete:

* доступен **только менеджеру**;
* переводит job в `completed`;
* **всегда** приводит к SLA violation.

Менеджер обязан указать:

* `reason_code`;
* `comment`.

Backend фиксирует:

```json
{
  "force_completed": true,
  "force_completed_at": "...",
  "force_completed_by": { "id": 3, "full_name": "..." }
}
```

И добавляет причину в `sla_reasons`.

---

## 7. Override никогда не скрывает нарушение

Принцип жёсткий и неизменный:

> **Любой override = SLA violated**

Это гарантирует:

* честную аналитику;
* прозрачность для owner’а;
* доверие к системе.

---

## 8. SLA и чек-лист — единая связка

Checklist templates — часть SLA.

Связка фиксирована:

```
Checklist Template
→ JobChecklistItem snapshot
→ Checklist completion
→ SLA status
```

Если required-пункты не закрыты:

* SLA = violated;
* причина = `checklist_not_completed`.

---

## 9. Где SLA используется

SLA **не живёт сам по себе**.

Он используется в:

* Job Details (badge + reasons);
* Job History;
* Analytics (violations, trends);
* Reports (weekly / monthly);
* PDF;
* Email reports.

Ни один из этих слоёв **не считает SLA сам**.

---

## 10. SLA и Analytics — разделение ответственности

* SLA отвечает на вопрос:
  **“Эта job выполнена корректно?”**

* Analytics отвечает на вопрос:
  **“Где и почему система даёт сбои?”**

Analytics:

* агрегирует `sla_status`;
* группирует `sla_reasons`;
* не меняет правила SLA.

---

## 11. SLA philosophy (коротко)

* Proof-first.
* Violations — исключения, а не норма.
* Zero-violation — положительный результат.
* Override всегда виден.
* Backend — единственный арбитр.

---

## 12. Что запрещено делать с SLA

Запрещено:

* считать SLA во frontend;
* “смягчать” нарушения в UI;
* скрывать override;
* хранить SLA как редактируемое состояние;
* добавлять причины без backend-логики.

---

## 13. Статус SLA слоя

**micro-SLA v1 — завершён и стабилен.**

Готов к:

* Analytics v2;
* performance scoring;
* alerts;
* client-specific SLA profiles.

Без изменения execution-ядра.

---

### Статус файла

**Зафиксирован. Является source of truth для SLA.**

---
