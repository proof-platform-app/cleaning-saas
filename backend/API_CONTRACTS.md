````md
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
````

Все эндпоинты ниже указываются относительно этого base URL в DEV.

### 0.3. Авторизация

Во всех запросах после успешного логина:

```http
Authorization: Token <TOKEN>
```

### 0.4. DEV-пользователи

```text
Cleaner:  cleaner@test.com  /  Test1234!
Manager:  manager@test.com /  Test1234!
```

Эти же данные зашиты в dev-конфиги фронтов (web + mobile).

### 0.5. API Contract — Job lifecycle & GPS (DEV notes)

Backend API контракт в рамках данного этапа не изменялся.

Подтверждено:

* Check-in / Check-out используют существующие endpoints.
* Фото before / after загружаются через существующий photos endpoint.
* Checklist работает через bulk update / toggle endpoints.

DEV-особенность:

В dev-режиме мобильное приложение может подставлять GPS координаты задачи
(`location_latitude / location_longitude`),
чтобы backend воспринимал клинера как находящегося "на месте".

Важно:

* Это dev-only логика.
* Backend не содержит dev-исключений.
* В production GPS всегда берётся из реального устройства.
* Контракт API считается стабильным и зафиксированным.

### 0.6. Landing & Proof Narrative Alignment

Лендинг CleanProof зафиксирован как отражение реального API-контракта продукта.
Все заявленные шаги пользовательского флоу (check-in, photos, checklist, check-out, PDF)
соответствуют фактическим backend-событиям и данным, которые могут быть подтверждены API.

Никаких маркетинговых обещаний вне технической реальности продукта не используется.
Лендинг продаёт только то, что действительно фиксируется и может быть выдано
в виде доказательства через API.

Demo page and landing page content are strictly aligned with existing API behavior and backend guarantees. All demonstrated flows (job creation, check-in/out, checklist completion, photo capture, PDF generation) correspond to real API events and persisted data. No demo or marketing materials reference functionality that is not backed by current API contracts. Demo navigation is intentionally minimal and does not expose internal product routes or authentication flows.

### 0.6.1. Marketing & Demo Alignment

CleanProof landing page (`/cleanproof`) and demo request page (`/cleanproof/demo`) are purely marketing-facing and do not expose or simulate any product functionality. All descriptions, screenshots, and narrative elements strictly reflect existing API contracts and real backend events (job creation, check-in/out, checklist completion, photo proof, PDF generation). No marketing content implies features, workflows, or system behavior that are not backed by current API guarantees. The demo request flow does not create accounts, trigger backend actions, or require authentication.

### 0.6.2. Location coordinates as source of truth

* `latitude` и `longitude` считаются **авторитетным источником истины** для всех GPS-операций.
* Эти координаты используются для:

  * навигации клинера,
  * проверки GPS check-in/check-out,
  * включения в артефакты доказательств (PDF-отчёты и т.п.).
* Поля адреса и названия (`name`, `address`) являются описательными и не участвуют в валидации геолокации.
* Любые будущие механики geocoding/autocomplete не должны перетирать явно сохранённые координаты.

### 0.6.3. Pricing & Trial Flow (v1)

* Кнопка **Start 7-day trial** на странице `/cleanproof/pricing` инициирует старт бесплатного пробного периода тарифа Standard.
* На текущем этапе кнопка ведёт на существующий экран авторизации (`/`) с параметром `?trial=standard`.
* Backend обязан поддерживать сценарий создания компании в статусе trial сроком 7 дней после успешного логина или регистрации.
* Платёжные данные на этапе trial **не требуются**.
* По окончании trial доступ ограничивается до выбора платного тарифа.

### 0.6.4. Marketing Pages & Demo Flow Alignment

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

Пустой `email` или `password` → `400 Bad Request`:

```json
{
  "detail": "Email and password are required."
}
```

Неверная пара логин/пароль → `401 Unauthorized`:

```json
{ "detail": "User not found" }
```

или

```json
{ "detail": "Invalid credentials" }
```

После успешного логина все последующие запросы идут с заголовком:

```http
Authorization: Token <token>
```

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

### 1.3. Self-serve signup (Manager)

**Endpoint**

```http
POST /api/auth/signup/
Content-Type: application/json
```

**Назначение**

Self-serve signup для менеджеров. При успешной регистрации:

* создаётся новая `Company`;
* создаётся пользователь-менеджер, привязанный к этой компании;
* автоматически запускается стандартный **7-дневный trial-план**.

Trial-состояния (`is_trial_active`, `is_trial_expired`, `days_left`) и usage-лимиты (`jobs`, `cleaners`) далее вычисляются исключительно на backend и отдаются через:

```http
GET /api/cleanproof/usage-summary/
```

(см. **3.2**).

---

## 2. Cleaner API

Все cleaner-эндпоинты требуют:

* валидный токен:

  ```http
  Authorization: Token <CLEANER_TOKEN>
  ```

* роль пользователя: `role = "cleaner"`.

### 2.1. Today Jobs (список задач клинера на сегодня)

**Endpoint**

```http
GET /api/jobs/today/
```

**Назначение**

Вернуть список сегодняшних `job` для залогиненного клинера.

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

* `location__name` — простая строка. Нет вложенного объекта `location`.
* В ответе **нет**:

  * `checklist`
  * `photos`
  * `cleaner`
  * `location.id`, `address` и т.п.
* Подробная информация по job берётся только из:

  ```http
  GET /api/jobs/<id>/
  ```

**Минимальный набор, на который может опираться фронт/мобилка**

* `id` — идентификатор job (используется в `GET /api/jobs/<id>/`).
* `location__name` — заголовок карточки.
* `scheduled_date`, `scheduled_start_time`, `scheduled_end_time` — дата/время.
* `status` — одно из: `"scheduled" | "in_progress" | "completed"`.

#### 2.1.1. Today Jobs — Mobile usage (зафиксированное поведение)

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

  * `Today`, или
  * отформатированную `scheduled_date` (например, `Tue, 20 Jan` и т.п.).

**Минимальный набор полей, на которые мобильный UI имеет право рассчитывать:**

* `id` — ключ для перехода в `GET /api/jobs/<id>/`.
* `location__name` — название объекта.
* `scheduled_date` — дата.
* `status` — `scheduled | in_progress | completed`.

Все остальные поля считаются «дополнительными» и могут меняться/добавляться без гарантий для UI.

#### 2.1.2. Today Jobs — обработка неавторизованного доступа (mobile)

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

UI:

