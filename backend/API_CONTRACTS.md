# API_CONTRACTS — CleanProof

Status: ACTIVE  
Version: 1.1.0  
Last updated: 2026-02-04

Документ фиксирует **внешний контракт API** между Backend (Django / DRF) и клиентами:

- Manager Portal (React + Vite)
- Mobile Cleaner App (Expo + React Native)

Это **единственный источник правды** для фронтов и мобилки.  
Любые ломающие изменения сначала фиксируются здесь, затем реализуются в коде.

---

## CHANGELOG

### Правило ведения

Каждая запись в changelog имеет **жёсткую структуру** и добавляется **сверху**:

```md
### X.Y.Z — YYYY-MM-DD
- NEW: краткое описание нового эндпоинта / поля / поведения.
- CHANGED: что изменилось в существующем контракте.
- FIXED: уточнения, исправления, прояснение семантики.
- DEPRECATED: (опционально) что объявлено устаревшим.
- BREAKING: (опционально, ВСЕГДА ЯВНО) ломающие изменения.

### 1.1.0 — 2026-02-04
- NEW: `/api/manager/jobs/active/` — добавлены флаги `has_before_photo`, `has_after_photo`.
- CHANGED: `/api/manager/jobs/{id}/` — добавлены поля `manager_notes`, `cleaner_notes`.
- FIXED: уточнена семантика SLA helper’ов (`compute_sla_status_for_job`, `compute_sla_reasons_for_job`).

---

## 0. Общий контекст

### 0.1. Технологический стек

- **Backend:** Django + Django REST Framework, API-first.
- **DB:** SQLite в DEV, схема совместима с PostgreSQL.
- ** Manager Portal:** React + Vite + TypeScript.
- **Mobile Cleaner App:** Expo + React Native + TypeScript.

Backend — единственный source of truth для:

- статусов jobs
- GPS / чек-листов / фото
- SLA / аналитики
- PDF / отчётов / email-логов
- commercial-статусов компании

### 0.2. Base URL (DEV)

```text
http://127.0.0.1:8001
````

Все эндпоинты описаны **относительно** этого URL.

### 0.3. Авторизация

После логина все защищённые запросы идут с заголовком:

```http
Authorization: Token <TOKEN>
```

При отсутствии / некорректном токене:

```http
401 Unauthorized
{
  "detail": "Authentication credentials were not provided."
}
```

### 0.4. DEV-пользователи

```text
Cleaner:  cleaner@test.com  /  Test1234!
Manager:  manager@test.com /  Test1234!
```

Эти же креды зашиты в dev-конфиги web и mobile.

### 0.5. Роли

* `role = "manager"` — доступ ко всем manager-* эндпоинтам.
* `role = "cleaner"` — доступ только к cleaner-* эндпоинтам.
* Backend всегда проверяет:

  * роль;
  * принадлежность объекта компании / пользователю;
  * коммерческий статус компании (trial, blocked, active).

### 0.6. Координаты как источник истины

* `latitude` / `longitude` — **авторитетный источник истины** для GPS.
* Используются для:

  * навигации клинера;
  * проверки check-in / check-out;
  * включения в PDF / отчёты.
* `name` / `address` носят описательный характер и не участвуют в гео-валидации.
* Любые future geocoding/autocomplete **не перетирают** явно сохранённые координаты.

### 0.7. Trial / Pricing / Marketing alignment

* Marketing-страницы (`/cleanproof`, `/cleanproof/pricing`, `/cleanproof/demo`) **не создают сущностей** в системе и не трогают API.

* Trial:

  * стартует через backend (`/api/cleanproof/trials/start/`);
  * длится 7 дней;
  * статус, даты и `days_left` считаются только на backend;
  * soft-limits и trial-статус отдаются через `/api/cleanproof/usage-summary/`.

* Лэндинг и демо **описывают только то, что реально есть в API**:
  check-in, photos, checklist, check-out, PDF, SLA, отчёты.

### 0.8. Health check

Простой liveness-эндпоинт:

```http
GET /api/health/
→ 200 OK
{ "status": "ok" }
```

Используется web/mobile для проверки доступности backend.

---

## 1. Auth API

### 1.1. Общий логин (cleaner / generic)

```http
POST /api/auth/login/
Content-Type: application/json
```

**Request**

```json
{
  "email": "cleaner@test.com",
  "password": "Test1234!"
}
```

**Response 200**

```json
{
  "token": "string",
  "user_id": 3,
  "email": "cleaner@test.com",
  "full_name": "Dev Cleaner",
  "role": "cleaner"
}
```

**Ошибки**

* `400` — пустые поля:

  ```json
  { "detail": "Email and password are required." }
  ```

* `401` — неверные креды:

  ```json
  { "detail": "User not found" }
  ```

  или

  ```json
  { "detail": "Invalid credentials" }
  ```

### 1.2. Логин менеджера

```http
POST /api/manager/auth/login/
Content-Type: application/json
```

**Request**

```json
{
  "email": "manager@test.com",
  "password": "Test1234!"
}
```

**Response 200**

