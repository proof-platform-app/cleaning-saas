# API_CONTRACTS — Cleaning SaaS

Mobile Execution API — Freeze & Guards (Phase 11.1)

Контракты мобильного клиента для исполнения задач **зафиксированы**.
Check-in / Check-out, чек-лист (bulk и toggle), фото (before / after) и PDF-отчёт используют стабильные эндпоинты и payload’ы, описанные в этом документе.

В `mobile-cleaner/src/api/client.ts` все критичные вызовы (jobs, checklist, photos, pdf) помечены явными комментариями:

> **НЕ МЕНЯТЬ URL / FORMAT БЕЗ ПОЛНОГО E2E-РЕВЬЮ**

Любые изменения этих контрактов считаются **breaking**, требуют:

* отдельной ветки,
* обновления этого файла,
* ручного E2E-прогона (backend + mobile).

---

## Check-in / Check-out — GPS Contract

Мобильный клиент **всегда** отправляет payload вида:

```json
{
  "latitude": number,
  "longitude": number
}
```

### Поведение backend

* вычисляет расстояние между координатами устройства и локацией job,
* отклоняет check-in / check-out при превышении допустимого порога.

### Важно

* мобильный клиент **не выполняет** локальную проверку расстояния;
* вся валидация дистанции — **строго server-side**.

---

## Production GPS (mobile)

Мобильный клиент переведён на production-GPS.

* координаты берутся с устройства через `expo-location`;
* используется обёртка `getGpsPayload`, которая **всегда** возвращает `{ latitude, longitude }`;
* структура payload **не менялась**;
* эндпоинты:

  * `POST /api/jobs/<id>/check-in/`
  * `POST /api/jobs/<id>/check-out/`
    остаются без изменений;
* логика backend-валидации расстояния не затрагивалась.

### DEV-режим

При ошибке получения GPS возможен fallback на координаты job, чтобы не блокировать тестирование.
В PROD fallback **не используется**.

---

## Offline groundwork (mobile, v0)

В мобильном клиенте зафиксирована архитектурная модель оффлайна **без реализации**.

Разрешённые будущие операции:

* checklist bulk updates,
* photo uploads (с очередью).

Строго онлайн:

* check-in / check-out,
* генерация PDF,
* загрузка job-данных.

API-контракты и payload’ы **не изменены**.

---

# API Contracts (DEV)

Документ фиксирует контракт между Backend (Django / DRF) и:

* Manager Portal (React + Vite),
* Mobile Cleaner App (Expo + React Native).

Считается **единственным источником правды**.
Любые ломающие изменения сначала фиксируются здесь.

---

## 0. Общий контекст

### 0.1. Технологический стек

* Backend: Django + DRF (API-first)
* Frontends:

  * Manager Portal: React + Vite
  * Mobile Cleaner App: Expo + React Native

### 0.2. Base URL (DEV)

```
http://127.0.0.1:8001
```

### 0.3. Авторизация

```
Authorization: Token <TOKEN>
```

### 0.4. DEV-пользователи

```
Cleaner: cleaner@test.com / Test1234!
Manager: manager@test.com / Test1234!
```

---

## 1. Auth API

### 1.1. Cleaner login

`POST /api/auth/login/`

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

Ошибки:

* `400 Bad Request` — пустые поля
* `401 Unauthorized` — неверные креды

После логина **все** запросы идут с:

```
Authorization: Token <token>
```

---

### 1.2. Manager login

`POST /api/manager/auth/login/`

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

Ошибки аналогичны cleaner login.

---

## 2. Cleaner API

Требования:

* валидный токен
* роль `cleaner`

---

### 2.1. Today Jobs

`GET /api/jobs/today/`

**Назначение**
Список job клинера **на сегодня**.

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

Фиксации:

* `location__name` — строка, не объект
* вложенного `location` нет
* чеклист, фото, cleaner отсутствуют

Минимум для UI:

* `id`
* `location__name`
* `scheduled_date`
* `status`

---

### 2.1.1. Today Jobs — mobile behavior

Контракт **не расширяется**.

UI:

* заголовок строится **только** из `location__name`
* `Today` / формат даты — логика клиента
* никакие дополнительные поля не предполагаются

---

### 2.1.2. Today Jobs — 401 handling (mobile)

При отсутствии токена:

```json
{
  "detail": "Authentication credentials were not provided."
}
```

Mobile трактует как:

> Session expired → redirect to Login

---

### 2.2. Job Detail

`GET /api/jobs/<id>/`

**Назначение**
Полная информация по job для клинера.