* показывает сообщение в баннере / карточке;
* не пытается грузить `/api/jobs/<id>/`;
* предлагает залогиниться снова (через экран Login).

Важно: никаких специальных мобильных эндпоинтов под это нет, это просто стандартизированная реакция на `401` с таким `detail`.

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
* `check_events` возвращаются отсортированными по `created_at ASC` — фронт порядок не меняет.

**Фронту важно**

* `status` — управляет доступностью кнопок:

  * check-in / check-out;
  * upload photo.
* `checklist_items` — источник чек-листа.
* `photos` — массив; фронт сам мапит в слоты `before` / `after` по `photo_type`.
* `check_events` — используются для построения таймлайна check-in/out.

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
{ "is_completed": true }
```

**Response 200 OK**

```json
{
  "id": 101,
  "is_completed": true
}
```

Фронту достаточно по `id` обновить локальное состояние чекбокса.

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

### 2.7. Photos

#### 2.7.1. Чтение фото job (через Job Detail)

На практике фронту достаточно того, что `GET /api/jobs/<id>/` уже отдаёт массив `photos` (см. 2.2).
Отдельный `GET /api/jobs/<id>/photos/` не обязателен для работы UI.

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
* `"after"` можно загрузить только если уже есть `"before"`.
* Максимум 1 `before` и 1 `after` на job.
* Если в EXIF есть координаты:

  * они проверяются на расстояние ≤ 100 м от `location`.
* Если EXIF нет:

  * загрузка разрешена;
  * в ответе может быть `exif_missing = true`.

**Ошибки**

* `409 Conflict` — попытка:

  * загрузить второе фото того же типа, или
  * загрузить `after` без `before`.
* `400 Bad Request` — слишком далеко по EXIF.
* `403 Forbidden` — не тот cleaner / не та роль.

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
* Некорректный `photo_type` → `400 Bad Request`:

```json
{
  "detail": "Invalid photo_type. Use 'before' or 'after'."
}
```

Удаление сейчас используется минимально, но контракт зафиксирован.

### 2.8. PDF report (фактический контракт)

**Endpoint**

```http
POST /api/jobs/<id>/report/pdf/
```

**Body**

Пустой `{}` или вообще без тела.

**Фактическое поведение**

Backend возвращает PDF-файл как бинарный ответ:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="job-<id>-report.pdf"
```

(`Content-Disposition` может присутствовать, но не гарантирован).

**Фронт**

* Mobile — открывает / шарит PDF через нативные механизмы.
* Web (Manager Portal) — через `Blob` создаёт ссылку и триггерит загрузку.

**Важно**

* Эндпоинт идемпотентный — можно вызывать многократно.
* Сейчас нет JSON-обёртки (`file_id`, `url`, `generated_at`). Это может появиться в будущем как отдельный слой, но не часть текущего контракта.

---

## 3. Manager API

Все manager-эндпоинты требуют:

* валидный токен:

  ```http
  Authorization: Token <MANAGER_TOKEN>
  ```

* роль пользователя: `role = "manager"`.

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

### 3.2. Trial activation, expired & usage (Manager)

#### 3.2.1. Trial activation (Manager)

Trial запускается явно через backend endpoint и не зависит от оплаты или биллинга.

**Endpoint**

```http
POST /api/cleanproof/trials/start/
Authorization: Token <MANAGER_TOKEN>
```

**Поведение**

* если trial уже активен и не истёк → возвращается текущий статус;
* если trial отсутствует или истёк → активируется новый trial на 7 дней;
* повторный вызов в dev-среде разрешён;
* endpoint может вызываться безопасно несколько раз без побочных эффектов.

**Response 200 OK (пример)**

```json
{
  "plan": "trial",
  "trial_started_at": "ISO datetime",
  "trial_expires_at": "ISO datetime",
  "is_trial_active": true,
  "is_trial_expired": false,
  "days_left": 7
}
```

#### 3.2.2. Trial expired state (Manager)

Истечение trial определяется исключительно backend.

**Состояние**

* `is_trial_active === false`
* `is_trial_expired === true`
* `days_left === 0`

**Принципы**

* Backend является единственным источником истины по статусу trial.
* Frontend не вычисляет даты и не хранит бизнес-логику trial.
* Поле `days_left` используется только для UX-индикации.
* Trial-статус не инициирует оплату и не меняет доступность функциональности.
* Истечение trial не вызывает автоматических блокировок.
* Любые ограничения реализуются отдельно (guards), вне trial-механизма.

#### 3.2.3. Usage summary & soft-limits (Manager)

Для UX-индикации soft-limits используется агрегированный usage endpoint.

**Endpoint**

```http
GET /api/cleanproof/usage-summary/
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

* предоставить frontend агрегированное состояние trial + usage;
* исключить дублирование бизнес-логики на клиенте;
* использовать данные исключительно для UX-индикации.

**Response 200 OK (пример)**

```json
{
  "plan": "trial",
  "is_trial_active": true,
  "is_trial_expired": false,
  "days_left": 7,
  "jobs_today_count": 0,
  "jobs_today_soft_limit": 20,
  "cleaners_count": 1,
  "cleaners_soft_limit": 5
}
```

**Принципы**

* `usage-summary` не блокирует действия;
* soft-limits ≠ guards;
* данные используются только для баннеров и подсказок.

**Trial & Usage — source of truth**

* Trial и usage-статусы считаются исключительно на backend.
* `GET /api/cleanproof/usage-summary/` — единственный источник истины для UI по:

  * `plan`,
  * флагам `is_trial_active / is_trial_expired`,
  * `days_left`,
  * usage-метрикам (`jobs_today_count`, `cleaners_count`) и их soft-limits.
* Frontend не содержит бизнес-логики расчёта trial или лимитов, а только отображает состояние, полученное от backend.

**Enforcement**

* Применение trial-ограничений (блокировка создания jobs / cleaners и т.п.) выполняется только backend’ом.
* В случае превышения лимитов backend возвращает `403 Forbidden` и **стабильные коды ошибок**; фронт показывает сообщение и не дублирует логику.

#### 3.2.4. Commercial enforcement & read-only mode

For suspended or blocked companies, the API enforces a strict **read-only mode**.

* Mutating endpoints (e.g. create job, create location, create cleaner) return HTTP `403`.
* Response includes a machine-readable error code:

  * `company_blocked` — company is suspended and operates in read-only mode;
  * `trial_expired` — trial period has ended.

**Example response:**

```json
{
  "code": "company_blocked",
  "detail": "Your account is currently blocked. Please contact support."
}
```

### 3.3. Company profile (Manager)

**Endpoint**

```http
GET /api/manager/company/
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

