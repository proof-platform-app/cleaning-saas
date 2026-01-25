````markdown
# API Contracts (DEV) — Cleaning SaaS

Документ фиксирует контракт между Backend (Django / DRF) и Frontend (React / Vite / Mobile).
Считается **единственным источником правды** для фронтендов и мобилки. Любые ломающие изменения сначала попадают сюда.

---

## 0. Общий контекст

### 0.1. Технологический стек

* **Backend:** Django + Django REST Framework (DRF), API-first.
* **Frontends:**
  * Manager Portal: React + Vite.
  * Mobile Cleaner App: Expo + React Native.

### 0.2. Base URL (DEV)

```text
http://127.0.0.1:8001
```

Все эндпоинты ниже указываются относительно этого base URL в DEV.

### 0.3. Авторизация

Во всех запросах после успешного логина:

```http
Authorization: Token <TOKEN>
```

### 0.4. DEV-пользователи

```text
Cleaner: cleaner@test.com / Test1234!
Manager: manager@test.com / Test1234!
```

> Эти же данные зашиты в dev-конфиги фронтов (web + mobile).

---

### 0.5. API Contract — Job lifecycle & GPS (DEV notes)

Backend API контракт в рамках данного этапа не изменялся.

Подтверждено:

* Check-in / Check-out используют существующие endpoints.
* Фото before / after загружаются через существующий photos endpoint.
* Checklist работает через bulk update / toggle endpoints.

DEV-особенность:

* В dev-режиме мобильное приложение может подставлять GPS координаты задачи
  (location_latitude / location_longitude),
  чтобы backend воспринимал клинера как находящегося "на месте".

Важно:

* Это dev-only логика.
* Backend не содержит dev-исключений.
* В production GPS всегда берётся из реального устройства.

Контракт API считается стабильным и зафиксированным.

---

### 0.6. Landing & Proof Narrative Alignment

Лендинг CleanProof зафиксирован как отражение реального API-контракта продукта.
Все заявленные шаги пользовательского флоу (check-in, photos, checklist, check-out, PDF)
соответствуют фактическим backend-событиям и данным, которые могут быть подтверждены API.

Никаких маркетинговых обещаний вне технической реальности продукта не используется.
Лендинг продаёт только то, что действительно фиксируется и может быть выдано
в виде доказательства через API.

Demo page and landing page content are strictly aligned with existing API behavior and backend guarantees. All demonstrated flows (job creation, check-in/out, checklist completion, photo capture, PDF generation) correspond to real API events and persisted data. No demo or marketing materials reference functionality that is not backed by current API contracts. Demo navigation is intentionally minimal and does not expose internal product routes or authentication flows.

#### Marketing & Demo Alignment

CleanProof landing page (/cleanproof) and demo request page (/cleanproof/demo) are purely marketing-facing and do not expose or simulate any product functionality. All descriptions, screenshots, and narrative elements strictly reflect existing API contracts and real backend events (job creation, check-in/out, checklist completion, photo proof, PDF generation). No marketing content implies features, workflows, or system behavior that are not backed by current API guarantees. The demo request flow does not create accounts, trigger backend actions, or require authentication.

#### Location coordinates as source of truth

Location `latitude` and `longitude` values are treated as the authoritative source of truth for all location-based operations. These coordinates are used for cleaner navigation, GPS check-in/check-out validation, and inclusion in proof artifacts (e.g. PDF reports). Address and name fields are stored as descriptive metadata only and are not used for geolocation or validation logic. Any future geocoding or autocomplete features must not override explicitly stored coordinates.

#### Pricing & Trial Flow (v1)

Кнопка `Start 7-day trial` на странице `/cleanproof/pricing` инициирует старт бесплатного пробного периода тарифа Standard.  
На текущем этапе кнопка ведёт на существующий экран авторизации (`/`) с передачей параметра `?trial=standard`.  
Backend обязан поддерживать сценарий создания компании в статусе `trial` сроком 7 дней после успешного логина или регистрации.  
Платёжные данные на этапе trial не требуются.  
По окончании trial доступ ограничивается до выбора платного тарифа.