```json
{
  "token": "string",
  "user_id": 2,
  "email": "manager@test.com",
  "full_name": "Dev Manager",
  "role": "manager"
}
```

Ошибки — как у `/api/auth/login/`.

### 1.3. Self-serve signup (manager)

```http
POST /api/auth/signup/
Content-Type: application/json
```

**Назначение**

* создаёт `Company`;
* создаёт менеджера, привязанного к компании;
* запускает 7-дневный trial.

Trial-статус и usage-лимиты **используются только через**:

```http
GET /api/cleanproof/usage-summary/
```

### 1.4. Cleaner login (phone + PIN)

Альтернативная схема логина клинера.

```http
POST /api/auth/cleaner-login/
Content-Type: application/json
```

**Request**

```json
{
  "phone": "+971500000001",
  "pin": "1234"
}
```

**Response 200**

```json
{
  "token": "string",
  "user_id": 3,
  "full_name": "Dev Cleaner",
  "role": "cleaner"
}
```

**Reset PIN (manager)**

```http
POST /api/manager/cleaners/{id}/reset-pin/
Authorization: Token <MANAGER_TOKEN>
```

**Response 200**

```json
{
  "cleaner_id": 3,
  "new_pin": "1234"
}
```

`new_pin` показывается менеджеру **один раз**, хранится только на backend.

---

## 2. Cleaner API

Все эндпоинты ниже требуют:

```http
Authorization: Token <CLEANER_TOKEN>
role = "cleaner"
```

### 2.1. Today Jobs (список задач на сегодня)

```http
GET /api/jobs/today/
```

**Response 200 (плоский контракт)**

```json
[
  {
    "id": 5,
    "location__name": "Dubai Marina Tower",
    "scheduled_date": "2026-01-17",
    "scheduled_start_time": null,
    "scheduled_end_time": null,
    "status": "scheduled"  // "scheduled" | "in_progress" | "completed"
  }
]
```

Гарантии:

* всегда есть `id`, `location__name`, `scheduled_date`, `status`;
* нет вложенного `location` / `checklist` / `photos`.

Mobile опирается на:

* `location__name` — заголовок карточки;
* `scheduled_date` — дата;
* `status` — контролирует доступность check-in/out.

401 возвращается при отсутствии токена (см. 0.3).

### 2.2. Job Detail (Cleaner view)

```http
GET /api/jobs/<id>/
```

**Response 200 (пример)**

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
    }
  ],
  "sla_status": "ok",
  "sla_reasons": []
}
```

Особенности:

* `check_events` отсортированы по `created_at ASC`.
* `photos` максимум по одному `before` и `after`.
* `sla_status` и `sla_reasons` — вычисляемый SLA-слой (см. 5).

### 2.3. Check-in

```http
POST /api/jobs/<id>/check-in/
Content-Type: application/json
```

**Request**

```json
{
  "latitude": 25.08912,
  "longitude": 55.14567
}
```

**Response 200**

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

Правила:

* job принадлежит клинеру;
* `status === "scheduled"` до вызова;
* расстояние до `location` ≤ 100 м.

Ошибки:

* `400` — слишком далеко / нет координат / неверная бизнес-ситуация;
* `403` — чужая job;
* `409` — неверный статус (double check-in и т.п.).

### 2.4. Check-out

```http
POST /api/jobs/<id>/check-out/
Content-Type: application/json
```

**Request**

```json
{
  "latitude": 25.08913,
  "longitude": 55.14568
}
```

**Response 200**

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

Правила:

* `status === "in_progress"` до вызова;
* все required `checklist_items` закрыты;
* загружены `before` и `after` фото;
* GPS в допустимом радиусе.

Ошибки:

* `400` — нет фото / чек-лист не завершён и т.п.;
* `403` — чужая job;
* `409` — неверный статус.

### 2.5. Checklist toggle / bulk

**Один пункт**

```http
POST /api/jobs/<job_id>/checklist/<item_id>/toggle/
Content-Type: application/json
```

Request:

```json
{}
```

или

```json
{ "is_completed": true }
```

Response 200:

```json
{
  "id": 101,
  "is_completed": true
}
```

**Bulk**

```http
POST /api/jobs/<job_id>/checklist/bulk/
Content-Type: application/json
```

Request:

```json
{
  "items": [
    { "id": 101, "is_completed": true },
    { "id": 102, "is_completed": true }
  ]
}
```

Response 200:

```json
{ "updated_count": 2 }
```

### 2.6. Photos (upload / delete)

**Upload**

```http
POST /api/jobs/<id>/photos/
Content-Type: multipart/form-data
```

Поля:

* `photo_type`: `"before"` | `"after"`
* `file`: бинарник изображения

Response 201:

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

Правила:

* только при `status = "in_progress"`;
* `after` запрещён без `before`;
* максимум по одному фото каждого типа;
* при наличии EXIF-координат — проверка ≤ 100 м;
* `exif_missing = true` если EXIF нет, но загрузка разрешена.

Ошибки:

* `409` — второе фото того же типа или `after` без `before`;
* `400` — слишком далеко по EXIF;
* `403` — чужая job / неверная роль.

**Delete**

```http
DELETE /api/jobs/<id>/photos/<photo_type>/
```

`photo_type = "before" | "after"`.

Response 204.

Правила:

* только при `status = "in_progress"`;
* `before` нельзя удалить, если уже есть `after`.

### 2.7. Job PDF (Cleaner)

```http
POST /api/jobs/<id>/report/pdf/
```

Возвращает бинарный PDF:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="job-<id>-report.pdf"
```