Вернуть профиль компании менеджера для экрана Settings.

**Response 200 OK**

```json
{
  "id": 1,
  "name": "Dev Company",
  "contact_email": "info@devcompany.com",
  "contact_phone": "+971500000000",
  "logo_url": "https://cdn.example.com/logos/dev-company.png"
}
```

**Гарантии**

* Возвращается ровно одна компания — та, к которой принадлежит менеджер.
* Если `logo_url = null`, фронт показывает плейсхолдер.

---

**Endpoint**

```http
PATCH /api/manager/company/
Authorization: Token <MANAGER_TOKEN>
Content-Type: application/json
```

**Назначение**

Обновить базовые настройки компании: название и контактные данные.

**Request (JSON)**

```json
{
  "name": "New Company Name",
  "contact_email": "ops@company.com",
  "contact_phone": "+971511111111"
}
```

Все поля опциональные: можно отправлять только те, которые меняются.

**Response 200 OK**

```json
{
  "id": 1,
  "name": "New Company Name",
  "contact_email": "ops@company.com",
  "contact_phone": "+971511111111",
  "logo_url": "https://cdn.example.com/logos/dev-company.png"
}
```

#### 3.3.1. Company logo upload

**Endpoint**

```http
POST /api/manager/company/logo/
Authorization: Token <MANAGER_TOKEN>
Content-Type: multipart/form-data
```

**Поля формы**

* `file`: бинарный PNG/JPG логотип компании.

**Response 200 OK**

```json
{
  "logo_url": "https://cdn.example.com/logos/dev-company-new.png"
}
```

**Правила**

* При загрузке старый логотип может быть перезаписан.
* Backend отвечает только новым `logo_url`, фронт:

  * обновляет превью;
  * не хранит файл локально.

### 3.4. Cleaners management (Manager)

Все эндпоинты требуют:

```http
Authorization: Token <MANAGER_TOKEN>
```

и `role = "manager"`.

#### 3.4.1. List cleaners

**Endpoint**

```http
GET /api/manager/cleaners/
```

**Назначение**

Вернуть список клинеров компании для блока Team / Cleaners в Settings.

**Response 200 OK**

```json
[
  {
    "id": 3,
    "full_name": "Dev Cleaner",
    "email": "cleaner1@devcompany.com",
    "phone": "+971500000001",
    "is_active": true
  }
]
```

**Особенности**

* Возвращаются только пользователи с `role = "cleaner"`.
* `email` может быть `null`.
* `phone` может быть `null`, но хотя бы одно из полей (`email`/`phone`) должно быть заполнено при создании.

#### 3.4.2. Create cleaner

**Endpoint**

```http
POST /api/manager/cleaners/
Content-Type: application/json
```

**Request (JSON)**

```json
{
  "full_name": "New Cleaner",
  "email": "new.cleaner@devcompany.com",
  "phone": "+971500000002",
  "is_active": true
}
```

**Правила**

* `full_name` — обязательно.
* `email` и `phone` — оба необязательные, но хотя бы одно из них должно быть передано.
* `is_active` по умолчанию `true`, если не указано.

**Response 201 Created**

```json
{
  "id": 4,
  "full_name": "New Cleaner",
  "email": "new.cleaner@devcompany.com",
  "phone": "+971500000002",
  "is_active": true
}
```

**Типичные ошибки**

* `400 Bad Request` — нет `full_name` или не передан ни `email`, ни `phone`.
* `409 Conflict` — попытка создать клинера с уже существующим `phone` или `email` в рамках компании.

#### 3.4.3. Update cleaner

**Endpoint**

```http
PATCH /api/manager/cleaners/<id>/
Content-Type: application/json
```

**Request (JSON)**

```json
{
  "full_name": "Updated Cleaner Name",
  "email": "updated.cleaner@devcompany.com",
  "phone": "+971500000003",
  "is_active": false
}
```

Все поля опциональные.

**Response 200 OK**

```json
{
  "id": 4,
  "full_name": "Updated Cleaner Name",
  "email": "updated.cleaner@devcompany.com",
  "phone": "+971500000003",
  "is_active": false
}
```

**Правила**

* Менеджер не может менять `role` и `company` клинера.
* Отключение клинера (`is_active = false`) не удаляет его задачи и историю.

**Типичные ошибки**

* `404 Not Found` — клинер не найден или не принадлежит компании менеджера.
* `409 Conflict` — конфликт по `email` или `phone` (дубликат в компании).

### 3.5. Locations (Manager API)

Локации являются серверным источником истины и хранятся в backend.
Все операции с локациями выполняются через Manager API и привязаны к компании менеджера.

Доступные эндпоинты:

* `GET /api/manager/locations/` — получить список локаций компании;
* `POST /api/manager/locations/` — создать новую локацию;
* `PATCH /api/manager/locations/{id}/` — обновить локацию.

Каждая локация используется:

* при создании job;
* в Job Planning;
* в мобильном приложении (через связанные job’ы).

Дополнительно:

* Все job-сущности ссылаются на локацию через `location_id`.

* Backend фильтрует локации по `company`; фронт не использует mock-данные и не хранит свои списки локаций.

* Локации также возвращаются агрегированно через:

  ```http
  GET /api/manager/meta/
  ```

  (см. 4.1) для UX-оптимизации Create Job и Planning.

* Frontend не хранит и не кэширует собственные списки локаций — используется только API.

### Checklist templates (manager)

Менеджер может выбрать чек-лист при создании job.

## Checklist templates in PlanningMeta

Эндпоинт GET /api/manager/meta/ возвращает список checklist_templates, используемых в Create Job Drawer.
В ответ попадают только шаблоны чек-листов текущей компании, у которых существует как минимум один пункт (ChecklistTemplateItem).

Если у компании на момент запроса отсутствуют такие шаблоны, backend автоматически инициализирует стандартный набор чек-листов (Apartment / Office / Villa) и возвращает их в этом же ответе.

Поле ответа:

"checklist_templates": [
  { "id": 7, "name": "Apartment – Standard (6 items)" },
  { "id": 8, "name": "Apartment – Deep (12 items)" }
]


При создании job выбранный шаблон передаётся как checklist_template_id.
Если чек-лист не требуется, поле передаётся как null.

**Endpoint**

`GET /api/manager/checklists/templates/`

**Auth:** manager (TokenAuthentication)  
**Scope:** только внутри `user.company`.

**Query params:** нет (v1).

**Response (200)**

