# MASTER_CONTEXT_ARCHITECTURE.md

*System architecture, boundaries, source of truth*

---

## 1. Назначение документа

Этот файл отвечает на один ключевой вопрос:

> **Где в системе находится истина и по каким правилам мы можем её расширять**

Он используется:

* при добавлении новых API;
* при работе с аналитикой и отчётами;
* при интеграции биллинга;
* как защита от архитектурного “расползания”.

Если решение противоречит этому файлу — решение неверное.

---

## 2. Общая архитектурная модель

CleanProof — **backend-first, API-first система**.

```text
Mobile (Cleaner)        Manager Portal (Web)
        │                       │
        └────────── API (DRF) ──┘
                    │
              Domain Logic
                    │
                Database
```

Ни mobile, ни web **не содержат бизнес-логики**.

---

## 3. Backend — единственный source of truth

Backend:

* владеет данными;
* владеет правилами;
* вычисляет SLA;
* валидирует execution;
* формирует отчёты.

Frontend и Mobile:

* не интерпретируют правила;
* не пересчитывают показатели;
* не принимают решений.

Любая логика, дублируемая во frontend, считается ошибкой.

---

## 4. Backend stack (зафиксировано)

**Технологии:**

* Django
* Django REST Framework
* TokenAuthentication

**Принципы:**

* синхронная логика;
* отсутствие очередей;
* отсутствие async;
* предсказуемость важнее масштабируемости.

**База данных:**

* SQLite локально;
* схема совместима с PostgreSQL.

---

## 5. Структура backend-проекта

```text
backend/
├── apps/
│   ├── accounts/        # Users, Company, roles
│   ├── jobs/            # Job domain models
│   ├── locations/       # Locations, checklist templates
│   └── api/             # Единственный API-слой
│       ├── views.py
│       ├── analytics_views.py
│       ├── serializers.py
│       ├── urls.py
│       └── pdf.py
├── config/
└── manage.py
```

### Жёсткое правило

* **Только `apps/api` может содержать API-эндпоинты**
* `apps.jobs.views` — legacy, не расширять
* Новая логика → только через `apps/api`

---

## 6. Модель ролей

В системе есть две роли:

### Manager

* создаёт jobs;
* управляет cleaners и locations;
* видит SLA, analytics, reports;
* может делать force-complete.

### Cleaner

* не создаёт jobs;
* не редактирует planning;
* выполняет job строго через mobile;
* не видит аналитику и отчёты.

Роли проверяются **на backend**, не в UI.

---

## 7. API-first как контракт, а не удобство

API — это контракт, а не “то, что удобно фронту”.

Правила:

* изменения API не должны ломать существующих клиентов;
* переименование полей запрещено без слоя совместимости;
* старые поля могут жить параллельно новым.

Proof-поля — яркий пример:

* backend возвращает и старые, и новые ключи;
* фронт не обязан мигрировать мгновенно.

---

## 8. Execution vs Analytics vs Reports

Система разделена на слои:

### Execution layer

* jobs
* check-in / check-out
* photos
* checklist

### SLA layer

* `compute_sla_status_and_reasons_for_job`
* force-complete overrides

### Analytics layer

* агрегаты;
* тренды;
* performance;
* read-only.

### Reports layer

* narrative summaries;
* PDF;
* email delivery;
* audit trail.

Ни один слой **не вмешивается** в предыдущий.

---

## 9. Analytics как read-only надстройка

Analytics:

* не имеет своих моделей;
* не хранит состояния;
* не меняет execution.

Она:

* агрегирует completed jobs;
* использует `actual_end_time`;
* работает только по фактам.

Если аналитика требует изменения execution — это ошибка проектирования.

---

## 10. Frontend (Manager Portal)

**Стек:**

* React
* TypeScript
* Vite
* Tailwind
* shadcn/ui

**Принципы:**

* API-first;
* минимальный state;
* отсутствие бизнес-логики;
* UI отражает backend-состояние.

Manager Portal — **окно в систему**, а не её мозг.

---

## 11. Mobile (Cleaner App)

**Стек:**

* Expo
* React Native
* TypeScript

**Принципы:**

* offline-friendly, но backend-authoritative;
* минимальный UX, максимум дисциплины;
* никакой “умной” логики.

Mobile не решает, **можно ли** что-то сделать.
Он только спрашивает backend.

---

## 12. Commercial enforcement

Коммерческие состояния:

* trial active;
* trial expired;
* company blocked.

Реализуются:

* только на backend;
* через явные флаги;
* с машиночитаемыми кодами ошибок.

Frontend:

* не угадывает состояние;
* не “прячет” кнопки без причины;
* объясняет пользователю, что происходит.

---

## 13. Тесты как верхний уровень истины

**Passing tests = truth**

Если:

* код противоречит тесту → код неверен;
* документация противоречит тесту → документация устарела;
* UI “ожидает” другого поведения → UI ошибочен.

---

## 14. Что запрещено архитектурно

Запрещено:

* добавлять async / очереди “на будущее”;
* переносить логику во frontend;
* считать SLA в JS;
* делать execution через web;
* менять модели без крайней необходимости;
* усложнять систему без продуктовой причины.

---

## 15. Роль этого файла

`MASTER_CONTEXT_ARCHITECTURE.md`:

* фиксирует границы системы;
* объясняет “почему так, а не иначе”;
* защищает проект от медленного распада.

Меняется редко.
Любое изменение — осознанное и аргументированное.

---

### Статус файла

**Зафиксирован. Архитектура стабильна.**

---