PDF формируется из того же SLA/Proof-слоя, что и Manager-вид.

---

## 3. Manager — Company / Cleaners / Locations

Все эндпоинты:

```http
Authorization: Token <MANAGER_TOKEN>
role = "manager"
```

### 3.1. Company profile

```http
GET /api/manager/company/
```

Response 200:

```json
{
  "id": 1,
  "name": "Dev Company",
  "contact_email": "info@devcompany.com",
  "contact_phone": "+971500000000",
  "logo_url": "https://cdn.example.com/logos/dev-company.png"
}
```

```http
PATCH /api/manager/company/
Content-Type: application/json
```

Request (поля опциональны):

```json
{
  "name": "New Company Name",
  "contact_email": "ops@company.com",
  "contact_phone": "+971511111111"
}
```

Response 200 — обновлённый объект.

### 3.2. Company logo upload

```http
POST /api/manager/company/logo/
Content-Type: multipart/form-data
```

Form:

* `file`: PNG/JPG

Response 200:

```json
{
  "logo_url": "https://cdn.example.com/logos/dev-company-new.png"
}
```

### 3.3. Cleaners management

**List**

```http
GET /api/manager/cleaners/
```

Response 200:

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

**Create**

```http
POST /api/manager/cleaners/
Content-Type: application/json
```

Request:

```json
{
  "full_name": "New Cleaner",
  "email": "new.cleaner@devcompany.com",
  "phone": "+971500000002",
  "is_active": true
}
```

Правила:

* `full_name` обязателен;
* хотя бы одно из `email` / `phone` должно быть передано;
* `is_active` по умолчанию `true`.

Response 201 — созданный cleaner.

**Update**

```http
PATCH /api/manager/cleaners/<id>/
Content-Type: application/json
```

Все поля опциональны. Response 200 — обновлённый объект.

Ошибки:

* `404` — клинер не найден / чужая компания;
* `409` — конфликт email/phone внутри компании.

**Reset PIN**

см. 1.4.

### 3.4. Locations

**List**

```http
GET /api/manager/locations/
```

**Create**

```http
POST /api/manager/locations/
Content-Type: application/json
```

**Update**

```http
PATCH /api/manager/locations/{id}/
Content-Type: application/json
```

Локации:

* всегда привязаны к `company`;
* используются во всех job и meta-ответах;
* могут иметь `latitude`/`longitude = null` — тогда навигация ограничена.

---

## 4. Manager — Trial / Usage / Commercial enforcement

### 4.1. Trial start

```http
POST /api/cleanproof/trials/start/
Authorization: Token <MANAGER_TOKEN>
```

Поведение:

* если trial активен → возвращается текущий статус;
* если trial нет или истёк → запускается новый trial на 7 дней.

Response 200 (пример):

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

### 4.2. Usage summary & soft-limits

```http
GET /api/cleanproof/usage-summary/
Authorization: Token <MANAGER_TOKEN>
```

Response 200:

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

Принципы:

* endpoint **ничего не блокирует**, только даёт состояние;
* soft-limits используются для баннеров/подсказок.

### 4.3. Commercial enforcement / read-only mode

Для заблокированных компаний:

* все **изменяющие** эндпоинты → `403 Forbidden`
* коды ошибок:

```json
{
  "code": "company_blocked",
  "detail": "Your company is in read-only mode. Creating new jobs is not allowed."
}
```

или

```json
{
  "code": "trial_expired",
  "detail": "Your trial has expired. Please contact support to upgrade."
}
```
---

## 5. Manager — Jobs & Reports (final, MVP)

### 5.1. Job PDF report (cleaner + manager)

**Endpoint**

```http
POST /api/jobs/{id}/report/pdf/
Authorization: Token <CLEANER_OR_MANAGER_TOKEN>
````

**Назначение**

Сгенерировать и скачать PDF-отчёт по конкретной job.

**Кто имеет доступ**

* `role = cleaner` — только по своим jobs;
* `role = manager` — только jobs своей компании.

**Request**

Тело не требуется (`{}` или пустой body).

**Response 200 OK**

Возвращается бинарный PDF:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="job_report_<id>.pdf"
```

**Ошибки**

* `403 Forbidden` — роль не `cleaner` и не `manager`:

  ```json
  { "detail": "Only cleaners and managers can generate PDF reports." }
  ```
* `404 Not Found` — job не найдена в пределах компании/клинера.

---

### 5.2. Job PDF → Email (manager)

**Endpoint**

```http
POST /api/manager/jobs/{id}/report/email/
Authorization: Token <MANAGER_TOKEN>
Content-Type: application/json
```

**Назначение**

Отправить PDF job-отчёта на email.