```json
[
  {
    "id": 1,
    "name": "Standard Apartment Cleaning (6 items)"
  },
  {
    "id": 2,
    "name": "Standard Apartment Cleaning (12 items)"
  },
  {
    "id": 3,
    "name": "Office Cleaning (8 items)"
  },
  {
    "id": 4,
    "name": "Villa Cleaning (12 items)"
  }
]
Семантика

id — идентификатор ChecklistTemplate.

name — человекочитаемое название шаблона (тип уборки + краткое описание).

Status: IMPLEMENTED (v1).


---

### 1.2. Расширение контракта создания job

Найди секцию вида `POST /api/manager/jobs/` (или как она у тебя названа) и допиши поле:

```md
#### Request body (JSON)

Обязательные поля:

- `scheduled_date` — `YYYY-MM-DD`
- `scheduled_start_time` — `HH:MM`
- `scheduled_end_time` — `HH:MM`
- `location_id` — integer
- `cleaner_id` — integer

Необязательные поля:

- `notes` — string (опциональные инструкции)
- `checklist_template_id` — integer, optional

**Семантика `checklist_template_id`**

- Если поле **передано** → для job используется указанный шаблон чек-листа.
- Если поле **не передано** → backend ведёт себя как сейчас:
  - если у локации есть `LocationChecklistTemplate` → применяется он;
  - иначе job создаётся **без чек-листа**.
- При выборе `No checklist` на фронте поле **не отправляем** (или отправляем `null` — в зависимости от реализации, но контракт лучше описать как «optional»).

При создании job выбранный шаблон разворачивается в `JobChecklistItem` (snapshot).  
Дальнейшие изменения шаблона **не влияют** на уже созданные jobs.
2. Пример POST /api/manager/jobs/ с чек-листом
Можно вставить в тот же раздел API как пример:

POST /api/manager/jobs/
Content-Type: application/json
Authorization: Token <manager_token>

{
  "scheduled_date": "2026-02-01",
  "scheduled_start_time": "09:00",
  "scheduled_end_time": "12:00",
  "location_id": 3,
  "cleaner_id": 7,
  "checklist_template_id": 2,
  "notes": "Client will be at home, focus on kitchen and bathrooms."
}
Комментарий к примеру:

Здесь используется шаблон Standard Apartment Cleaning (12 items) с id=2.

Если бы менеджер выбрал No checklist, поле checklist_template_id просто не отправлялось бы.
---

## 4. Manager — Job Planning & Create Job (NEW, зафиксированный контракт)

### 4.1. Получение справочников: meta для Planning / Create Job

**Endpoint**

```http
GET /api/manager/meta/
```

**Назначение**

Единый endpoint для:

* заполнения формы Create Job Drawer;
* настройки фильтров в Job Planning (в будущем).

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

* Endpoint read-only.
* Используется:

  * в Create Job Drawer;
  * в фильтрах Planning (для select’ов по cleaner / location / template).

### 4.2. Создание job менеджером

**Endpoint**

```http
POST /api/manager/jobs/
Content-Type: application/json
```

**Назначение**

Создание job заранее менеджером.
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

* Создаётся Job со статусом `scheduled`.
* Если `checklist_template_id` передан:

  * создаётся snapshot `JobChecklistItem` из `ChecklistTemplateItem`.
* Существующие модели и миграции не меняются.

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

### 4.3. Planning jobs list (read-only, Manager Job Planning)

**Endpoint**

```http
GET /api/manager/jobs/planning/?date=YYYY-MM-DD
```

**Назначение**