**Response 200 OK**

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
  "check_events": [],
  "photos": [],
  "checklist_items": []
}
```

Гарантии:

* массивы могут быть пустыми
* порядок `check_events` — backend-controlled
* `actual_*` могут быть `null`

---

### 2.3. Check-in

`POST /api/jobs/<id>/check-in/`

```json
{
  "latitude": 25.08912,
  "longitude": 55.14567
}
```

**Response**

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

* только `scheduled`
* расстояние ≤ 100 м
* job принадлежит cleaner

Ошибки:

* `400` — бизнес-ошибка
* `403` — не тот пользователь
* `409` — неверный статус

---

### 2.4. Check-out

`POST /api/jobs/<id>/check-out/`

```json
{
  "latitude": 25.08913,
  "longitude": 55.14568
}
```

**Response**

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

Требования:

* статус `in_progress`
* все required checklist items завершены
* есть before + after фото
* расстояние ≤ 100 м

---

### 2.5. Checklist toggle

`POST /api/jobs/<job_id>/checklist/<item_id>/toggle/`

```json
{
  "is_completed": true
}
```

**Response**

```json
{
  "id": 101,
  "is_completed": true
}
```

---

### 2.6. Checklist bulk

`POST /api/jobs/<job_id>/checklist/bulk/`

```json
{
  "items": [
    { "id": 101, "is_completed": true },
    { "id": 102, "is_completed": true }
  ]
}
```

**Response**

```json
{
  "updated_count": 2
}
```

---

### 2.7. Photos

#### 2.7.1. Upload

`POST /api/jobs/<id>/photos/` (multipart)

Поля:

* `photo_type`: `before | after`
* `file`: image

**Response**

```json
{
  "id": 12,
  "photo_type": "before",
  "file_url": "https://cdn.example.com/.../before.jpg",
  "photo_timestamp": "2026-01-15T09:06:00+04:00",
  "exif_missing": false
}
```

Правила:

* только `in_progress`
* after только при наличии before
* максимум одно фото на тип
* EXIF координаты валидируются, отсутствие разрешено

---

### 2.8. PDF Report

`POST /api/jobs/<id>/report/pdf/`

Body: пустой

**Response**

```
Content-Type: application/pdf
```

PDF бинарный, идемпотентный.

---

## 3. Manager API

Все manager-эндпоинты требуют:

* валидный токен

  ```
  Authorization: Token <MANAGER_TOKEN>
  ```
* роль пользователя: `manager`

---

### 3.1. Today Jobs (manager)

`GET /api/manager/jobs/today/`

**Назначение**
Вернуть список job по компании менеджера за текущий день.

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

Используется Manager Portal для:

* обзора текущих работ,
* перехода в Job Detail,
* контроля факта выполнения.

---

## 4. Manager — Job Planning & Create Job (зафиксированный контракт)

### 4.1. Meta для Planning / Create Job

`GET /api/manager/meta/`

**Назначение**
Единый read-only endpoint для:

* Create Job Drawer,
* фильтров Planning.

**Response**

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
    { "id": 1, "name": "Standard Cleaning" }
  ]
}
```

---

### 4.2. Create Job

`POST /api/manager/jobs/`

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

**Backend поведение (ЗАФИКСИРОВАНО)**:

* создаётся job со статусом `scheduled`;
* если передан `checklist_template_id`, создаётся snapshot чеклиста;
* модели и миграции не меняются.

**Response 201 Created**

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

### 4.3. Planning list

`GET /api/manager/jobs/planning/?date=YYYY-MM-DD`

Поддерживаются форматы даты:

* `YYYY-MM-DD`
* `DD.MM.YYYY`

**Response**

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

Фиксация:

* endpoint read-only;
* `proof`-ключи **нельзя переименовывать** без слоя совместимости.

---

### 4.4. Manager Job Detail

`GET /api/manager/jobs/<id>/`

**Response (концептуально)**

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
  "check_events": [],
  "photos": [],
  "checklist_items": [],
  "notes": null
}
```

---

## 5. Ошибки (общий паттерн)

Формат:

```json
{
  "detail": "Error message"
}
```

Коды:

* `400` — бизнес-ошибка
* `401` — нет / неверный токен
* `403` — неверная роль / чужая job
* `404` — не найдено
* `409` — конфликт статусов

Frontend:

* читает `detail`;
* не парсит текст;
* не пересчитывает бизнес-логику.

---

## 6. Общие правила

* все даты — ISO 8601;
* backend может **добавлять** поля;
* существующие поля считаются стабильными;
* backend — источник истины.

---

## 7. Analytics Semantics (Manager)

* `check_in_time` — JobCheckEvent(type=check_in)
* `check_out_time` — JobCheckEvent(type=check_out)
* `job_duration` = check_out - check_in
* `checklist_passed` — все required выполнены
* `full_proof` = before + after + checklist

---

## 8. API Contract — Mobile Layer 1 (зафиксировано)

### 8.1. Job Details (mobile)

```json
{
  "id": 0,
  "status": "scheduled",
  "scheduled_date": "YYYY-MM-DD",
  "location": {
    "id": 0,
    "name": "string",
    "address": null,
    "latitude": null,
    "longitude": null
  },
  "cleaner": {
    "id": 0,
    "full_name": "string"
  }
}
```

Если координат нет:

* Navigate disabled
* без onPress

---

### 8.2. Photos (mobile)

* максимум 1 before и 1 after;
* after запрещён без before;
* отсутствие фото = `No photo yet`.

---

### 8.3. Checklist (mobile)

* read-only до `in_progress`;
* required пункты обязательны для check-out;
* backend — источник истины.

---

### 8.4. Timeline (mobile)

* read-only;
* порядок определяет backend;
* UI не переупорядочивает.

---

### 8.5. Guard rails

Backend:

* completed job immutable;
* порядок действий жёстко валидируется.

Mobile UI:

* Check-in только из `scheduled`;
* Check-out только из `in_progress`;
* completed — без действий.

---

### 8.6. Статус

Контрактов достаточно для закрытия **Mobile Layer 1**.
Новые API **не требуются**.

---

## ИТОГ

Любые изменения:

1. сначала правят `API_CONTRACTS.md`,
2. затем код,
3. затем E2E-проверка.

**Файл теперь собран целиком.**

Если хочешь, следующим шагом могу:

* проверить его на внутренние противоречия,
* или подготовить **diff-версию** относительно предыдущей редакции,
* или зафиксировать версию как `API_CONTRACTS_v1.0.md`.
