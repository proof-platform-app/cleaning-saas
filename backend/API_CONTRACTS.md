API Contracts (DEV) — Cleaning SaaS

Документ фиксирует контракт между Backend (Django / DRF) и Frontend (React / Vite / Mobile).
Считаем его источником правды для фронта.

Backend: Django REST Framework

Base URL (dev): http://127.0.0.1:8001

Во всех запросах после логина:
Authorization: Token <TOKEN>

DEV-пользователи

Cleaner: cleaner@test.com / Test1234!

Manager: manager@test.com / Test1234!

(Эти же данные зашиты в dev-конфиг фронтов.)

1. Auth
1.1. Логин (общий эндпоинт, используется cleaner)

POST /api/auth/login/

Request (JSON)

{
  "email": "cleaner@test.com",
  "password": "Test1234!"
}


Response 200 OK

{
  "token": "string",
  "user_id": 3,
  "email": "cleaner@test.com",
  "full_name": "Dev Cleaner",
  "role": "cleaner"
}


Правила / ошибки

Пустой email или password → 400

{ "detail": "Email and password are required." }


Неверная пара логин/пароль → 401

{ "detail": "User not found" }


или

{ "detail": "Invalid credentials" }


Все последующие запросы идут с заголовком:

Authorization: Token <token>

1.2. Логин менеджера

POST /api/manager/auth/login/

Request (JSON)

{
  "email": "manager@test.com",
  "password": "Test1234!"
}


Response 200 OK

{
  "token": "string",
  "user_id": 2,
  "email": "manager@test.com",
  "full_name": "Dev Manager",
  "role": "manager"
}


Правила / ошибки — те же, что и для /api/auth/login/.

2. Cleaner API

Все cleaner-эндпоинты требуют:

Authorization: Token <CLEANER_TOKEN>

role = "cleaner"

2.1. Today Jobs (список задач клинера на сегодня)

GET /api/jobs/today/

Список сегодняшних job для залогиненного клинера.

Response 200 OK (ПЛОСКИЙ контракт):

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


Фиксация:

location__name — строка, нет вложенного location.

НЕТ checklist, photos, cleaner, location.id, address и т.п.

Подробная инфа по job — только из GET /api/jobs/<id>/.

Фронт/мобилка могут опираться минимум на:

id — идентификатор, уходит в GET /api/jobs/<id>/.

location__name — заголовок карточки.

scheduled_date, scheduled_start_time, scheduled_end_time — дата/время.

status — "scheduled" | "in_progress" | "completed".

2.2. Job Detail (детали задачи для клинера)

GET /api/jobs/<id>/

Детальная информация по конкретной job.

Response 200 OK (концептуальная форма):

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


Гарантии / особенности:

actual_start_time, actual_end_time могут быть null — это нормально.

photos может быть пустым массивом.

check_events может быть пустым массивом.

check_events возвращаются отсортированными по created_at ASC — фронт порядок не меняет.

Фронту важно:

status — управляет доступностью кнопок (check-in/out, upload photo).

checklist_items — источник чек-листа.

photos — массив; фронт сам мапит в слоты before / after по photo_type.

check_events — можно строить таймлайн check-in/out.

2.3. Check-in

POST /api/jobs/<id>/check-in/

Request (JSON):

{
  "latitude": 25.08912,
  "longitude": 55.14567
}


Response 200 OK (пример):

{
  "status": "in_progress",
  "check_in": {
    "created_at": "2026-01-15T09:05:12+04:00",
    "latitude": 25.08912,
    "longitude": 55.14567
  }
}


Правила (backend):

Роль — только cleaner.

job принадлежит этому cleaner.

status до вызова — только "scheduled".

Расстояние до location ≤ 100 м.

Ошибки:

400 — далеко от точки / нет координат / другой бизнес-чек.

403 — чужая job / неверная роль.

409 — неверный статус (например, уже in_progress или completed).

Фронт: показывает detail как toast/alert, статус локально не меняет.

2.4. Check-out

POST /api/jobs/<id>/check-out/

Request (JSON):

{
  "latitude": 25.08913,
  "longitude": 55.14568
}


Response 200 OK (пример):

{
  "status": "completed",
  "check_out": {
    "created_at": "2026-01-15T10:58:03+04:00",
    "latitude": 25.08913,
    "longitude": 55.14568
  }
}


Правила (backend):

status до вызова — строго "in_progress".

Все required пункты чеклиста — is_completed = true.

Есть и before, и after фото.

Расстояние до location ≤ 100 м.

Ошибки аналогичны: 400 (бизнес-ошибка), 403, 409.

2.5. Checklist toggle (побитовая правка одного пункта)

POST /api/jobs/<job_id>/checklist/<item_id>/toggle/

Body:

{}


или

{
  "is_completed": true
}


Response 200 OK:

{
  "id": 101,
  "is_completed": true
}