**Кто имеет доступ**

Только `role = manager`, job должна принадлежать компании менеджера.

**Request body (опционально)**

```json
{
  "email": "recipient@example.com"
}
```

* если `email` не передан → используется `request.user.email`;
* если в итоге email пустой → ошибка.

**Поведение**

1. Получаем job по `company` менеджера.
2. Генерируем PDF тем же helper’ом, что и download:

   * при исключении → `500`.
3. Собираем письмо:

   * subject: `Job report #<job.id>`;
   * в тексте: id, location, address, date, cleaner, SLA-строка (если есть).
4. Отправляем через `EmailMessage`.
5. Пишем запись в `ReportEmailLog`:

   * `kind = KIND_JOB_REPORT`;
   * `status = sent/failed`;
   * `error_message` при ошибке.

**Response 200 OK (успех)**

```json
{
  "detail": "PDF report emailed.",
  "job_id": 123,
  "target_email": "recipient@example.com"
}
```

**Ошибки**

* `403 Forbidden` — не менеджер:

  ```json
  { "detail": "Only managers can email PDF reports." }
  ```
* `400 Bad Request` — после всех fallback’ов email пустой:

  ```json
  { "detail": "Email is required." }
  ```
* `500 Internal Server Error` — ошибка генерации PDF:

  ```json
  { "detail": "Failed to generate PDF report." }
  ```
* `500 Internal Server Error` — PDF пустой:

  ```json
  { "detail": "PDF generation returned empty content." }
  ```
* `502 Bad Gateway` — ошибка отправки email (SMTP и т.п.):

  ```json
  { "detail": "Failed to send email." }
  ```

---

### 5.3. Job report email history (manager)

**Endpoint**

```http
GET /api/manager/jobs/{id}/report/emails/
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

История отправок PDF-отчёта по конкретной job.

**Кто имеет доступ**

Только `role = manager`, job должна принадлежать компании менеджера.

**Response 200 OK**

```json
{
  "job_id": 123,
  "emails": [
    {
      "id": 10,
      "sent_at": "2026-02-02T12:34:56.123456+04:00",
      "target_email": "owner@example.com",
      "status": "sent",
      "sent_by": "Dev Manager",
      "subject": "Job report #123",
      "error_message": ""
    }
  ]
}
```

* возвращается максимум 20 последних записей, отсортированных по `created_at DESC`;
* `sent_by` — `full_name` пользователя, упавший в лог, или его email; может быть `null`, если `user` отсутствует.

**Ошибки**

* `403 Forbidden` — не менеджер:

  ```json
  { "detail": "Only managers can view report email history." }
  ```
* `404 Not Found` — job не принадлежит компании менеджера.

---

### 5.4. Today jobs (manager dashboard)

**Endpoint**

```http
GET /api/manager/jobs/today/
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

Список jobs компании менеджера на **сегодня** для дашборда.

**Response 200 OK**

```json
[
  {
    "id": 10,
    "status": "in_progress",
    "scheduled_date": "2026-02-02",
    "scheduled_start_time": "09:00:00",
    "scheduled_end_time": "11:00:00",
    "location": {
      "id": 5,
      "name": "Marina Heights Tower",
      "address": "Dubai Marina, Dubai, UAE"
    },
    "cleaner": {
      "id": 3,
      "full_name": "Dev Cleaner",
      "phone": "+971500000000"
    }
  }
]
```

**Особенности**

* дата берётся как `timezone.localdate()`;
* фильтрация только по `company` менеджера.

**Ошибки**

* `403 Forbidden` — не менеджер:

  ```json
  { "detail": "Only managers can view jobs overview." }
  ```

---

### 5.5. Active jobs (Manager Portal → Jobs / Active tab)

**Endpoint**