#### Marketing Pages & Demo Flow Alignment

Public CleanProof pages (Landing, Pricing, Product Updates, Contact, Demo Request) are informational and do not introduce any new backend behavior beyond existing API contracts. All calls-to-action (Request demo, Contact form, Pricing CTAs) are intentionally decoupled from direct account creation and billing logic. Demo requests and contact submissions are treated as pre-sales inputs and do not create system entities such as users, companies, jobs, or locations. Any future trial or subscription flow must be explicitly backed by new API endpoints and persisted data models before being referenced in marketing or pricing pages.

---

## 1. Auth API

### 1.1. Общий логин (используется cleaner)

**Endpoint**

```http
POST /api/auth/login/
Content-Type: application/json
```

**Request (JSON)**

```json
{
  "email": "cleaner@test.com",
  "password": "Test1234!"
}
```

**Response 200 OK**

```json
{
  "token": "string",
  "user_id": 3,
  "email": "cleaner@test.com",
  "full_name": "Dev Cleaner",
  "role": "cleaner"
}
```

**Правила / ошибки**

* Пустой `email` или `password` → `400 Bad Request`

  ```json
  {
    "detail": "Email and password are required."
  }
  ```

* Неверная пара логин/пароль → `401 Unauthorized`

  ```json
  { "detail": "User not found" }
  ```

  или

  ```json
  { "detail": "Invalid credentials" }
  ```

После успешного логина **все последующие запросы** идут с заголовком:

```http
Authorization: Token <token>
```

---

### 1.2. Логин менеджера

**Endpoint**

```http
POST /api/manager/auth/login/
Content-Type: application/json
```

**Request (JSON)**

```json
{
  "email": "manager@test.com",
  "password": "Test1234!"
}
```

**Response 200 OK**

```json
{
  "token": "string",
  "user_id": 2,
  "email": "manager@test.com",
  "full_name": "Dev Manager",
  "role": "manager"
}
```

**Правила / ошибки**

Те же, что и для `/api/auth/login/`:

* `400 Bad Request` при пустых полях.
* `401 Unauthorized` при неверных кредах.

---

## 2. Cleaner API

Все cleaner-эндпоинты требуют:

* валидный токен:

  ```http
  Authorization: Token <CLEANER_TOKEN>
  ```

* роль пользователя: `role = "cleaner"`.

---

### 2.1. Today Jobs (список задач клинера на сегодня)

**Endpoint**

```http
GET /api/jobs/today/
```

**Назначение**

Вернуть список **сегодняшних** job для залогиненного клинера.

**Response 200 OK (ПЛОСКИЙ контракт)**

```json
[
  {
    "id": 5,
    "location__name": "Dubai Marina Tower",
    "scheduled_date": "2026-01-17",
    "scheduled_start_time": null,
    "scheduled_end_time": null,
    "status": "scheduled"
  }
]
```

**Фиксация контракта**

* `location__name` — простая строка. **Нет вложенного объекта** `location`.
* В ответе **нет**:

  * `checklist`
  * `photos`
  * `cleaner`
  * `location.id`, `address` и т.п.

Подробная информация по job берётся только из `GET /api/jobs/<id>/`.

**Минимальный набор, на который может опираться фронт/мобилка**

* `id` — идентификатор job (используется в `GET /api/jobs/<id>/`).
* `location__name` — заголовок карточки.
* `scheduled_date`, `scheduled_start_time`, `scheduled_end_time` — дата/время.
* `status` — одно из: `"scheduled" | "in_progress" | "completed"`.

---

### 2.1.1. Today Jobs — Mobile usage (зафиксированное поведение)

Дополнительные ограничения для мобилки, исходя из фактического контракта.

**Ответ `/api/jobs/today/` остаётся ПЛОСКИМ:**

```json
[
  {
    "id": 5,
    "location__name": "Dubai Marina Tower",
    "scheduled_date": "2026-01-17",
    "scheduled_start_time": null,
    "scheduled_end_time": null,
    "status": "scheduled"
  }
]
```

