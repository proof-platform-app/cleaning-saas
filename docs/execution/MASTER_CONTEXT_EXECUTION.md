# MASTER_CONTEXT_EXECUTION.md

*Execution flows, enforcement, proof mechanics*

---

## 1. Назначение этого документа

Этот файл фиксирует **как CleanProof реально работает на уровне исполнения**.

Он отвечает на вопросы:

* какие флоу считаются каноническими;
* где backend является источником истины;
* какие действия разрешены и запрещены;
* что считается выполненной работой с точки зрения системы.

Документ используется:

* при разработке новых фич;
* при проверке, “ломаем ли мы ядро”;
* как опора при QA и дебаге.

---

## 2. Базовый execution-цикл (канонический)

Единственный канонический цикл job в CleanProof:

> **Planning → Execution → Proof → Completion → Reporting**

Никакие альтернативные “короткие пути” не считаются нормой.

---

## 3. Planning (Manager)

Planning — это **управленческая подготовка**, не коммуникация.

Менеджер:

* заранее создаёт job;
* выбирает cleaner;
* выбирает location;
* выбирает checklist template;
* задаёт дату (и опционально время).

Важно:

* job **не отправляется** клинеру;
* job **не подтверждается** клинером;
* backend сам делает job доступным клинеру в день выполнения.

Planning — read/write зона **только для Manager**.

---

## 4. Delivery to Cleaner (implicit)

Клинер не получает “assign”.

В день выполнения:

* мобильное приложение запрашивает `GET /api/jobs/today/`;
* backend возвращает актуальный список job’ов.

Backend — **единственный источник истины**:

* нет push-уведомлений;
* нет подтверждений получения;
* нет промежуточных состояний.

---

## 5. Execution (Mobile / Cleaner)

Execution возможен **только через mobile**.

Последовательность жёсткая:

1. `scheduled`
2. **Check-in** → `in_progress`
3. Before photo
4. Checklist
5. After photo
6. **Check-out** → `completed`

UI не должен позволять нарушать порядок.
Backend обязан **жёстко валидировать** каждый шаг.

---

## 6. Check-in / Check-out как якорные события

Check-in и Check-out — это **факты**, а не кнопки.

Каждый из них:

* проверяет GPS-дистанцию;
* проверяет роль и доступ;
* логируется как `JobCheckEvent`;
* влияет на SLA.

Без check-in:

* job не может считаться начатым.

Без check-out:

* job не может считаться корректно завершённым
  (кроме force-complete).

---

## 7. Proof как доменная сущность

Proof — не UI-концепт, а **доменный слой**.

Proof включает:

* check-in / check-out;
* фото before / after;
* checklist completion;
* audit timeline;
* SLA-оценку.

Proof всегда вычисляется **на backend**.
Frontend только отображает состояние.

---

## 8. Checklist execution

Checklist:

* создаётся как snapshot при создании job;
* не зависит от изменений шаблонов в будущем;
* содержит required / optional пункты.

Правила:

* required пункты обязательны;
* неполный required checklist → SLA violation;
* checklist completion проверяется при check-out.

---

## 9. Photos execution

Фото — часть proof, а не “медиа”.

Правила:

* ровно одно before и одно after;
* after нельзя без before;
* загрузка только при `in_progress`;
* EXIF проверяется, если доступен;
* формат нормализуется на backend.

Фото без EXIF:

* разрешены,
* помечаются флагом `exif_missing`.

---

## 10. Completion ≠ SLA OK

`status=completed` означает:

* job закрыт по жизненному циклу.

`sla_status=ok | violated` означает:

* качество выполнения.

Это **два независимых измерения**.

---

## 11. Force-complete (manager-only exception)

Force-complete — контролируемое исключение.

Менеджер может:

* завершить job без полного proof;
* обязан указать причину и комментарий.

Последствия:

* `status=completed`;
* `sla_status=violated`;
* причина фиксируется навсегда;
* событие видно в отчётах и analytics.

Force-complete:

* не скрывает проблему;
* делает её явной.

---

## 12. SLA как вычисляемый слой

SLA:

* не хранится как “истина” в базе;
* вычисляется на backend из фактов.

Источник истины:

* фактические события;
* состояние proof;
* explicit override (force-complete).

Frontend:

* не считает SLA;
* не интерпретирует причины;
* только отображает.

---

## 13. Reporting как read-only слой

Reports:

* не влияют на execution;
* не меняют данные;
* используют те же источники, что UI.

PDF и Email:

* формируются из одного backend-источника;
* всегда соответствуют UI.

---

## 14. Read-only режим (commercial enforcement)

В режиме block / expired trial:

* execution запрещён;
* данные доступны;
* отчёты читаемы;
* доказательства сохраняются.

Это важно для доверия и compliance.

---

## 15. Что считается нарушением execution-ядра

Недопустимо:

* менять порядок execution;
* завершать job без proof без фиксации SLA violation;
* считать SLA на фронте;
* добавлять “shortcut”-кнопки;
* позволять mobile обходить backend-валидации.

---

## 16. Роль этого файла

`MASTER_CONTEXT_EXECUTION.md`:

* фиксирует **как система реально работает**;
* защищает execution-ядро от деградации;
* используется как reference при спорах “а можно ли так”.

Меняется редко и осознанно.

---

### Статус файла

**Зафиксирован. Execution-ядро стабильно.**

---