Отображение списка job за дату в экране Manager Job Planning.

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
    },
    "sla_status": "ok",
    "sla_reasons": []
  }
]
```

**Примечания**

* Endpoint read-only.
* `proof`-флаги:

  * `before_uploaded` / `after_uploaded` / `checklist_completed` — backend-истина.
  * `before_photo` / `after_photo` / `checklist` — UI-совместимость (алиасы под фронт).
* Переименование существующих полей в `proof` запрещено без слоя совместимости.
* SLA-слой (`sla_status`, `sla_reasons`) — вычисляемый (см. 4.5), read-only, не влияет на бизнес-логику выполнения job.

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

**Manager Portal на этом:**

* показывает:

  * статус, расписание, объект, клинера;
  * чек-лист;
  * фото (before/after);
  * таймлайн `check_events`.
* даёт действия:

  * Generate PDF / Download PDF (через `POST /api/jobs/<id>/report/pdf/`).

### 4.5. SLA & Exceptions (micro-SLA v1)

Для job-сущностей введён вычисляемый SLA-слой, формируемый исключительно на backend и возвращаемый:

* в ответах Planning (`GET /api/manager/jobs/planning/`);
* в ответах History (`GET /api/manager/jobs/history/`, см. ниже);
* в агрегирующих аналитических эндпоинтах (Performance, Reports).

**Семантика**

* `sla_status` — `"ok" / "violated"` для завершённых jobs (`status = "completed"`).
* `sla_reasons` — массив machine-readable reason-codes, описывающих нарушения, например:

  * `missing_before_photo`
  * `missing_after_photo`
  * `checklist_not_completed`

**Правила**

* SLA не хранится в базе данных как отдельная сущность, а вычисляется на лету из фактических proof-артефактов (check-in/out, photos, checklist).
* SLA не влияет на базовую бизнес-логику выполнения job — это derived-слой представления.
* Frontend не содержит SLA-логики и не пересчитывает статусы, а использует только `sla_status` и `sla_reasons` для:

  * индикации (бейджи, подсветка);
  * фильтрации / сортировки в UI.

### 4.6. Job History (Manager)

**Endpoint**

```http
GET /api/manager/jobs/history/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
```

**Назначение**

Исторический список jobs за период для экрана History / Reports.

**Правила**

* Учитываются только jobs компании текущего менеджера.
* Фильтрация по диапазону дат выполняется на backend.
* Структура job-объектов совместима с Planning (4.3) и дополнена SLA-слоем.

**Response 200 OK (концептуально)**

```json
[
  {
    "id": 10,
    "status": "completed",
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
    "proof": {
      "before_uploaded": true,
      "after_uploaded": true,
      "checklist_completed": true,
      "before_photo": true,
      "after_photo": true,
      "checklist": true
    },
    "sla_status": "ok",
    "sla_reasons": []
  }
]
```

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
* `403 Forbidden` — не та роль / чужая job / trial или usage-ограничение.
* `404 Not Found` — job не найдена / не принадлежит пользователю.
* `409 Conflict` — неверный статус для операции (double check-in, double photo upload и т.п.).

**Фронт**

* читает поле `detail`;
* показывает пользователю;
* не пытается парсить текст на бизнес-логику.

---

## 6. Общие заметки для фронта

* Все даты/время — в формате ISO 8601:

  * даты: `"YYYY-MM-DD"` (например, `"2026-01-15"`);
  * дата-время: `"2026-01-15T09:05:12+04:00"`.
* Время без TZ (`"HH:MM:SS"`) интерпретируется как локальное для компании.
* Backend может добавлять новые поля, но:

  * существующие поля и их смысл считаются стабильными;
  * ломающие изменения должны сперва попасть в этот документ.

**Backend = источник истины**

* фронт не меняет статусы сам;
* фронт не пересчитывает бизнес-правила;
* всё делает через API.

---

## 7. Analytics Semantics (Manager)

Секция описывает семантику аналитических метрик, которые могут быть построены на основе API.
Это не отдельные эндпоинты, а консистентные определения для вычислений на стороне отчётности / аналитики.

### 7.1. Time & Discipline

* `check_in_time` = timestamp `JobCheckEvent` с `event_type = "check_in"`.
* `check_out_time` = timestamp `JobCheckEvent` с `event_type = "check_out"`.
* `job_duration` = `check_out_time - check_in_time`.
* `on_time_check_in` = `check_in_time <= scheduled_start_time + tolerance`.
* `tolerance` задаётся бизнесом отдельно (например, 15 минут).

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

* cleaner
* location
* дате (день / неделя / месяц)

---

## 8. Performance API (Manager scope)

В проекте реализован performance-эндпоинт для анализа SLA-нарушений на уровне клинеров и локаций.

**Endpoint**

```http
GET /api/manager/performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
Authorization: Token <MANAGER_TOKEN>
```

**Правила**

* учитываются только `completed` jobs;
* данные фильтруются по company текущего менеджера;
* SLA-статус и причины нарушений вычисляются backend’ом (frontend не агрегирует данные и не пересчитывает SLA).

**Response 200 OK (концептуально)**

```json
{
  "date_from": "2026-01-01",
  "date_to": "2026-01-31",
  "cleaners": [
    {
      "cleaner_id": 3,
      "cleaner_name": "Dev Cleaner",
      "jobs_total": 25,
      "jobs_with_sla_violations": 3,
      "violation_rate": 0.12,
      "has_repeated_violations": true
    }
  ],
  "locations": [
    {
      "location_id": 5,
      "location_name": "Marina Heights Tower",
      "jobs_total": 10,
      "jobs_with_sla_violations": 1,
      "violation_rate": 0.1,
      "has_repeated_violations": false
    }
  ]
}
```

**Принципы**

* Performance API — read-only слой.
* Не вводит новых сущностей или бизнес-логики.
* Агрегирует существующие job-данные и SLA-метаданные (`sla_status`, `sla_reasons`).

---

### Job force-complete (manager override)

**Purpose**

Позволяет менеджеру принудительно завершить Job и зафиксировать факт override с причиной.  
Используется в редких случаях, когда клинер не может загрузить фото / закрыть чек-лист, но работа фактически выполнена.

**Endpoint**

`POST /api/manager/jobs/{id}/force-complete/`

- Доступно только менеджеру (`User.role = manager`).
- Работает только для job со статусами `scheduled` или `in_progress`.
- Компания должна быть `is_active = True` и не в suspended-состоянии.

**Request body (JSON)**

```json
{
  "reason_code": "missing_after_photo",
  "comment": "Client left early, cleaner couldn't take after-photo."
}
Поля:

reason_code — строка, обязательная. Один из доменных кодов SLA, например:
missing_before_photo
missing_after_photo
checklist_not_completed
comment — строка, обязательная. Живое объяснение от менеджера, почему был сделан override.

Response (200 OK)

{
  "id": 55,
  "status": "completed",
  "sla_status": "violated",
  "sla_reasons": ["missing_after_photo"],
  "force_completed": true,
  "force_completed_by": {
    "id": 7,
    "full_name": "DevNew Manager"
  },
  "force_completed_at": "2026-02-02T12:34:56Z"
}
Семантика:

status — job переводится в completed.
sla_status — всегда violated (override = осознанное нарушение стандартного proof).
sla_reasons — включает переданный reason_code (может быть объединён с существующими причинами, если они были).
force_completed — явный флаг override.
force_completed_by / force_completed_at — кто и когда сделал override.
Side effects

При успешном вызове:
Создаётся JobCheckEvent:

type = "force_complete"
user = request.user
comment = <comment из запроса>
payload = { "reason_code": ..., "previous_status": ..., "previous_sla_status": ... }
Обновляются поля Job:

status = completed

completed_at / actual_end_time выставляются, если были пустыми

sla_status и sla_reasons приводятся в состояние “нарушено по причине override”

Errors

400 BAD REQUEST — отсутствует reason_code или comment, job уже completed.
403 FORBIDDEN — компания заблокирована (company_blocked) или trial/plan не позволяет override (на будущее).
404 NOT FOUND — job не принадлежит компании менеджера или не существует.

##Job Timeline — SLA violation filtering

Job timeline supports a violation-focused view used for audit and SLA review.

By default, the system enforces proof completeness on the cleaner side (check-in/out, photos, checklist), therefore standard jobs cannot produce SLA violations.

The API exposes full job timeline events, while the client may apply a “violations-only” filter, showing only SLA-relevant or exception-related events (e.g. force-complete, missing proof, overrides).

If no violations exist, the timeline is intentionally empty and represented as a valid state:
“No SLA violations detected”.

This behavior is considered correct and expected, and serves as proof of process integrity rather than absence of data.

## 9. SLA Reports (Weekly / Monthly) & Reports Email

API предоставляет агрегированные SLA-отчёты для менеджеров, предназначенные для просмотра стейкхолдерами и экспорта.

## 9.1. JSON / PDF отчёты (weekly / monthly)

**Endpoints**

```http
GET /api/manager/reports/weekly/
GET /api/manager/reports/monthly/
GET /api/manager/reports/weekly/pdf/
GET /api/manager/reports/monthly/pdf/
Authorization: Token <MANAGER_TOKEN>
```

**Scope & rules**

* Данные ограничены компанией текущего менеджера.
* Период рассчитывается только на backend:

  * `weekly` — последние 7 дней;
  * `monthly` — последние 30 дней.
* Учитываются только `completed` jobs для SLA-оценки.
* Логика SLA и reason-codes та же, что в Job History и Performance (единый source of truth).

