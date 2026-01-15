````markdown
# API Contracts (DEV) — Cleaning SaaS

Этот документ фиксирует контракт между Backend (Django / DRF) и Frontend (React / Lovable).  
Контракт считается источником правды для фронтенда.

Backend: Django REST Framework  
Base URL (dev): `http://127.0.0.1:8001`  

Auth header (везде после логина):  
`Authorization: Token <TOKEN>`

DEV users:

- Cleaner: `cleaner@test.com` / `Test1234!`
- Manager: `manager@test.com` / `Test1234!`

---

## 1. Auth

### 1.1 Cleaner login

**POST** `/api/auth/login/`  

Request (JSON):

```json
{
  "email": "cleaner@test.com",
  "password": "Test1234!"
}
````

Response `200 OK`:

```json
{
  "token": "string",
  "user_id": 3,
  "email": "cleaner@test.com",
  "full_name": "Dev Cleaner",
  "role": "cleaner"
}
```

Общие правила:

* При пустом `email` или `password` → `400` с `{ "detail": "Email and password are required." }`
* При неверном логине/пароле → `401` с `{ "detail": "User not found" }` или `{ "detail": "Invalid credentials" }`
* Все последующие запросы идут с заголовком `Authorization: Token <token>`

### 1.2 Manager login

**POST** `/api/manager/auth/login/`

Request (JSON):

```json
{
  "email": "manager@test.com",
  "password": "Test1234!"
}
```

Response `200 OK`:

```json
{
  "token": "string",
  "user_id": 2,
  "email": "manager@test.com",
  "full_name": "Dev Manager",
  "role": "manager"
}
```

---

## 2. Cleaner API

Все cleaner-эндпоинты требуют:
`Authorization: Token <CLEANER_TOKEN>`
и роль пользователя `role = "cleaner"`.

### 2.1 GET `/api/jobs/today/`

Описание: список сегодняшних job для залогиненного клинера.

Response `200 OK` (array):

```json
[
  {
    "id": 10,
    "status": "scheduled",
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
    "check_in_time": null,
    "check_out_time": null,
    "has_before_photo": false,
    "has_after_photo": false,
    "all_checklist_completed": false
  }
]
```

Минимум, на что может опираться фронт:

* `id`
* `status` (`scheduled` / `in_progress` / `completed`)
* `scheduled_date`, `scheduled_start_time`, `scheduled_end_time`
* `location.name` + `location.address`
* флаги: `has_before_photo`, `has_after_photo`, `all_checklist_completed`

### 2.2 GET `/api/jobs/<id>/`

Детали конкретного job.

Response `200 OK`:

```json
{
  "id": 10,
  "status": "in_progress",
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
      "event_timestamp": "2026-01-15T09:05:12+04:00",
      "latitude": 25.08912,
      "longitude": 55.14567
    }
  ],
  "photos": {
    "before": {
      "url": "https://cdn.example.com/.../before.jpg",
      "latitude": 25.08912,
      "longitude": 55.14567,
      "photo_timestamp": "2026-01-15T09:06:00+04:00"
    },
    "after": null
  },
  "checklist_items": [
    {
      "id": 101,
      "text": "Vacuum living room",
      "order_index": 0,
      "is_completed": false
    },
    {
      "id": 102,
      "text": "Clean bathroom",
      "order_index": 1,
      "is_completed": true
    }
  ]
}
```

Фронту важно:

* `status` — контролировать доступность кнопок (check-in/out, photos)
* `checklist_items` — рисовать чеклист
* `photos.before` / `photos.after` — показывать превью
* `check_events` — показывать факт check-in/out (опционально)

### 2.3 POST `/api/jobs/<id>/check-in/`

Body (JSON):

```json
{
  "latitude": 25.08912,
  "longitude": 55.14567
}
```

Response `200 OK` (пример целевого контракта):

```json
{
  "status": "in_progress",
  "check_in": {
    "event_timestamp": "2026-01-15T09:05:12+04:00",
    "latitude": 25.08912,
    "longitude": 55.14567
  }
}
```

Правила:

* Только при `status = "scheduled"`.
* GPS расстояние ≤ 100 м от локации.
* При ошибке — `400` / `403` с понятным текстом в поле `detail` (фронт показывает как alert/toast).

### 2.4 POST `/api/jobs/<id>/check-out/`

Body (JSON):

```json
{
  "latitude": 25.08913,
  "longitude": 55.14568
}
```

Response `200 OK` (пример):

```json
{
  "status": "completed",
  "check_out": {
    "event_timestamp": "2026-01-15T10:58:03+04:00",
    "latitude": 25.08913,
    "longitude": 55.14568
  }
}
```

Правила:

* Только при `status = "in_progress"`.
* Все обязательные checklist-пункты должны быть `is_completed = true`.
* GPS расстояние ≤ 100 м.

### 2.5 Checklist toggle

**POST** `/api/jobs/<job_id>/checklist/<item_id>/toggle/`

Body может быть пустым `{}` или:

```json
{
  "is_completed": true
}
```

Response `200 OK`:

```json
{
  "id": 101,
  "is_completed": true
}
```

Фронту достаточно обновить чекбокс по `id`.

### 2.6 Checklist bulk

**POST** `/api/jobs/<job_id>/checklist/bulk/`

Body:

```json
{
  "items": [
    { "id": 101, "is_completed": true },
    { "id": 102, "is_completed": true }
  ]
}
```

Response `200 OK`:

```json
{
  "updated_count": 2
}
```

### 2.7 Photos

#### 2.7.1 GET `/api/jobs/<id>/photos/`

Целевой контракт (удобный для фронта):

```json
{
  "before": {
    "url": "https://cdn.example.com/.../before.jpg",
    "latitude": 25.08912,
    "longitude": 55.14567,
    "photo_timestamp": "2026-01-15T09:06:00+04:00"
  },
  "after": {
    "url": "https://cdn.example.com/.../after.jpg",
    "latitude": 25.08913,
    "longitude": 55.14568,
    "photo_timestamp": "2026-01-15T10:57:00+04:00"
  }
}
```

Текущая реализация может возвращать массив объектов; контракт фиксирует, что фронту достаточно привести это к виду `before/after`.

#### 2.7.2 POST `/api/jobs/<id>/photos/`

Multipart form-data:

* `photo_type`: `"before"` или `"after"`
* `file`: бинарник (image)

Response `201 Created`:

```json
{
  "photo_type": "before",
  "url": "https://cdn.example.com/.../before.jpg"
}
```

Правила:

* Только при `status = "in_progress"`.
* `"after"` только если `"before"` уже есть.
* Максимум по одному фото каждого типа.
* Если в EXIF есть координаты — они должны быть в радиусе ≤ 100 м от локации.
* При попытке загрузить второе фото того же типа → `409` с `{ "detail": "<type> photo already exists for this job." }`.

#### 2.7.3 DELETE `/api/jobs/<id>/photos/<photo_type>/`

`photo_type` = `before` | `after`.

Response `204 No Content` (empty body).

Правила:

* Только при `status = "in_progress"`.
* Нельзя удалить `before`, если есть `after`.
* При некорректном `photo_type` → `400` с `{ "detail": "Invalid photo_type. Use 'before' or 'after'." }`.

### 2.8 PDF report

**POST** `/api/jobs/<id>/report/pdf/`

Body — может быть пустым `{}`.

Response (целевой контракт, удобный для фронта):

```json
{
  "file_id": 55,
  "url": "https://cdn.example.com/.../job-10-report.pdf",
  "generated_at": "2026-01-15T11:00:00+04:00"
}
```

Фронт может:

* открыть `url` в новой вкладке,
* или показать кнопку “Download PDF”.

(Текущая реализация может сразу отдавать PDF-стрим; этот контракт фиксирует желаемый формат для API-ответа.)

---

## 3. Manager API

Все manager-эндпоинты требуют:
`Authorization: Token <MANAGER_TOKEN>`
и роль пользователя `role = "manager"`.

### 3.1 GET `/api/manager/jobs/today/`

Список job по компании менеджера.

Response `200 OK`:

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
    "has_after_photo": false,
    "all_checklist_completed": false
  }
]
```