```http
GET /api/manager/jobs/active/
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

Оперативный список jobs для вкладки **Jobs / Active**:

* все jobs со статусом `scheduled` или `in_progress` (любая дата);
* плюс `completed` jobs, у которых `actual_end_time` за последние `ACTIVE_COMPLETED_DAYS` дней (по коду: 30).

**Response 200 OK**

```json
[
  {
    "id": 7,
    "status": "in_progress",
    "scheduled_date": "2026-02-02",
    "scheduled_start_time": "09:00",
    "scheduled_end_time": "11:00",
    "location_name": "Dubai Marina Tower",
    "location_address": "Dubai Marina, Dubai, UAE",
    "cleaner_name": "Dev Cleaner",
    "has_before_photo": true,
    "has_after_photo": false
  }
]
```

**Семантика**

* `scheduled_date` — строка `YYYY-MM-DD` или `null`;
* времена записаны в формате `"HH:MM"` или `null`;
* `has_before_photo` / `has_after_photo` считаются по `JobPhoto.photo_type`.

**Ошибки**

* `400 Bad Request` — у менеджера нет компании:

  ```json
  { "detail": "Manager has no company." }
  ```

---

### 5.6. Create job (manager)

**Endpoint**

```http
POST /api/manager/jobs/
Authorization: Token <MANAGER_TOKEN>
Content-Type: application/json
```

**Назначение**

Создание job менеджером (планирование).

**Request (JSON)**

(через `ManagerJobCreateSerializer`, список полей см. там; в контракте фиксируем ключевые:)

Обязательные:

* `scheduled_date` — `YYYY-MM-DD`
* `location_id` — integer
* `cleaner_id` — integer

Опциональные (MVP):

* `scheduled_start_time` — `HH:MM[:SS]`
* `scheduled_end_time` — `HH:MM[:SS]`
* `checklist_template_id` — integer или `null`
* `notes` / `manager_notes` (зависит от сериализатора)

**Enforcement (trial / blocking)**

Перед созданием выполняются проверки:

1. **company.is_blocked() → 403**

   * если `company.is_trial_expired()`:

     ```json
     {
       "code": "trial_expired",
       "detail": "Your free trial has ended. You can still view existing jobs and download reports, but creating new jobs requires an upgrade."
     }
     ```
   * иначе:

     ```json
     {
       "code": "company_blocked",
       "detail": "Your account is currently blocked. Please contact support."
     }
     ```

2. **Trial jobs limit** при активном trial:

   * если `company.is_trial_active` и `company.trial_jobs_limit_reached()`:

     ```json
     {
       "code": "trial_jobs_limit_reached",
       "detail": "Your free trial allows up to <TRIAL_MAX_JOBS> jobs. Please upgrade your plan to create more jobs."
     }
     ```

**Response 201 Created**

Тело ответа — объект job в формате `PlanningJobSerializer`, совместимый с planning/history (см. 4.8 / 4.9).

**Ошибки**

* `403 Forbidden` — роль не manager (до всех проверок компании):

  ```json
  { "detail": "Only managers can create jobs." }
  ```
* `400 Bad Request` — ошибки валидации сериализатора.

---

### 5.7. Job detail (manager)

**Endpoint**

```http
GET /api/manager/jobs/{id}/
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

Полные детали job для менеджера: расписание, location/cleaner, фото, чек-лист, события, SLA.

**Response 200 OK (структура)**

```json
{
  "id": 10,
  "status": "completed",
  "scheduled_date": "2026-02-02",
  "scheduled_start_time": "09:00:00",
  "scheduled_end_time": "11:00:00",
  "actual_start_time": "2026-02-02T09:05:12+04:00",
  "actual_end_time": "2026-02-02T10:58:03+04:00",
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
  "manager_notes": "string or null",
  "cleaner_notes": "string or null",
  "photos": [
    {
      "photo_type": "before",
      "file_url": "https://.../before.jpg",
      "latitude": 25.08912,
      "longitude": 55.14567,
      "photo_timestamp": "2026-02-02T09:06:00+04:00",
      "created_at": "2026-02-02T09:06:10+04:00"
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
  "check_events": [
    {
      "event_type": "check_in",
      "created_at": "2026-02-02T09:05:12+04:00",
      "latitude": 25.08912,
      "longitude": 55.14567
    }
  ],
  "sla_status": "ok",
  "sla_reasons": []
}
```

**Особенности**

* `photos.file_url`, если начинается с `/`, приводится к абсолютному URL через `request.build_absolute_uri`.
* `sla_status` и `sla_reasons` считаются helper’ами:

  * `compute_sla_status_for_job(job)`
  * `compute_sla_reasons_for_job(job)`

**Ошибки**

* `403 Forbidden` — не менеджер:

  ```json
  { "detail": "Only managers can view job details." }
  ```
* `404 Not Found` — job не принадлежит компании менеджера.

---

### 5.8. Planning jobs list

**Endpoint**