**JSON-ответ (концептуально)**

```json
{
  "period": {
    "from": "2026-01-01",
    "to": "2026-01-07"
  },
  "summary": {
    "jobs_count": 100,
    "violations_count": 12,
    "issue_rate": 0.12
  },
  "cleaners": [
    {
      "cleaner_id": 3,
      "cleaner_name": "Dev Cleaner",
      "jobs_total": 20,
      "violations": 3,
      "violation_rate": 0.15
    }
  ],
  "locations": [
    {
      "location_id": 5,
      "location_name": "Marina Heights Tower",
      "jobs_total": 10,
      "violations": 1,
      "violation_rate": 0.1
    }
  ],
  "top_sla_reasons": [
    { "reason": "missing_after_photo", "count": 7 },
    { "reason": "checklist_not_completed", "count": 5 }
  ]
}
```

**PDF-эндпоинты**

```http
GET /api/manager/reports/weekly/pdf/
GET /api/manager/reports/monthly/pdf/
```

возвращают бинарный PDF-файл с тем же набором данных, что и JSON-ответы, в формате отчёта:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="cleanproof-weekly-report.pdf"
```

### Reports & Overview API

Introduced read-only reporting endpoints for managerial and owner-level analytics.

Endpoints:
- `GET /api/manager/reports/weekly/`
- `GET /api/manager/reports/monthly/`
- `GET /api/owner/overview/?days=<number>`

These endpoints return aggregated, precomputed metrics and do not expose raw job data.

Owner overview response includes:
- period (from / to)
- jobs_count
- violations_count
- issue_rate
- top_locations (by issues)
- top_cleaners (by volume and issues)
- top_reasons (SLA violation codes)

All reports are informational and do not affect job state or business logic.

### 9.2. Job report email (v1 — краткий контракт)

#### 9.2.1. `POST /api/manager/jobs/{id}/report/email/` (основной контракт)

**Endpoint**

```http
POST /api/manager/jobs/{id}/report/email/
```

Sends the verified Job PDF report to email.

## Job PDF report (SLA & Proof)

Job PDF report (GET /api/manager/jobs/<id>/report/pdf/) формируется на основе фактического состояния job и включает блок SLA & Proof.
SLA-статус (ok / violated) и причины SLA (sla_reasons) вычисляются на backend с использованием общей доменной логики и не дублируются на уровне PDF.
В случае SLA OK PDF явно указывает, что все обязательные доказательства (check-in/out, photos, checklist) присутствуют.
В случае SLA violated в PDF отображается список конкретных причин нарушения.
Job PDF использует тот же SLA source of truth, что и Job Details в Manager Portal.

## Email Job PDF report

Endpoint POST /api/manager/jobs/<id>/report/email/ используется для отправки Job PDF отчёта по email.
PDF генерируется на backend на основе фактического состояния job и прикрепляется к письму как вложение.
Email может быть отправлен:

на email текущего пользователя (manager),
на произвольный email, переданный в payload.
Тело письма формируется сервером и содержит:
идентификатор job,
локацию и адрес,
дату выполнения,
имя клинера,

SLA статус (OK / violated, с причинами при наличии),
описание включённых доказательств (check-in/out, photos, checklist).
Каждая отправка PDF логируется как бизнес-событие.

## PDF Job Report & Email log

Реализованы API-эндпоинты для генерации и доставки PDF-отчётов по job, а также для логирования факта отправки отчёта по email:

GET /api/manager/jobs/<id>/report/pdf/
Генерирует и возвращает PDF job report (check-in/out, фото, checklist, audit events).

POST /api/manager/jobs/<id>/report/email/
Отправляет PDF job report на указанный email и логирует факт отправки.

GET /api/manager/jobs/<id>/report/emails/
Возвращает историю email-отправок PDF-отчёта по конкретному job (sent_at, target_email, sent_by, status, error_message).

История email-отправок используется как часть SLA / proof-контекста и предназначена для доказательства управленческих действий (отчёт был отправлен / не был отправлен).

**Behavior (v1):**

* Endpoint is available only to authenticated managers.
* Job is resolved strictly within the manager’s company.
* PDF is generated using the same backend logic as the Download PDF endpoint.
* If no email is provided in request body, the report is sent to `request.user.email`.
* Successful response indicates that the email has been sent (or queued, depending on email backend).

**Request body (optional):**

```json
{
  "email": "recipient@example.com"
}
```

**Response (200):**

```json
{
  "detail": "PDF report emailed.",
  "job_id": 123,
  "target_email": "manager@example.com"
}
```

**Notes:**

* Email delivery logic is backend-controlled.
* Frontend does not infer or compute recipient email.

### 9.3. Email PDF — Job report (подробный UX-слой v1)

Этот блок описывает то же самое поведение, но более развернуто с точки зрения продукта/UX.

**Endpoint**

```http
POST /api/manager/jobs/{job_id}/report/email/
```

**Описание**

Отправляет PDF-отчёт по конкретной job на email.

**Поведение**

* PDF генерируется тем же backend-кодом, что и `/report/pdf/` (single source of truth).
* По умолчанию отчёт отправляется на email текущего менеджера (`request.user.email`).
* Допускается явная передача `email` в теле запроса.

**Request body (optional)**

```json
{
  "email": "owner@example.com"
}
```

**Response (success)**

```json
{
  "detail": "PDF report emailed.",
  "job_id": 1,
  "target_email": "owner@example.com"
}
```

### 9.4. Email PDF — Weekly / Monthly reports (v1)

**Endpoints**

```http
POST /api/manager/reports/weekly/email/
POST /api/manager/reports/monthly/email/
```

**Описание**

Отправляет PDF-отчёт по SLA и performance за фиксированный период (7 или 30 дней).

**Поведение**

* Период рассчитывается строго на backend.
* PDF генерируется тем же кодом, что и `/weekly/pdf/` и `/monthly/pdf/`.
* Email получателя:

  * по умолчанию — `request.user.email`,
  * либо явно переданный `email` в теле запроса.

**Request body (optional)**

```json
{
  "email": "owner@example.com"
}
```

**Response (success)**

```json
{
  "detail": "Weekly report emailed.",
  "target_email": "owner@example.com",
  "period": {
    "from": "2026-01-22",
    "to": "2026-01-28"
  }
}
```

### 9.5. Reports Email (v2 — расширенный контракт и логирование)

All report email endpoints support optional recipient selection and are fully logged on the backend.

#### 9.5.1. Job report email (v2)

```http
POST /api/manager/jobs/<id>/report/email/
```

**Request body (optional):**

```json
{
  "email": "recipient@example.com"
}
```

If `email` is not provided, `request.user.email` is used by default.

The endpoint:

* generates the same PDF as `/report/pdf/` (single source of truth),
* sends the email using the configured Django email backend,
* creates a `ReportEmailLog` entry for every send attempt.

#### 9.5.2. Weekly / Monthly reports email (v2)

```http
POST /api/manager/reports/weekly/email/
POST /api/manager/reports/monthly/email/
```

**Request body (optional):**

```json
{
  "email": "recipient@example.com"
}
```

**Behavior:**

* period is calculated strictly on backend (7 / 30 days),
* PDF is identical to `/weekly/pdf/` and `/monthly/pdf/`,
* email is sent to the provided address or manager email by default,
* each send is recorded in `ReportEmailLog` with period, recipient, and status.

---

### Reports → Evidence (SLA drill-down)

`GET /api/manager/reports/violations/jobs/`

Read-only endpoint for drilling down from SLA aggregates to concrete jobs with a specific SLA violation reason.

**Query params:**
- `reason` — SLA reason code (e.g. `missing_after_photo`)
- `period_start` — YYYY-MM-DD
- `period_end` — YYYY-MM-DD

**Response includes:**
- selected `reason` and `reason_label`
- requested period
- pagination metadata
- list of jobs with:
  - job id
  - scheduled date
  - cleaner
  - location
  - SLA status and reasons

The endpoint reuses the same SLA computation logic as Performance and Reports aggregation (single source of truth).  
It is strictly read-only and does not affect job execution or status transitions.

---
### Reports PDF (Manager → Owner)

The weekly and monthly PDF reports are generated via manager-level endpoints and are intended for owner consumption.

The PDF includes owner-level SLA aggregates:
- total jobs in period
- jobs with SLA violations
- issue rate
- top SLA reasons
- primary locations and cleaners with issues
- narrative summary

There is no separate "owner PDF" endpoint.  
The Owner overview shown in the UI is a presentation layer over the same aggregated data and does not introduce additional metrics beyond what is already included in the PDF.

---
## Cleaner authentication (phone + PIN)

Реализована схема аутентификации клинеров через номер телефона и 4-значный PIN. Менеджер создаёт клинера через POST /api/manager/cleaners/, указывая имя, телефон, опциональный email и статус активности. PIN может быть задан при создании либо сгенерирован сервером при сбросе. Для входа клинер использует endpoint POST /api/auth/cleaner-login/ с параметрами phone и pin, в ответ возвращается auth token и данные пользователя. Сброс PIN доступен только менеджеру через POST /api/manager/cleaners/{id}/reset-pin/ и возвращает новый PIN, который отображается один раз.

## 10. API Contract — зафиксированные поля для Mobile Layer 1

Секция описывает минимально необходимый контракт для Mobile Layer 1 (логика без финального дизайна).
Эти поля уже используются и должны считаться стабильными.

### 10.1. Job Details payload (мобильное приложение)

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

* `latitude` / `longitude`:

  * могут быть `null`;
  * используются только для навигации в Mobile App;
  * отсутствие координат = UI показывает `Navigate (no location)` без `onPress`.
* Backend не обязан гарантировать наличие координат для каждой локации.

### 10.2. Job Photos (Mobile Layer 1)

Контракт для получения фото (упрощённая форма):

```json
{
  "type": "before",
  "file_url": "string",
  "created_at": "string"
}
```

**Правила (уже реализованы и используются)**

* максимум одно `before` и одно `after` фото на job;
* `after` запрещён без `before`;
* `file_url` используется:

  * для превью в мобильном приложении;
  * для встраивания в PDF-отчёт;
* отсутствие фото = UI показывает `No photo yet`.

(Фактический полный объект `photos` в Job Detail см. в разделах 2.2 / 2.7.1.)

### 10.3. Checklist Items (Mobile Layer 1)

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

  * read-only, пока `job.status != "in_progress"`;
  * обязателен для check-out, если `required = true` (все required должны быть `is_completed = true`).
* Backend остаётся единственным источником истины.
  UI лишь повторяет эти ограничения и не вводит свои правила.

  #### Checklist templates in manager meta

**GET /api/manager/meta/** теперь возвращает в поле `checklist_templates` расширенный объект:

```json
{
  "id": 1,
  "name": "Apartment – Standard (6 items)",
  "description": "",
  "items_preview": [
    "Vacuum all floors",
    "Mop hard floors",
    "Dust all surfaces"
  ],
  "items_count": 6
}
description — краткое описание шаблона (для чего используется).
items_preview — первые N пунктов чеклиста (используются как превью в UI).
items_count — общее количество пунктов в шаблоне.