**Ключ `location__name` обязателен**

* Mobile не вводит своих полей (`location_name`, `title` и т.п.).
* Заголовок карточки строится строго из `location__name`.

**Дата/время в карточке — чисто фронтовая логика**

* API ничего не знает про текст `Today`.
* Mobile сам решает, показывать ли:

  * `Today`,
  * или отформатированную `scheduled_date` (например, `Tue, 20 Jan` и т.п.).

**Минимальный набор полей, на которые мобильный UI имеет право рассчитывать:**

* `id` — ключ для перехода в `GET /api/jobs/<id>/`.
* `location__name` — название объекта.
* `scheduled_date` — дата.
* `status` — `scheduled | in_progress | completed`.

Все остальные поля считаются «дополнительными» и могут меняться/добавляться без гарантий для UI.

---

### 2.1.2. Today Jobs — обработка неавторизованного доступа (mobile)

При отсутствии токена или протухшей сессии backend возвращает:

```http
401 Unauthorized
```

```json
{
  "detail": "Authentication credentials were not provided."
}
```

Для мобильного приложения это трактуется как:

> “Session expired. Please log in again.”

**UI:**

* показывает сообщение в баннере / карточке;
* не пытается грузить `/api/jobs/<id>/`;
* предлагает залогиниться снова (через экран `Login`).

Важно: никаких специальных мобильных эндпоинтов под это нет, это просто стандартизированная реакция на `401` с таким `detail`.

---

### 2.2. Job Detail (детали задачи для клинера)

**Endpoint**

```http
GET /api/jobs/<id>/
```

**Назначение**

Детальная информация по конкретной job для клинера.

**Response 200 OK (концептуальная форма)**

```json
{
  "id": 10,
  "status": "in_progress",
  "scheduled_date": "2026-01-15",
  "scheduled_start_time": "09:00:00",
  "scheduled_end_time": "11:00:00",
  "actual_start_time": "2026-01-15T09:05:12+04:00",
  "actual_end_time": null,
  "location": {
    "id": 5,
    "name": "Marina Heights Tower",
    "address": "Dubai Marina, Dubai, UAE",
    "latitude": 25.089123,
    "longitude": 55.145678
  },
  "cleaner": {
    "id": 3,
    "full_name": "Dev Cleaner",
    "phone": "+10000000000"
  },
  "check_events": [
    {
      "event_type": "check_in",
      "created_at": "2026-01-15T09:05:12+04:00",
      "latitude": 25.08912,
      "longitude": 55.14567
    }
  ],
  "photos": [
    {
      "id": 12,
      "photo_type": "before",
      "file_url": "https://cdn.example.com/.../before.jpg",
      "latitude": 25.08912,
      "longitude": 55.14567,
      "photo_timestamp": "2026-01-15T09:06:00+04:00",
      "exif_missing": false
    }
  ],
  "checklist_items": [
    {
      "id": 101,
      "text": "Vacuum living room",
      "order_index": 0,
      "is_completed": false,
      "is_required": true
    },
    {
      "id": 102,
      "text": "Clean bathroom",
      "order_index": 1,
      "is_completed": true,
      "is_required": false
    }
  ]
}
```

**Гарантии / особенности**

* `actual_start_time` и `actual_end_time` могут быть `null` — это ожидаемо.
* `photos` может быть пустым массивом.
* `check_events` может быть пустым массивом.
* `check_events` возвращаются **отсортированными по** `created_at ASC` — фронт порядок **не меняет**.

**Фронту важно**

* `status` — управляет доступностью кнопок:

  * check-in / check-out
  * upload photo
* `checklist_items` — источник чек-листа.
* `photos` — массив; фронт сам мапит в слоты `before` / `after` по `photo_type`.
* `check_events` — используются для построения таймлайна check-in/out.

---

### 2.3. Check-in

**Endpoint**