```http
GET /api/manager/jobs/planning/?date=YYYY-MM-DD
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

Список jobs за конкретный день для экрана **Planning**.

**Query params**

* `date` — обязательный:

  * формат `YYYY-MM-DD`, либо
  * `DD.MM.YYYY` (для совместимости с UI), либо
  * ISO-строка c `T` (в этом случае берётся часть до `T`).

При неверном формате:

```json
{
  "detail": "Invalid date format. Expected YYYY-MM-DD or DD.MM.YYYY"
}
```

**Response 200 OK**

Массив объектов в формате helper’а `build_planning_job_payload(job)`:

```json
[
  {
    "id": 7,
    "scheduled_date": "2026-02-02",
    "scheduled_start_time": "09:00:00",
    "scheduled_end_time": "11:00:00",
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
      "before_uploaded": true,
      "after_uploaded": false,
      "checklist_completed": false,
      "before_photo": true,
      "after_photo": false,
      "checklist": false
    },
    "sla_status": "violated",
    "sla_reasons": ["missing_after_photo", "checklist_not_completed"],
    "checklist_template": {
      "id": 2,
      "name": "Apartment – Deep (12 items)"
    },
    "checklist_items": [
      "Vacuum all floors",
      "Mop hard floors"
    ]
  }
]
```

**Семантика SLA внутри planning/history**

* SLA здесь рассчитывается **упрощённо** в `build_planning_job_payload`:

  * если job `status = completed`:

    * нет `before` → `missing_before_photo`;
    * нет `after` → `missing_after_photo`;
    * checklist не пройден → `checklist_not_completed`;
  * иначе `sla_status = "ok"` и `sla_reasons = []`.

---

### 5.9. Job history (manager)

**Endpoint**

```http
GET /api/manager/jobs/history/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
Authorization: Token <MANAGER_TOKEN>
```

**Назначение**

История jobs за период (архив) для вкладки **History**.

**Обязательные query-параметры**

* `date_from` — `YYYY-MM-DD`
* `date_to` — `YYYY-MM-DD`

При неверном формате:

```json
{ "detail": "Invalid date format. Use YYYY-MM-DD." }
```

**Дополнительные фильтры**

* `status` — фильтр по статусу job;
* `cleaner_id` — фильтр по клинеру;
* `location_id` — фильтр по локации.

**Response 200 OK**

Массив объектов в **том же формате, что и planning** (`build_planning_job_payload(job)`), отсортированный по:

* `scheduled_date DESC`,
* `scheduled_start_time DESC`,
* `id DESC`.

**Ошибки**

* `403 Forbidden` — не менеджер:

  ```json
  { "detail": "Only managers can access job history." }
  ```

---

### 5.10. Force-complete job (manager override)

**Endpoint**

```http
POST /api/manager/jobs/{id}/force-complete/
Authorization: Token <MANAGER_TOKEN>
Content-Type: application/json
```

**Назначение**

Принудительно завершить job со стороны менеджера и **явно зафиксировать SLA-нарушение**.

**Кто имеет доступ**

* `role = manager`;
* job принадлежит компании менеджера;
* компания не в блокировке (`company.is_blocked() == False`);
* job ещё не `completed`.

**Request body**

```json
{
  "reason_code": "missing_after_photo",
  "comment": "Client left early, cleaner could not take after-photo."
}
```

**Правила**

* `reason_code` — **обязательный**, одно из:

  * `missing_before_photo`
  * `missing_after_photo`
  * `checklist_not_completed`
  * `missing_check_in`
  * `missing_check_out`
  * `other`
* `comment` — **обязательный**, непустая строка (человеческое пояснение).

**Enforcement компании**

Если `company.is_blocked()`:

* код определяется по `company.is_trial_expired()`:

```json
{
  "code": "trial_expired",
  "detail": "Your free trial has ended. You can still view existing jobs and download reports, but overriding jobs requires an upgrade."
}
```

или

```json
{
  "code": "company_blocked",
  "detail": "Your account is currently blocked. Please contact support."
}
```

**Поведение**

1. Проверка роли, компании, блокировок, статуса job.

2. Если job уже `completed` → `400`.

3. Обновляем:

   * `job.status = completed`;
   * `job.actual_end_time = now`, если было `null`;
   * `job.sla_status = "violated"`;
   * `job.sla_reasons` → список, объединённый с новым `reason_code` без дублей;
   * по возможности заполняем:

     * `force_completed = True`
     * `force_completed_at = now`
     * `force_completed_by = user`.

4. Сохраняем job.

5. Пишем `JobCheckEvent`:

   * `event_type = "force_complete"`,
   * `user = manager`.

**Response 200 OK**

```json
{
  "id": 55,
  "status": "completed",
  "sla_status": "violated",
  "sla_reasons": ["missing_after_photo"],
  "force_completed": true,
  "force_completed_at": "2026-02-02T12:34:56.789012+04:00",
  "force_completed_by": {
    "id": 7,
    "full_name": "Dev Manager"
  }
}
```

(если каких-то `force_*` полей нет в модели — они просто опускаются в ответе).

**Ошибки**

* `403 Forbidden` — если не менеджер:

  ```json
  { "detail": "Only managers can force-complete jobs." }
  ```
* `400 Bad Request`:

  * менеджер без компании:

    ```json
    { "detail": "Manager has no company." }
    ```
  * job уже completed:

    ```json
    { "detail": "Job is already completed and cannot be force-completed." }
    ```
  * `reason_code` не передан или не из разрешённого списка:

    ```json
    { "detail": "Invalid or missing 'reason_code'." }
    ```
  * пустой `comment`:

    ```json
    { "detail": "Comment is required." }
    ```
* `403 Forbidden` — компания заблокирована (см. блок про `company_blocked` / `trial_expired` выше).
* `404 Not Found` — job не принадлежит компании менеджера или не существует.

### 5.11. Manager meta (cleaners / locations / checklist templates)

```http
GET /api/manager/meta/
```

Response 200:

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
  ]
}
```

Если у компании нет валидных шаблонов, при первом вызове backend:

* создаёт дефолтный набор:

  * Apartment – Standard (6 items)
  * Apartment – Deep (12 items)
  * Office – Standard (8 items)
  * Villa – Full (12 items)

* возвращает их в этом же ответе.

### 5.12. Checklist templates list (отдельный)

```http
GET /api/manager/checklists/templates/
```

Response 200 (минимальный контракт):

```json
[
  { "id": 1, "name": "Standard Apartment Cleaning (6 items)" },
  { "id": 2, "name": "Standard Apartment Cleaning (12 items)" },
  { "id": 3, "name": "Office Cleaning (8 items)" },
  { "id": 4, "name": "Villa Cleaning (12 items)" }
]
```