Если у компании yet нет ни одного валидного шаблона с пунктами, при первом запросе GET /api/manager/meta/ вызывается хелпер create_default_checklist_templates_for_company(company) и создаются базовые шаблоны:

Apartment – Standard (6 items)
Apartment – Deep (12 items)
Office – Standard (8 items)
Villa – Full (12 items)

Checklist templates & job checklist linkage

Эндпоинт GET /api/manager/meta/ возвращает список checklist_templates, включающий: id, name, description, items_preview и items_count. Эти данные используются фронтендом для осознанного выбора шаблона при создании job.

При создании job через POST /api/manager/jobs/ можно передать поле checklist_template_id. Если оно указано, на стороне backend автоматически создаётся чеклист job на основе выбранного шаблона. Если поле не передано, job создаётся без чеклиста.

Состояние чеклиста job учитывается в proof-блоке (proof.checklist) и используется для вычисления SLA.

### 10.4. Job Events / Timeline (Mobile Layer 1)

```json
{
  "type": "check_in",
  "created_at": "string",
  "actor_name": "string"
}
```

**Использование**

* отображение таймлайна в `JobDetailsScreen`;
* данные read-only;
* порядок событий определяется backend (по `created_at`), фронт порядок не переупорядочивает.

## Email history — API contract (manager reports)

Зафиксирован полный контракт раздела Email history для менеджера. Экран использует эндпоинт
GET /api/manager/report-emails/ как единый источник данных для истории отправки всех отчётов (job, weekly, monthly). Контракт поддерживает фильтрацию по дате отправки (date_from, date_to — по created_at, формат YYYY-MM-DD), статусу (sent, failed), типу отчёта (job_report, weekly_report, monthly_report), job_id и части email получателя. Реализована серверная пагинация (page, page_size). Ответ стандартизирован и содержит count, параметры пагинации и массив results[] с денормализованными полями для UI: job_period, company_name, location_name, cleaner_name, target_email, status, sent_by, sent_at.