```http
POST /api/jobs/<id>/check-in/
Content-Type: application/json
```

**Request (JSON)**

```json
{
  "latitude": 25.08912,
  "longitude": 55.14567
}
```

**Response 200 OK (пример)**

```json
{
  "status": "in_progress",
  "check_in": {
    "created_at": "2026-01-15T09:05:12+04:00",
    "latitude": 25.08912,
    "longitude": 55.14567
  }
}
```

**Правила (backend)**

* Роль — только `cleaner`.
* Job принадлежит этому cleaner.
* `status` до вызова — строго `"scheduled"`.
* Расстояние до `location` ≤ 100 м.

**Типичные ошибки**

* `400 Bad Request` — далеко от точки / нет координат / другой бизнес-чек.
* `403 Forbidden` — чужая job / неверная роль.
* `409 Conflict` — неверный статус (например, уже `in_progress` или `completed`).

**Фронт**

* Показывает `detail` как toast/alert.
* Статус локально не переписывает «наугад», ориентируется на ответ.

---

### 2.4. Check-out

**Endpoint**

```http
POST /api/jobs/<id>/check-out/
Content-Type: application/json
```

**Request (JSON)**

```json
{
  "latitude": 25.08913,
  "longitude": 55.14568
}
```

**Response 200 OK (пример)**

```json
{
  "status": "completed",
  "check_out": {
    "created_at": "2026-01-15T10:58:03+04:00",
    "latitude": 25.08913,
    "longitude": 55.14568
  }
}
```

**Правила (backend)**

* `status` до вызова — строго `"in_progress"`.
* Все required пункты чеклиста: `is_completed = true`.
* Есть и `before`, и `after` фото.
* Расстояние до `location` ≤ 100 м.

**Ошибки**

* `400 Bad Request` — бизнес-ошибка (не весь чеклист закрыт, нет фото и т.п.).
* `403 Forbidden` — не тот cleaner / не та роль.
* `409 Conflict` — неверный статус для операции.

---

### 2.5. Checklist toggle (один пункт)

**Endpoint**

```http
POST /api/jobs/<job_id>/checklist/<item_id>/toggle/
Content-Type: application/json
```

**Request**

Может быть пустым:

```json
{}
```

или явным:

```json
{
  "is_completed": true
}
```

**Response 200 OK**

```json
{
  "id": 101,
  "is_completed": true
}
```

Фронту достаточно по `id` обновить локальное состояние чекбокса.

---

### 2.6. Checklist bulk (массовое обновление)

**Endpoint**

```http
POST /api/jobs/<job_id>/checklist/bulk/
Content-Type: application/json
```

**Request**

```json
{
  "items": [
    { "id": 101, "is_completed": true },
    { "id": 102, "is_completed": true }
  ]
}
```

**Response 200 OK**

```json
{
  "updated_count": 2
}
```

---

### 2.7. Photos

#### 2.7.1. Чтение фото job (через Job Detail)

На практике фронту **достаточно** того, что `GET /api/jobs/<id>/` уже отдаёт массив `photos` (см. 2.2).
Отдельный `GET /api/jobs/<id>/photos/` **не обязателен** для работы UI.

**Форма в ответе Job Detail**

```json
"photos": [
  {
    "id": 12,
    "photo_type": "before",
    "file_url": "https://cdn.example.com/.../before.jpg",
    "latitude": 25.08912,
    "longitude": 55.14567,
    "photo_timestamp": "2026-01-15T09:06:00+04:00",
    "exif_missing": false
  },
  {
    "id": 13,
    "photo_type": "after",
    "file_url": "https://cdn.example.com/.../after.jpg",
    "latitude": 25.08913,
    "longitude": 55.14568,
    "photo_timestamp": "2026-01-15T10:57:00+04:00",
    "exif_missing": true
  }
]
```

**Фронт**

* фильтрует по `photo_type` → слоты `before` / `after`;
* использует `file_url` для превью;
* может показывать индикатор `exif_missing`.

---

#### 2.7.2. Загрузка фото

**Endpoint**