`Status: IMPLEMENTED (v1)`


## 6. Reports / PDF / Email / Email history


### 6.1. Weekly / Monthly reports (JSON + PDF)

**JSON**

```http
GET /api/manager/reports/weekly/
GET /api/manager/reports/monthly/
Authorization: Token <MANAGER_TOKEN>
```

Периоды считаются на backend:

* weekly — последние 7 дней;
* monthly — последние 30 дней.

Response (концептуально):

```json
{
  "period": { "from": "2026-01-01", "to": "2026-01-07" },
  "summary": {
    "jobs_count": 100,
    "violations_count": 12,
    "issue_rate": 0.12
  },
  "cleaners": [ ... ],
  "locations": [ ... ],
  "top_sla_reasons": [
    { "reason": "missing_after_photo", "count": 7 },
    { "reason": "checklist_not_completed", "count": 5 }
  ]
}
```

**PDF**

```http
GET /api/manager/reports/weekly/pdf/
GET /api/manager/reports/monthly/pdf/
```

Возвращают PDF с теми же данными в отчётном виде.

### 6.2. Weekly / Monthly reports email

```http
POST /api/manager/reports/weekly/email/
POST /api/manager/reports/monthly/email/
Authorization: Token <MANAGER_TOKEN>
Content-Type: application/json
```

Request (optional):

```json
{
  "email": "owner@example.com"
}
```

Response 200:

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

Каждая отправка также логируется в `ReportEmailLog`.

### 6.3. Owner overview

```http
GET /api/owner/overview/?days=<int>
Authorization: Token <OWNER_TOKEN>
```

Read-only high-level summary для владельца:

* period (from / to)
* jobs_count
* violations_count
* issue_rate
* top_locations
* top_cleaners
* top_reasons

Owner-уровень **не даёт drill-down до конкретных jobs**.

### 6.4. Reports → Violations Jobs

```http
GET /api/manager/reports/violations/jobs/
Authorization: Token <MANAGER_TOKEN>
```

**Query params (обязательно указать период + хотя бы один фильтр):**

* `period_start` — `YYYY-MM-DD`
* `period_end` — `YYYY-MM-DD`
* `reason` — SLA reason-code
* `cleaner_id`
* `location_id`
* пагинация: `page`, `page_size`

Response:

* `period.start` / `period.end`
* `reason` / `reason_label` (если применимо)
* `results[]`:

  * `id`
  * `status`
  * `scheduled_date`
  * `location_id` / `location_name`
  * `cleaner_id` / `cleaner_name`
  * `sla_status`
  * `sla_reasons`

### 6.5. Email history

```http
GET /api/manager/report-emails/
Authorization: Token <MANAGER_TOKEN>
```

Поддерживает фильтры:

* `date_from`, `date_to` — по `created_at`
* `status` — `sent` | `failed`
* `report_type` — `job_report` | `weekly_report` | `monthly_report`
* `job_id`
* `email` (substring-поиск)

Пагинация: `page`, `page_size`.

Response 200:

```json
{
  "count": 42,
  "page": 1,
  "page_size": 20,
  "results": [
    {
      "id": 1,
      "report_type": "job_report",
      "job_period": "2026-01-15",
      "company_name": "Dev Company",
      "location_name": "Marina Heights Tower",
      "cleaner_name": "Dev Cleaner",
      "target_email": "owner@example.com",
      "status": "sent",
      "sent_by": "Dev Manager",
      "sent_at": "2026-01-16T10:00:00Z",
      "error_message": null
    }
  ]
}
```

---

## 7. Analytics & SLA Engine

### 7.1. SLA Engine (общая семантика)

Backend использует helper:

```text
+ compute_sla_status_for_job(job)
+ compute_sla_reasons_for_job(job)
```

Он возвращает:

* `sla_status` — `"ok"` | `"violated"`
* `sla_reasons` — массив строковых кодов:

  * `missing_before_photo`
  * `missing_after_photo`
  * `checklist_not_completed`
  * `missing_check_in`
  * `missing_check_out`
  * `late_start`
  * `early_leave`
  * `proof_missing`
  * `other`
  * … (расширяемый список)

**Source of truth:**

* SLA нигде не пересчитывается на фронте / в PDF;
* все SLA-агрегаты (Reports, Performance, Analytics) опираются на один и тот же helper.

### 7.2. Performance API

```http
GET /api/manager/performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
Authorization: Token <MANAGER_TOKEN>
```

Response 200 (концептуально):

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

### 7.3. Manager Analytics — summary / cleaners / trends

Общий формат: все endpoints принимают:

```text
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
```

Период включителен, агрегируется по `actual_end_time`.

#### 7.3.1. Summary

```http
GET /api/manager/analytics/summary/
```

Response:

```json
{
  "jobs_completed": 4,
  "on_time_completion_rate": 0.25,
  "proof_completion_rate": 0.5,
  "avg_job_duration_hours": 0.22,
  "issues_detected": 2
}
```

#### 7.3.2. Cleaners performance