Фронту достаточно по id обновить состояние чекбокса.

2.6. Checklist bulk (массовое обновление)

POST /api/jobs/<job_id>/checklist/bulk/

Request:

{
  "items": [
    { "id": 101, "is_completed": true },
    { "id": 102, "is_completed": true }
  ]
}


Response 200 OK:

{
  "updated_count": 2
}

2.7. Photos
2.7.1. Чтение фото job

На практике фронту достаточно того, что GET /api/jobs/<id>/ уже отдаёт массив photos (см. 2.2). Отдельный GET /api/jobs/<id>/photos/ не обязателен для работы UI.

Форма в ответе job detail:

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


Фронт:

фильтрует по photo_type → слоты before / after;

использует file_url для превью;

может показывать индикатор exif_missing.

2.7.2. Загрузка фото

POST /api/jobs/<id>/photos/
Content-Type: multipart/form-data

Поля формы:

photo_type: "before" или "after"

file: бинарник (image)

Response 201 Created (пример):

{
  "id": 12,
  "photo_type": "before",
  "file_url": "https://cdn.example.com/.../before.jpg",
  "latitude": 25.08912,
  "longitude": 55.14567,
  "photo_timestamp": "2026-01-15T09:06:00+04:00",
  "exif_missing": false
}


Правила:

Только при status = "in_progress".

"after" можно загрузить только если уже есть "before".

Максимум 1 before и 1 after на job.

Если в EXIF есть координаты:

они проверяются на расстояние ≤ 100 м от location.

Если EXIF нет:

загрузка разрешена,

в ответе может быть exif_missing = true.

Ошибки:

409 — попытка загрузить второе фото того же типа, или after без before.

400 — слишком далеко по EXIF.

403 — не тот cleaner / не та роль.

2.7.3. Удаление фото

DELETE /api/jobs/<id>/photos/<photo_type>/
где photo_type = "before" | "after"

Response 204 No Content

Правила:

Только при status = "in_progress".

Нельзя удалить before, если уже есть after.

Некорректный photo_type → 400:

{ "detail": "Invalid photo_type. Use 'before' or 'after'." }


(Удаление сейчас используется минимально, но контракт зафиксирован.)

2.8. PDF report (факт, как сейчас)

POST /api/jobs/<id>/report/pdf/

Body — пустой {} или вообще без тела.

Фактическое поведение:

Backend возвращает PDF-файл как бинарный ответ:

Content-Type: application/pdf

часто с Content-Disposition: attachment; filename="job-<id>-report.pdf"

Фронт:

Mobile — открывает / шарит PDF через нативные механизмы.

Web (Manager Portal) — через Blob создаёт ссылку и триггерит загрузку.

Важно:

Эндпоинт идемпотентный — можно вызывать многократно.

Сейчас нет JSON-обёртки (file_id, url, generated_at), это может появиться в будущем как отдельный слой, но не часть текущего контракта.

3. Manager API

Все manager-эндпоинты требуют:

Authorization: Token <MANAGER_TOKEN>

role = "manager"

3.1. Today Jobs (менеджер)

GET /api/manager/jobs/today/

Список job по компании менеджера.

Response 200 OK (концептуально):

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


Фронт (Manager Portal):

строит список задач с полями:

объект,

дата,

время,

клинер,

статус,

факт наличия фото.

3.2. Job Detail (менеджер)

GET /api/manager/jobs/<id>/

Детали job для менеджера (аналог cleaner detail + акценты под контроль).

Response 200 OK (концептуально):

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


Manager Portal на этом:

показывает:

статус,

расписание,

объект,

клинера,

чек-лист,

фото (before/after),

таймлайн.

даёт кнопки:

Generate PDF / Download PDF (через POST /api/jobs/<id>/report/pdf/).

4. Ошибки (общий паттерн)

Во всех эндпоинтах ошибки отдаются в едином формате:

{
  "detail": "Error message here"
}


Типичные коды:

400 Bad Request — бизнес-ошибка (GPS далеко, не все пункты чеклиста закрыты и т.п.).

401 Unauthorized — нет токена / токен неверен.

403 Forbidden — не та роль / чужая job.

404 Not Found — job не найдена / не принадлежит пользователю.

409 Conflict — неверный статус для операции (double check-in, double photo upload и т.п.).

Фронт:

читает detail,

показывает пользователю,

не пытается парсить текст на бизнес-логику.

5. Общие заметки для фронта

Все даты/время — ISO 8601 (2026-01-15, 2026-01-15T09:05:12+04:00)
Время без TZ (HH:MM:SS) интерпретируем как локальное для компании.

Backend может добавлять новые поля, но:

существующие поля и их смысл считаются стабильными,

ломающие изменения должны сперва попасть в этот документ.

Backend = истина:

фронт не меняет статусы сам,

не пересчитывает бизнес-правила,

всё делает через API.