```http
POST /api/jobs/<id>/photos/
Content-Type: multipart/form-data
```

**Поля формы**

* `photo_type`: `"before"` или `"after"`
* `file`: бинарник (image)

**Response 201 Created (пример)**

```json
{
  "id": 12,
  "photo_type": "before",
  "file_url": "https://cdn.example.com/.../before.jpg",
  "latitude": 25.08912,
  "longitude": 55.14567,
  "photo_timestamp": "2026-01-15T09:06:00+04:00",
  "exif_missing": false
}
```

**Правила**

* Только при `status = "in_progress"`.
* `"after"` можно загрузить **только** если уже есть `"before"`.
* Максимум 1 `before` и 1 `after` на job.

Если в EXIF есть координаты:

* они проверяются на расстояние ≤ 100 м от `location`.

Если EXIF **нет**:

* загрузка **разрешена**;
* в ответе может быть `exif_missing = true`.

**Ошибки**

* `409 Conflict` — попытка:

  * загрузить второе фото того же типа, или
  * загрузить `after` без `before`.
* `400 Bad Request` — слишком далеко по EXIF.
* `403 Forbidden` — не тот cleaner / не та роль.

---

#### 2.7.3. Удаление фото

**Endpoint**

```http
DELETE /api/jobs/<id>/photos/<photo_type>/
```

где `photo_type = "before" | "after"`.

**Response 204 No Content**

**Правила**

* Только при `status = "in_progress"`.
* Нельзя удалить `before`, если уже есть `after`.

Некорректный `photo_type` → `400 Bad Request`:

```json
{
  "detail": "Invalid photo_type. Use 'before' or 'after'."
}
```

> Удаление сейчас используется минимально, но контракт зафиксирован.

---

### 2.8. PDF report (фактический контракт)

**Endpoint**

```http
POST /api/jobs/<id>/report/pdf/
```

**Body**

* пустой `{}` или вообще без тела.

**Фактическое поведение**