```http
GET /api/manager/analytics/cleaners-performance/
```

Response:

```json
[
  {
    "cleaner_id": 17,
    "cleaner_name": "Aisha Muxamed",
    "jobs_completed": 3,
    "avg_job_duration_hours": 0.33,
    "on_time_rate": 0.0,
    "proof_rate": 0.33,
    "issues": 2
  }
]
```

#### 7.3.3. Jobs completed trend

```http
GET /api/manager/analytics/jobs-completed/
```

Response:

```json
[
  { "date": "2026-02-01", "jobs_completed": 1 },
  { "date": "2026-02-02", "jobs_completed": 3 }
]
```

#### 7.3.4. Job duration trend

```http
GET /api/manager/analytics/job-duration/
```

Response:

```json
[
  { "date": "2026-02-01", "avg_job_duration_hours": 0.47 }
]
```

#### 7.3.5. Proof completion trend

```http
GET /api/manager/analytics/proof-completion/
```

Response:

```json
[
  {
    "date": "2026-02-01",
    "before_photo_rate": 1.0,
    "after_photo_rate": 1.0,
    "checklist_rate": 1.0
  }
]
```

### 7.4. SLA Breakdown (Analytics v2)

```http
GET /api/manager/analytics/sla-breakdown/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
```

Response:

```json
{
  "jobs_completed": 10,
  "violations_count": 4,
  "violation_rate": 0.4,
  "reasons": [
    { "code": "late_start", "count": 2 },
    { "code": "checklist_not_completed", "count": 1 },
    { "code": "proof_missing", "count": 1 }
  ],
  "top_cleaners": [
    {
      "cleaner_id": 3,
      "cleaner_name": "Ahmed Hassan",
      "jobs_completed": 5,
      "violations_count": 2,
      "violation_rate": 0.4
    }
  ],
  "top_locations": [
    {
      "location_id": 7,
      "location_name": "Dubai Marina",
      "jobs_completed": 4,
      "violations_count": 2,
      "violation_rate": 0.5
    }
  ]
}
```

Status: `IMPLEMENTED (Analytics SLA v2, backend-only UI)`.

---

## 8. Mobile Layer 1 — минимальный контракт

Для Mobile v1 зафиксирован **минимальный необходимый** набор полей.

### 8.1. Job Details (Mobile)

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

`latitude` / `longitude` могут быть `null` — тогда кнопка навигации работает без ссылок на карты.

### 8.2. Job Photos (Mobile)

Упрощённая форма:

```json
{
  "type": "before",
  "file_url": "string",
  "created_at": "string"
}
```

Максимум одно `before` и одно `after`.
Отсутствие фото → UI показывает “No photo yet”.

### 8.3. Checklist Items (Mobile)

```json
{
  "id": 0,
  "text": "string",
  "required": true,
  "is_completed": false
}
```

Пока `status != "in_progress"`, чек-лист read-only.

### 8.4. Job Events / Timeline (Mobile)

```json
{
  "type": "check_in",
  "created_at": "string",
  "actor_name": "string"
}
```

Backend задаёт порядок, фронт не переупорядочивает.

---

## 9. Ошибки — общий паттерн

Все эндпоинты возвращают ошибки в виде:

```json
{
  "detail": "Error message here"
}
```

Дополнительно могут быть:

```json
{
  "code": "company_blocked",
  "detail": "Your account is currently blocked. Please contact support."
}
```

Статусы:

* `400 Bad Request` — бизнес-ошибка (GPS, чек-лист, неверные аргументы и т.п.).
* `401 Unauthorized` — нет/невалиден токен.
* `403 Forbidden` — не та роль / чужие данные / commercial guard.
* `404 Not Found` — объект не найден или не принадлежит компании.
* `409 Conflict` — неверный статус для операции, конфликт фото, double action.

Фронт:

* читает `detail`;
* показывает пользователю;
* не парсит текст в бизнес-логику.

---

## 10. Backend implementation modules (для разработчиков)

Внутреннее разбиение views (не влияет на контракт):

* `backend/apps/api/views.py`
  единая точка подключения, manager meta, дефолтные чек-листы.

* `backend/apps/api/views_auth.py`
  login/signup, cleaner phone+PIN.

* `backend/apps/api/views_cleaner.py`
  today jobs, job details, check-in/out, checklist, photos, job PDF.

* `backend/apps/api/views_manager_company.py`
  company profile, logo, cleaners CRUD, reset-pin.

* `backend/apps/api/views_manager_jobs.py`
  job create/today/planning/history, manager job detail, SLA helpers, force-complete, performance.

* `backend/apps/api/views_reports.py`
  job report email, weekly/monthly JSON+PDF, owner overview, report email log, weekly/monthly email.

---

## 11. Итоговое правило

Любая новая функциональность:

1. либо **укладывается** в описанные здесь контракты,
2. либо сначала обновляет `API_CONTRACTS.md` с явным описанием изменений,
   и только затем реализуется в коде.

Backend остаётся единственным источником истины по статусам, SLA, аналитике и отчётам.
Фронты — только потребители этого контракта.

```
```