Менеджерский фронт может строить дашборд по статусам на этом ответе.

### 3.2 GET `/api/manager/jobs/<id>/`

Детали job для менеджера (похоже на cleaner detail + немного больше инфы).

Response `200 OK`:

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
      "event_timestamp": "2026-01-15T09:05:12+04:00",
      "latitude": 25.08912,
      "longitude": 55.14567
    },
    {
      "event_type": "check_out",
      "event_timestamp": "2026-01-15T10:58:03+04:00",
      "latitude": 25.08913,
      "longitude": 55.14568
    }
  ],
  "photos": {
    "before": {
      "url": "https://cdn.example.com/.../before.jpg"
    },
    "after": {
      "url": "https://cdn.example.com/.../after.jpg"
    }
  },
  "checklist_items": [
    {
      "id": 101,
      "text": "Vacuum living room",
      "order_index": 0,
      "is_completed": true
    }
  ]
}
```

Менеджерский фронт может на этом строить:

* дашборд по `status`,
* detail view с фотками и чеклистом,
* кнопку “Generate PDF” (см. 2.8).

---

## 4. Ошибки (общий паттерн)

В случае ошибок API возвращает:

```json
{
  "detail": "Error message here"
}
```

Фронт:

* читает `detail`,
* показывает как toast / баннер.

---

## 5. Notes for Frontend

* Все даты/время в ответах — ISO 8601. Часть полей может быть с таймзоной (например, `+04:00`), часть — в локальном формате (`HH:MM:SS`).
* Backend может добавлять новые поля в ответы, но существующие поля и их смысл считаются стабильными.
* Любое ломающее изменение в структуре ответа должно сначала попасть в этот документ и только потом — в код.