### 10.5. Guard Rails (API + UI договорённость)

**Backend**

* Жёстко валидирует порядок действий:

  * нельзя check-out без фото и чеклиста (см. 2.4);
  * нельзя `after` без `before`;
  * `completed` job — immutable (нельзя менять чеклист / фото / статусы).

**Frontend (Mobile)**

* Не предлагает невозможных действий:

  * Check in — только при `status = "scheduled"`;
  * Check out — только при `status = "in_progress"`;
  * `completed` — без action-кнопок.

### 10.6. Статус API для Mobile Layer 1

Контракты на текущий момент достаточны для:

* навигации;
* камеры / галереи;
* превью фото;
* чеклиста;
* таймлайна;
* PDF.

Новые API не требуются для закрытия Mobile Layer 1.
Все изменения на Mobile — consumer-level, без расширения backend.

---

## Job force-complete (manager override)

### Purpose

`force-complete` is a controlled manager-only action that allows completing a job
when the standard execution flow (photos / checklist) cannot be finished,
while **explicitly preserving SLA violations**.

This mechanism exists to reflect real-world exceptions without weakening
mobile enforcement or hiding execution issues.

Force-complete never represents a successful job.
It always results in an SLA violation.

---

### Endpoint

`POST /api/manager/jobs/<id>/force-complete/`

---

### Permissions & Preconditions

- Allowed role: `manager`
- Job must belong to the manager’s company
- Job status must be one of:
  - `scheduled`
  - `in_progress`
- Company must be active and not suspended (read-only companies cannot force-complete jobs)

---
## Analytics API (Manager)**

Реализован и подключён API-слой аналитики для менеджерского интерфейса. Все эндпоинты принимают диапазон дат через query-параметры `date_from` и `date_to` и возвращают агрегированные данные без бизнес-логики на фронтенде.

Поддерживаемые эндпоинты:

* `GET /api/manager/analytics/summary/` — сводные KPI (jobs completed, on-time rate, proof completion rate, avg duration, issues).
* `GET /api/manager/analytics/jobs-completed/` — дневной тренд выполненных работ.
* `GET /api/manager/analytics/job-duration/` — тренд средней длительности jobs.
* `GET /api/manager/analytics/proof-completion/` — тренды completion rate по before photo / after photo / checklist.
* `GET /api/manager/analytics/cleaners-performance/` — performance-метрики по каждому клинеру.

API используется страницей `/analytics` в Manager Portal. Контракт зафиксирован, формат ответов согласован с UI-компонентами.

---

### Request Body

```json
{
  "reason_code": "missing_after_photo",
  "comment": "Client left early, cleaner could not take after-photo."
}
Fields
reason_code (required, string)

Allowed values:

missing_before_photo
missing_after_photo
checklist_not_completed
other
comment (required, non-empty string)

Human-readable explanation provided by the manager.
This comment is stored in the audit trail and visible in the job timeline.

Backend Behavior
On successful force-complete:
Job status is set to completed (if not already).
actual_end_time is set to current time if missing.
Job SLA status is set to violated.
The provided reason_code is added to sla_reasons
(merged with existing reasons, no duplicates).

A JobCheckEvent is created with:
event_type = "force_complete"
user = manager
comment = request.comment
payload containing:
reason_code
previous job status
previous SLA status

Force-complete does not modify mobile execution rules and does not unblock
cleaner-side actions.

Response
Returns the updated job representation:

{
  "id": 55,
  "status": "completed",
  "sla_status": "violated",
  "sla_reasons": ["missing_after_photo"],
  "force_completed": true,
  "force_completed_at": "2026-02-02T12:34:56Z",
  "force_completed_by": {
    "id": 7,
    "full_name": "Manager Name"
  }
}
Errors
400 BAD REQUEST

missing or empty comment

invalid or missing reason_code

job already completed

403 FORBIDDEN

company is suspended (read-only mode)

user is not allowed to manage the job

404 NOT FOUND

job does not exist or does not belong to the manager’s company

SLA, Timeline & Reports Impact
Force-complete always results in sla_status = violated

The force-complete event appears in the Job Timeline

The event is included when filtering timeline by violation-related events

Reports and Analytics consume the same SLA data without special handling

This endpoint intentionally makes exceptions visible, auditable, and measurable.
ополнительные SLA-поля в ответе:

- `sla_status` — `"ok"` или `"violated"`.
- `sla_reasons` — массив строковых кодов причин нарушения SLA.
  Возможные значения (минимальный набор v1):
  - `"missing_before_photo"`
  - `"missing_after_photo"`
  - `"checklist_not_completed"`
  - `"check_in_missing"`
  - `"check_out_missing"`
  - `"other"` (ручной override).

- `force_completed` — `true`, если job был завершён через manager override.
- `force_completed_at` — ISO datetime момента принудительного завершения (или `null`).
- `force_completed_by` — объект с данными менеджера, который сделал override:
  ```json
  {
    "id": 16,
    "full_name": "DevNew Manager"
  }

### 4.2. Новый эндпоинт force-complete

### POST /api/manager/jobs/{id}/force-complete/

Принудительно помечает job как `completed` и устанавливает `sla_status=violated` с выбранной причиной.

Только для аутентифицированных менеджеров.

**Request**

```http
POST /api/manager/jobs/56/force-complete/
Authorization: Token <manager-token>
Content-Type: application/json
{
  "reason_code": "missing_after_photo",
  "comment": "Client left early, cleaner could not take after-photo."
}
reason_code — обязательный код причины из списка:
missing_before_photo
missing_after_photo
checklist_not_completed
check_in_missing
check_out_missing
other
comment — необязательный текстовый комментарий менеджера.

Responses
200 OK — job успешно force-completed. Тело ответа — обновлённый объект job (тот же формат, что в GET /api/manager/jobs/{id}/), включая:

status: "completed"
sla_status: "violated"
sla_reasons (содержит переданный reason_code)
force_completed: true

force_completed_at
force_completed_by.
400 Bad Request — неверный reason_code или бизнес-ошибка (например, job уже completed).
403 Forbidden — user не является менеджером.
404 Not Found — job не найден.



## Итоговое правило

Любая новая функциональность должна либо:

1. укладываться в контракты, зафиксированные здесь, либо
2. сначала обновить этот файл (`API_CONTRACT.md`) с чётким описанием изменений и только потом реализовывать их в коде.

```
::contentReference[oaicite:0]{index=0}
```