Backend возвращает **PDF-файл** как бинарный ответ:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="job-<id>-report.pdf"
```

(заголовок `Content-Disposition` может присутствовать, но не гарантирован).

**Фронт**

* **Mobile** — открывает / шарит PDF через нативные механизмы.
* **Web (Manager Portal)** — через Blob создаёт ссылку и триггерит загрузку.

**Важно**

* Эндпоинт **идемпотентный** — можно вызывать многократно.
* Сейчас **нет JSON-обёртки** (`file_id`, `url`, `generated_at`). Это может появиться в будущем как отдельный слой, но не часть текущего контракта.

---

## 3. Manager API

Все manager-эндпоинты требуют:

* валидный токен:

  ```http
  Authorization: Token <MANAGER_TOKEN>
  ```

* роль пользователя: `role = "manager"`.

---

### 3.1. Today Jobs (менеджер)

**Endpoint**

```http
GET /api/manager/jobs/today/
```

**Назначение**

Список job по компании менеджера за сегодня.

**Response 200 OK (концептуально)**

```json
[
  {
    "id": 10,
    "status": "in_progress",
    "scheduled_date": "2026-01-15",
    "scheduled_start_time": "09:00:00",
    "scheduled_end_time": "11:00:00",
    "location": {
      "id": 5,
      "name": "Marina Heights Tower",
      "address": "Dubai Marina, Dubai, UAE"
    },
    "cleaner": {
      "id": 3,
      "full_name": "Dev Cleaner"
    },
    "has_before_photo": true,
    "has_after_photo": false
  }
]
```

Manager Portal на основе этого:

* строит список задач с полями: объект, дата, время, клинер, статус, факт наличия фото.

---

## 4. Manager — Job Planning & Create Job (NEW, зафиксированный контракт)

### 4.1. Получение справочников: meta для Planning / Create Job

**Endpoint**

```http
GET /api/manager/meta/
```

**Назначение**

Единый endpoint для:

* заполнения формы **Create Job Drawer**;
* настройки фильтров в **Job Planning** (в будущем).

**Response 200 OK**

```json
{
  "cleaners": [
    { "id": 3, "full_name": "Dev Cleaner", "phone": "+10000000001" }
  ],
  "locations": [
    {
      "id": 1,
      "name": "Dubai Marina Tower",
      "address": "Dubai Marina, Dubai, UAE"
    }
  ],
  "checklist_templates": [
    { "id": 1, "name": "Standard Cleaning" },
    { "id": 2, "name": "Standard Apartment Cleaning" }
  ]
}
```

**Примечания**

* Endpoint **read-only**.
* Используется:

  * в **Create Job Drawer**;
  * в фильтрах Planning (для select’ов по cleaner / location / template).

---

### 4.2. Создание job менеджером

**Endpoint**

```http
POST /api/manager/jobs/
Content-Type: application/json
```

**Назначение**

Создание job **заранее** менеджером.
Созданная job автоматически появляется у клинера через `/api/jobs/today/` в день выполнения.

**Request (JSON)**

```json
{
  "scheduled_date": "2026-01-19",
  "scheduled_start_time": "09:00:00",
  "scheduled_end_time": "12:00:00",
  "location_id": 1,
  "cleaner_id": 3,
  "checklist_template_id": 1
}
```

**Поведение backend (ЗАФИКСИРОВАНО)**

* Создаётся `Job` со статусом `scheduled`.
* Если `checklist_template_id` передан:

  * создаётся snapshot `JobChecklistItem` из `ChecklistTemplateItem`.
* Существующие модели и миграции **не меняются**.

**Response 201 Created (минимальный контракт для Planning UI)**

```json
{
  "id": 7,
  "scheduled_date": "2026-01-19",
  "scheduled_start_time": "09:00:00",
  "scheduled_end_time": "12:00:00",
  "status": "scheduled",
  "location": {
    "id": 1,
    "name": "Dubai Marina Tower",
    "address": "Dubai Marina, Dubai, UAE"
  },
  "cleaner": {
    "id": 3,
    "full_name": "Dev Cleaner",
    "phone": "+10000000001"
  },
  "proof": {
    "before_photo": false,
    "after_photo": false,
    "checklist": false
  }
}
```

---

### 4.3. Planning jobs list (read-only, Manager Job Planning)

**Endpoint**

```http
GET /api/manager/jobs/planning/?date=YYYY-MM-DD
```

**Назначение**

Отображение списка job за дату в экране **Manager Job Planning**.

**Поддерживаемые форматы даты**

* `YYYY-MM-DD`
* `DD.MM.YYYY` (совместимость с UI)

**Response 200 OK**

```json
[
  {
    "id": 7,
    "scheduled_date": "2026-01-19",
    "scheduled_start_time": "09:00:00",
    "scheduled_end_time": "12:00:00",
    "status": "scheduled",
    "location": {
      "id": 1,
      "name": "Dubai Marina Tower",
      "address": "Dubai Marina, Dubai, UAE"
    },
    "cleaner": {
      "id": 3,
      "full_name": "Dev Cleaner"
    },
    "proof": {
      "before_uploaded": false,
      "after_uploaded": false,
      "checklist_completed": false,
      "before_photo": false,
      "after_photo": false,
      "checklist": false
    }
  }
]
```

**Примечания**

* Endpoint **read-only**.
* `proof`-флаги:

  * `before_uploaded` / `after_uploaded` / `checklist_completed` — backend-истина.
  * `before_photo` / `after_photo` / `checklist` — UI-совместимость (алиасы под фронт).
* **Переименование** существующих полей в `proof` **запрещено** без слоя совместимости.

---

### 4.4. Job Detail (менеджер)

**Endpoint**

```http
GET /api/manager/jobs/<id>/
```

**Назначение**

Детали job для менеджера (аналог cleaner detail + фокус на контроль и отчётность).

**Response 200 OK (концептуально)**

```json
{
  "id": 10,
  "status": "completed",
  "scheduled_date": "2026-01-15",
  "scheduled_start_time": "09:00:00",
  "scheduled_end_time": "11:00:00",
  "location": {
    "id": 5,
    "name": "Marina Heights Tower",
    "address": "Dubai Marina, Dubai, UAE",
    "latitude": 25.089123,
    "longitude": 55.145678
  },
  "cleaner": {
    "id": 3,
    "full_name": "Dev Cleaner",
    "phone": "+10000000000"
  },
  "check_events": [
    {
      "event_type": "check_in",
      "created_at": "2026-01-15T09:05:12+04:00",
      "latitude": 25.08912,
      "longitude": 55.14567
    },
    {
      "event_type": "check_out",
      "created_at": "2026-01-15T10:58:03+04:00",
      "latitude": 25.08913,
      "longitude": 55.14568
    }
  ],
  "photos": [
    {
      "id": 12,
      "photo_type": "before",
      "file_url": "https://cdn.example.com/.../before.jpg",
      "photo_timestamp": "2026-01-15T09:06:00+04:00"
    },
    {
      "id": 13,
      "photo_type": "after",
      "file_url": "https://cdn.example.com/.../after.jpg",
      "photo_timestamp": "2026-01-15T10:57:00+04:00"
    }
  ],
  "checklist_items": [
    {
      "id": 101,
      "text": "Vacuum living room",
      "order_index": 0,
      "is_completed": true,
      "is_required": true
    }
  ],
  "notes": null
}
```

**Manager Portal на этом**

* показывает:

  * статус, расписание, объект, клинера;
  * чек-лист;
  * фото (before/after);
  * таймлайн `check_events`.
* даёт действия:

  * Generate PDF / Download PDF (через `POST /api/jobs/<id>/report/pdf/`).

---

## 5. Ошибки (общий паттерн)

Во всех эндпоинтах ошибки отдаются в едином формате:

```json
{
  "detail": "Error message here"
}
```

**Типичные коды**

* `400 Bad Request` — бизнес-ошибка (GPS далеко, не все пункты чеклиста закрыты и т.п.).
* `401 Unauthorized` — нет токена / токен неверен.
* `403 Forbidden` — не та роль / чужая job.
* `404 Not Found` — job не найдена / не принадлежит пользователю.
* `409 Conflict` — неверный статус для операции (double check-in, double photo upload и т.п.).

**Фронт**

* читает поле `detail`;
* показывает пользователю;
* **не** пытается парсить текст на бизнес-логику.

---

## 6. Общие заметки для фронта

* Все даты/время — в формате **ISO 8601**:

  * даты: `"YYYY-MM-DD"` (например, `"2026-01-15"`);
  * дата-время: `"2026-01-15T09:05:12+04:00"`.
* Время без TZ (`"HH:MM:SS"`) интерпретируется как локальное для компании.

Backend может **добавлять новые поля**, но:

* существующие поля и их смысл считаются стабильными;
* ломающие изменения должны сперва попасть в этот документ.

**Backend = источник истины**

* фронт **не меняет** статусы сам;
* фронт не пересчитывает бизнес-правила;
* всё делает через API.

---

## 7. Analytics Semantics (Manager)

Секция описывает **семантику аналитических метрик**, которые могут быть построены на основе API.
Это не отдельные эндпоинты, а консистентные определения для вычислений на стороне отчётности / аналитики.

### 7.1. Time & Discipline

* `check_in_time` = `timestamp` `JobCheckEvent` с `event_type = "check_in"`.
* `check_out_time` = `timestamp` `JobCheckEvent` с `event_type = "check_out"`.
* `job_duration` = `check_out_time - check_in_time`.
* `on_time_check_in` = `check_in_time <= scheduled_start_time + tolerance`.

`tolerance` задаётся бизнесом отдельно (например, 15 минут).

### 7.2. Quality

* `checklist_passed` = все required `JobChecklistItem.is_completed = true`.
* `checklist_completion_rate` = `completed_items / total_items`.

### 7.3. Proof of Work

* `before_photo_uploaded` = существует `JobPhoto(photo_type = "before")`.
* `after_photo_uploaded` = существует `JobPhoto(photo_type = "after")`.
* `full_proof` = `before_photo_uploaded AND after_photo_uploaded AND checklist_passed`.
* `exif_missing_rate` = `count(exif_missing = true) / total_photos`.

### 7.4. Aggregations

Метрики могут быть агрегированы по:

* `cleaner`
* `location`
* дате (день / неделя / месяц)

---

## 8. API Contract — зафиксированные поля для Mobile Layer 1

Секция описывает **минимально необходимый контракт** для Mobile Layer 1 (логика без финального дизайна).
Эти поля уже используются и должны считаться стабильными.

---

### 8.1. Job Details payload (мобильное приложение)

Фактически используется мобильным приложением:

```json
{
  "id": 0,
  "status": "scheduled",
  "scheduled_date": "YYYY-MM-DD",
  "location": {
    "id": 0,
    "name": "string",
    "address": "string or null",
    "latitude": 0.0,
    "longitude": 0.0
  },
  "cleaner": {
    "id": 0,
    "full_name": "string"
  }
}
```

**Зафиксированные правила**

`latitude` / `longitude`:

* могут быть `null`;
* используются **только** для навигации в Mobile App;
* отсутствие координат = UI показывает `Navigate (no location)` **без** `onPress`.

Backend **не обязан** гарантировать наличие координат для каждой локации.

---

### 8.2. Job Photos (Mobile Layer 1)

**Контракт для получения фото (упрощённая форма)**

```json
{
  "type": "before",
  "file_url": "string",
  "created_at": "string"
}
```

**Правила (уже реализованы и используются)**

* максимум **одно** `before` и **одно** `after` фото на job;
* `after` **запрещён** без `before`;
* `file_url` используется:

  * для превью в мобильном приложении;
  * для встраивания в PDF-отчёт;
* отсутствие фото = UI показывает `No photo yet`.

(Фактический полный объект `photos` в Job Detail см. в разделе 2.2 / 2.7.1.)

---

### 8.3. Checklist Items (Mobile Layer 1)

```json
{
  "id": 0,
  "text": "string",
  "required": true,
  "is_completed": false
}
```

**Правила**

* чеклист:

  * **read-only**, пока `job.status != "in_progress"`;
  * обязателен для `check-out`, если `required = true` (все required должны быть `is_completed = true`).
* Backend остаётся **единственным источником истины**.
  UI лишь повторяет эти ограничения и не вводит свои правила.

---

### 8.4. Job Events / Timeline (Mobile Layer 1)

```json
{
  "type": "check_in",
  "created_at": "string",
  "actor_name": "string"
}
```

**Использование**

* отображение таймлайна в `JobDetailsScreen`;
* данные **read-only**;
* порядок событий определяется backend (по `created_at`), фронт порядок не переупорядочивает.

---

### 8.5. Guard Rails (API + UI договорённость)

**Backend**

Жёстко валидирует порядок действий:

* нельзя `check-out` без фото и чеклиста (см. 2.4);
* нельзя `after` без `before`;
* `completed` job — **immutable** (нельзя менять чеклист / фото / статусы).

**Frontend (Mobile)**

Не предлагает невозможных действий:

* `Check in` — только при `status = "scheduled"`;
* `Check out` — только при `status = "in_progress"`;
* `completed` — без action-кнопок.

---

### 8.6. Статус API для Mobile Layer 1

Контракты на текущий момент **достаточны** для:

* навигации;
* камеры / галереи;
* превью фото;
* чеклиста;
* таймлайна;
* PDF.

Новые API **не требуются** для закрытия Mobile Layer 1.
Все изменения на Mobile — **consumer-level**, без расширения backend.

---

**ИТОГО:**
Любая новая функциональность должна либо:

1. укладываться в контракты, зафиксированные здесь, **либо**
2. сначала обновить этот файл (`API_CONTRACT.md`) с чётким описанием изменений и только потом реализовывать их в коде.
````
