````md
# DEV_BRIEF.md — Cleaning SaaS

(Frontend / Mobile integration guide)

**Текущий статус (Phase 9)**

– Backend: auth, jobs, check-in / check-out, checklist, photos, PDF — готовы.  
– Mobile Cleaner App: login, Today Jobs, Job Details, check-in / check-out, загрузка before/after фото — работают на реальном API.  
– Чек-лист на мобильном пока **только read-only** (изменения будем вводить отдельной фазой).

---

## Phase 11.1 — Freeze & Guards (Mobile Cleaner)

Мобильный execution-core зафиксирован: экран **JobDetailsScreen** и `api/client.ts` помечены как критичные точки входа  
(Login → Today Jobs → Job Details → Check-in → Photos → Checklist → Check-out → PDF).

В коде добавлены защитные комментарии над хендлерами (`handleCheckIn`, `handleCheckOut`, `handleTakePhoto`, `handleSharePdf`, checklist-handler) и API-вызовами, фиксирующие правила:

* не менять порядок шагов;
* не трогать формат payload’ов;
* не менять URL без ревью backend + Manager Portal + PDF.

Разрешены только косметические правки UI.  
Изменения логики в этих файлах делаются только после явного решения и полного прогона флоу.

### GPS Handling (Mobile)

Вся работа с GPS проходит через `getGpsPayload` в `mobile-cleaner/src/utils/gps.ts`.

Режимы:

* **DEV:** подставляет координаты job, чтобы обойти distance-check’и;
* **PROD:** использует реальный GPS устройства через `expo-location`.

Запрещено:

* инлайнить GPS-логику в экранах;
* обходить backend-валидацию расстояния.

Любые GPS-изменения — только в `utils/gps.ts`.

---

## Phase 11.2 — Production GPS wrapper (mobile)

В `mobile-cleaner/src/utils/gps.ts` добавлен `getGpsPayload`, который:

1. Пытается получить координаты через `expo-location` (foreground permission).
2. При отказе/ошибке использует координаты job как fallback **в dev-окружении**.

`JobDetailsScreen` больше не отправляет жёстко захардкоженные координаты — вместо этого при check-in / check-out всегда вызывает `getGpsPayload`.

В `app.json`:

* прописаны пермишены для геолокации и камеры (iOS + Android),
* подключены плагины `expo-location` и `expo-image-picker`,
* проект привязан к EAS (`extra.eas.projectId`, `owner`), что позволяет собирать dev-билды через `eas build`.

---

## Phase 11.3 — Offline groundwork (architecture only)

Добавлены типы оффлайн-очереди (`src/offline/types.ts`) и защитные комментарии в `JobDetailsScreen`.  
Реальная реализация оффлайн-логики (storage, retries, outbox-processing) осознанно отложена.

Текущая версия приложения:

* полностью **online-first**;
* оффлайн-модель зафиксирована только на уровне типов и договорённостей.

---

## Landing Status (Frozen)

Текущая версия лендинга считается зафиксированной по структуре и смыслу. Допустимы только:

* правки текста (копирайт, тон, микроформулировки),
* визуальная полировка (анимации, отступы, тайминги),
* замена или обновление скриншотов.

Запрещено:

* менять последовательность блоков,
* добавлять новые смысловые сущности,
* обещать функциональность, не подтверждённую backend-логикой.

### Landing & Demo Status

Landing page и demo page считаются функционально завершёнными (v1 frozen). Дальнейшая работа ограничена:

* корректировкой текста,
* визуальной полировкой,
* навигационными подсказками (только ссылки),
* заменой скриншотов.

**Вне scope:**

* новые демо-интеракции,
* интерактивные симуляции продукта,
* дополнительные ветки навигации,
* любые изменения, подразумевающие новый backend-behavior.

Фокус разработки смещается обратно к стабилизации продукта (Phase 14).

### Landing & Demo Integration (Completed)

CleanProof landing и demo request страницы интегрированы в основное приложение как отдельный маркетинговый слой (`/cleanproof`, `/cleanproof/demo`):

* изолированы от product-layout;
* не используют auth;
* не ведут во внутренние роуты продукта.

Scope заморожен: дальше — только правки копирайта, визуала и точности контента.

---

## Location input & map behavior (Intentional design)

Форма Location **намеренно** не использует autocomplete и автогеокодинг.

* `Name` и `Address` — свободный текст **для людей**, не для логики.
* Карта — единственный источник истины по координатам.
* Менеджер **обязан** вручную поставить пин на карте, чтобы задать `latitude` и `longitude`.

Причины:

* координаты используются для навигации клинера и GPS check-in / check-out валидации;
* typed address даёт неоднозначность (особенно в UAE — башни, комплексы, несколько входов);
* такой дизайн заставляет осознанно выбирать точку и избегать ложной точности.

Будущий enhancement (вне текущего scope):

* address autocomplete / геокодинг через внешнего провайдера (не Google по умолчанию);
* опциональное действие “Find on map”;
* при этом ручное подтверждение точки на карте остаётся финальным шагом.

### Map-first location discipline

Продукт жёстко разделяет:

* человечески читаемый адрес,
* operational-геопозицию.

Инженеры должны считать текстовый адрес **ненадёжным**. Любая логика “где происходит задача” опирается **только на координаты**.  
Автоматический вывод координат из адреса без явного подтверждения через карту — нежелателен.

---

## Trial entry point (зафиксирован)

Старт trial происходит только через Pricing Page (`/cleanproof/pricing`).

* Кнопка **Start 7-day trial** ведёт на экран Login (`/`) с параметром `?trial=standard`.
* Если пользователь пришёл с `?trial=standard`, после login / signup backend:
  * создаёт Company,
  * запускает 7-дневный trial-план.

`/cleanproof/demo` — отдельный сценарий, не связанный с trial и оплатой.

---

## Marketing Layer Status (Frozen v1)

Маркетинговый слой CleanProof (Landing, Pricing, Product Updates, Contact, Demo Request):

* структурно завершён;
* визуально унифицирован (общий header, навигация).

Дальше **нельзя**:

* добавлять новые маркетинговые страницы,
* расширять меню,
* вводить новые CTA без реальной продуктовой/бекенд-опоры.

Фокус инженерии уходит в сторону:

* product stability,
* онбординга,
* логики trial/enforcement.

---

## DEV_BRIEF.md — Trial / Onboarding & Soft-limits UX

### Trial flow (фиксировано)

Trial-флоу реализован и стабилизирован.

Путь пользователя:

1. Pricing → кнопка **Start 7-day trial**  
2. Переход на Login с параметром `?trial=standard`  
3. Успешный login менеджера  
4. Backend активирует trial через `/api/cleanproof/trials/start/`  
5. Пользователь попадает в dashboard уже в trial-состоянии  

На текущем этапе:

* trial не ограничивает действия пользователя;
* не блокирует создание jobs / cleaners;
* не влияет на core business-логику;
* в UI — только информирующая индикация;
* кнопка Upgrade ведёт на `/cleanproof/pricing`, а не в платёжный флоу.

### Trial UX & Enforcement

Trial реализован как **UX-слой без жёсткого enforcement**:

* Backend определяет trial-статус и usage;
* технически backend **может** блокировать отдельные действия (например, создание новых job после истечения trial);
* по факту ограничения выражаются через UI: баннеры, тексты, CTA (Upgrade);
* агрессивные блокировки и жёсткие модалки сознательно не используются до включения полноценного биллинга.

### Trial expired UX (зафиксировано)

После окончания trial:

* пользователь не вылетает из продукта;
* не сталкивается с неожиданными блокировками;
* сохраняет доступ к данным и интерфейсу.

UX-принципы:

* `trial expired` ≠ ошибка;
* `trial expired` ≠ блокировка;
* никаких тревожных модалок и forced-редиректов;
* мягкая информационная индикация;
* Upgrade предлагается как опция, не как ультиматум.

### Soft-limits UX (Manager)

Soft-limits реализованы как **чистая UX-индикация**, без технических ограничений (кроме тех, что явно включит backend).

Текущие soft-limits:

* количество cleaners;
* количество jobs (per day).

Поведение:

* при приближении к лимиту — информирующий banner;
* при достижении лимита — UX не блокируется;
* пользователь может продолжать работу;
* предлагается Upgrade как опция.

Принцип:  
Soft-limits = объяснение ценности тарифа, а не жёсткий guard.

---

## Company settings UX

На странице Settings реализованы:

* загрузка логотипа компании (client-side preview),
* управление cleaners (list + add modal),
* отображение trial soft-limits по cleaners,
* отсутствие блокировок при превышении soft-limits.

Загрузка логотипа пока работает в preview-режиме и далее связывается с backend.

---

## Шаг 2. Обновляем DEV_BRIEF.md (одним блоком)

Чтобы не было разъезда между «как работает» и «как пользоваться», фиксируем короткий раздел про Settings.

### Settings (Company & Cleaners) — v1

Экран Settings состоит из трёх логических блоков:

1. **Company profile**
   - Использует `GET /api/manager/company/` для начальной загрузки.
   - Изменения сохраняются через `PATCH /api/manager/company/`.
   - Логотип загружается отдельным multipart-запросом `POST /api/manager/company/logo/`, ответ содержит только `logo_url`, который фронт сразу подставляет в превью.

2. **Team / Cleaners**
   - Список клинеров: `GET /api/manager/cleaners/`.
   - Добавление клинера: `POST /api/manager/cleaners/`.
   - Редактирование (имя, контакты, активность): `PATCH /api/manager/cleaners/<id>/`.
   - `is_active` используется вместо удаления; удаления клинеров из системы не предусмотрено.

3. **Trial soft-limits**
   - Показывают только usage-информацию (кол-во клинеров vs soft-limit).
   - Не блокируют создание и редактирование клинеров.
   - При подходе к лимиту и при достижении лимита показывается мягкий баннер с ссылкой на `/cleanproof/pricing`.

### Что уже реализовано / Manager dashboard

Для менеджерского кабинета реализован полный цикл работы с компанией и клинерами.

Backend:

* эндпоинты `/api/manager/company/` (GET/PATCH),
* `/api/manager/company/logo/` (POST),
* `/api/manager/cleaners/` (GET/POST/PATCH).

Frontend:

* в `dubai-control/src/api/client.ts` есть обёртки для этих методов;
* страница Settings загружает реальные данные компании, список клинеров и usage-summary;
* позволяет обновить профиль компании, добавить/отредактировать клинера;
* подготовлена к загрузке логотипа на сервер.

---

## Locations — единый источник истины

Локации переведены на единый backend-источник истины.  
Frontend больше не использует mock-данные или локальные списки.

Backend для Locations:

* модель, сериализация и CRUD API реализованы и стабильны;
* локации корректно привязаны к Company;
* все job-сущности ссылаются на локации через `location_id`.

Frontend:

* базовый UI (list / create / edit) реализован;
* `LocationsContext` синхронизирован с backend;
* новая локация после создания автоматически доступна:
  * в Job Planning,
  * при создании job,
  * в мобильном приложении (через связанные job’ы);
* новые локации появляются в Create Job и Job Planning без перезагрузки страницы.

Ограничения текущего этапа:

* карта — вспомогательный элемент;
* точность геокодинга и поиск адресов не критичны;
* улучшение карты отложено до появления платящих клиентов или явного фидбэка.

Цель: исключить расхождения данных между экранами и платформами.

---

## Trial & History — текущее состояние разработки

На текущем этапе реализовано:

* **self-serve signup** менеджера;
* автоматический запуск trial;
* backend-лимиты trial по jobs и cleaners (через usage-summary и guards);
* Job History (backend + UI);
* единый Locations flow (backend → UI → Create Job).

Ключевой принцип:

> Backend — единственный источник истины по trial-состояниям и usage.  
> Frontend не пересчитывает и не дублирует бизнес-логику.

---

## SLA / Exceptions — текущее состояние

В проект добавлен минимальный SLA-слой (**micro-SLA v1**), реализованный полностью на backend.

* SLA вычисляется как derived-статус (`ok` / `violated`) для завершённых jobs.
* Источник — фактические proof-флаги: check-in/out, наличие before/after-фото, чеклист.
* Backend возвращает:
  * `sla_status`;
  * `sla_reasons[]` — machine-readable коды причин (`missing_before_photo`, `missing_after_photo`, `checklist_not_completed` и т.д.).

На frontend SLA используется для:

* визуальной пометки проблемных jobs в Planning и History;
* фильтра “Only problem jobs” в History;
* read-only блока SLA в Job Details (причины как якоря к соответствующим блокам: фото, чеклист и т.п.).

Архитектурно:

* SLA не требует миграций и новых моделей;
* не влияет на execution-логику job;
* готов к расширению (time-based rules, repeated violations, analytics).

---
### Reports & Sidebar UX (v1)

Reports page is implemented as a read-only aggregation layer over existing job and SLA data.
No new business logic introduced — backend remains the single source of truth.

Frontend updates:
- Added collapsible sidebar (expanded / icon-only mode)
- Sidebar state persisted via localStorage
- Main layout supports full-width content when sidebar is collapsed
- Reports page includes owner overview and manager-level summaries

Known limitations:
- Layout width is controlled per-page (some pages still use max-width containers)
- PDF and email actions are stubbed (UI only)

Current state is considered stable and suitable for demo and early customers.

---

## Performance Layer (SLA Aggregation)

Поверх SLA добавлен минимальный performance-слой для управленческого анализа.

Backend:

* агрегирует SLA-нарушения по клинерам и локациям;
* учитывает только `completed` jobs за выбранный период;
* считает:
  * `jobs_total`,
  * `jobs_with_sla_violations`,
  * `violation_rate` (violations / jobs_total),
  * `has_repeated_violations` (≥2 violations с одинаковым reason-code за период).

Frontend:

* получает готовые агрегаты;
* не делает собственных вычислений и агрегаций.

Performance Layer — расширение SLA и Job History:

* без миграций;
* без новых бизнес-сущностей;
* не меняет execution-логику.

---

## SLA Reports (Implementation Notes)

Weekly и monthly SLA-отчёты — тонкий аггрегационный слой поверх существующей SLA/Performance-логики.

Принципы:

* SLA-логика не дублируется; отчёты используют общие helpers.
* Backend — единственный источник истины для:
  * диапазонов дат,
  * фильтрации только `completed` jobs,
  * статуса SLA и reason-кодов.
* UI и PDF потребляют **один и тот же aggregated dataset**.

PDF:

* генерируется через ReportLab;
* использует тот же data structure, что и JSON-отчёты;
* загрузка логотипа компании реализована в Company settings, но рендер логотипа в PDF пока сознательно отложен.

Отчёты:

* read-only;
* предназначены для внешнего шеринга (owners, stakeholders);
* не используются как операционный workflow.

---
Reports → Evidence drill-down is implemented as a separate read-only layer.

A dedicated endpoint allows managers to navigate from aggregated SLA metrics (weekly / monthly reports) to the exact jobs that caused a specific SLA violation.  
The frontend exposes this via a conditional screen (`/reports/violations`) that is accessed only through contextual navigation (reason + period), not via the main menu.

Important: the mobile cleaner app currently enforces mandatory photos and checklist completion before job checkout.  
As a result, some SLA reasons (e.g. `missing_*`) are rare or absent in normal flows and are treated as domain-level safeguards for future policy changes rather than active error states.

---
## Назначение документа

Этот документ — единая инструкция для:

* frontend (web),
* mobile cleaner app,
* любого разработчика, подключающегося к API.

Документ отвечает на вопросы:

* как аутентифицироваться;
* какие эндпоинты использовать;
* какие статусы и ошибки ожидать;
* что является истиной поведения системы.

**Backend — единственный источник истины.**

---

## 1. Base URL

### Local

`http://127.0.0.1:8001`

---

## 2. DEV-аккаунты (ОБЯЗАТЕЛЬНО)

### Cleaner

email: `cleaner@test.com`  
password: `Test1234!`  
role: `cleaner`

### Manager

email: `manager@test.com`  
password: `Test1234!`  
role: `manager`

---

## 3. Auth

### Login (Cleaner / Manager)

`POST /api/auth/login/`

**Payload**

```json
{
  "email": "cleaner@test.com",
  "password": "Test1234!"
}
````

**Response**

```json
{
  "token": "abc123...",
  "user_id": 3,
  "email": "cleaner@test.com",
  "full_name": "Alex Cleaner",
  "role": "cleaner"
}
```

**Использование токена**

Во всех запросах:

```http
Authorization: Token <token>
```

---

## 4. Jobs — Cleaner Flow

### Today Jobs (Cleaner)

`GET /api/jobs/today/`

Возвращает:

* только jobs текущего cleaner;
* только актуальные на сегодня.

### 4a. Контракт ответа `/api/jobs/today/` (CRITICAL)

⚠️ Контракт **ПЛОСКИЙ**.

Ответ **НЕ** содержит вложенных объектов.

Пример:

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

Frontend / Mobile:

* не ожидать `location` object;
* не ожидать `cleaner` object;
* использовать поля ровно как есть.

Контракт зафиксирован и не будет меняться.

Почему важно: незнание этого контракта ломает UI.

### Job Detail (Cleaner)

`GET /api/jobs/<id>/`

Содержит:

* location;
* cleaner;
* scheduled / actual time;
* `checklist_items`;
* `photos`;
* `check_events`.

### 4b. Job Detail — гарантии и NULL-поля

Могут быть `null`:

* `actual_start_time`,
* `actual_end_time`,
* `photos` (могут быть пустыми),
* `check_events` (если действий ещё не было).

Frontend обязан:

* корректно рендерить пустые состояния;
* не считать отсутствие данных ошибкой.

---

## 5. Job Statuses

Возможные статусы:

* `scheduled`
* `in_progress`
* `completed`

Жёсткие переходы:

```text
scheduled → in_progress → completed
```

Других переходов не существует.

---

## 6. Check-in / Check-out (CRITICAL)

### Check-in

`POST /api/jobs/<id>/check-in/`

**Payload**

```json
{
  "latitude": 25.0763,
  "longitude": 55.1345
}
```

Условия:

* только роль `cleaner`;
* job принадлежит этому cleaner;
* `job.status == "scheduled"`;
* расстояние до location ≤ 100 м.

Результат:

* `job.status → in_progress`;
* создаётся `JobCheckEvent (check_in)`.

### Check-out

`POST /api/jobs/<id>/check-out/`

**Payload** аналогичен check-in.

Условия:

* `job.status == "in_progress"`;
* все required checklist items == `completed`.

Результат:

* `job.status → completed`;
* создаётся `JobCheckEvent (check_out)`.

### 6a. Edge case: GPS недоступен

Если координаты не получены:

* API вернёт `400 Bad Request`.

Frontend / Mobile:

* показывает ошибку пользователю;
* предлагает повторить попытку;
* не делает автоповторов без ведома пользователя.

---

## 7. Checklist

Checklist — snapshot, привязанный к job.

`JobChecklistItem`:

* `text`
* `is_completed`
* `is_required`

Правила:

* checklist создаётся при создании job;
* редактировать может только cleaner;
* manager только читает;
* required-пункты проверяются при check-out.

---

## 8. Photos (Before / After)

### Upload

`POST /api/jobs/<id>/photos/`

Form-data:

* `file=<image>`
* `type=before | after`

Правила:

* максимум 1 `before` + 1 `after`;
* `after` нельзя без `before`;
* удаление ограничено бизнес-правилами;
* загружает только cleaner;
* только при `status = in_progress`.

EXIF:

* если есть — координаты сверяются с location;
* если нет — upload разрешён, `exif_missing = true`.

### 8a. Response при загрузке фото

```json
{
  "id": 12,
  "photo_type": "before",
  "latitude": 25.0763,
  "longitude": 55.1345,
  "photo_timestamp": "2026-01-17T08:32:11+04:00",
  "exif_missing": false
}
```

Frontend / Mobile:

* использует `file_url` (если есть) для превью;
* использует `exif_missing` для UI-индикатора;
* не считает отсутствие EXIF ошибкой.

---

## 9. JobCheckEvent (Audit Trail)

Каждое ключевое действие создаёт событие.

Типы:

* `check_in`
* `check_out`
* `photo_before`
* `photo_after`

Поля:

* `event_type`
* `created_at`
* `latitude`
* `longitude`

Используется для:

* Job Timeline;
* проверки локации (audit/verification).

### 9a. Job Timeline — порядок событий

События возвращаются:

* отсортированными по `created_at ASC`.

Frontend:

* строит timeline строго в порядке ответа;
* не сортирует самостоятельно.

---

## 10. Manager Endpoints (общее)

Today Jobs (Manager):

* `GET /api/manager/jobs/today/`

Job Detail (Manager):

* `GET /api/manager/jobs/<id>/`

Используются в Manager Portal.

Отдельно для trial, usage, company, cleaners и locations см. верхнюю часть DEV_BRIEF и API_CONTRACT.md.

---

## 11. PDF Report

`POST /api/jobs/<id>/report/pdf/`

Результат:

* валидный PDF, содержащий:

  * job,
  * location,
  * cleaner,
  * timestamps,
  * checklist,
  * audit events.

### 11a. PDF — идемпотентность

PDF generation идемпотентен.

Каждый `POST`:

* создаёт новый PDF;
* предыдущие отчёты не удаляются.

Frontend:

* не предполагает “один PDF на job”;
* просто даёт пользователю скачать/шарить результат.

---

## 12. Типовые ошибки API (ВАЖНО)

Коды:

* `401 Unauthorized` — нет токена / токен неверен;
* `403 Forbidden` — неправильная роль / job не принадлежит пользователю;
* `409 Conflict` — неверный статус / нарушение порядка действий;
* `400 Bad Request` — координаты далеко / не закрыты required-пункты чеклиста и т.п.

### 12a. Формат ошибки API (гарантирован)

```json
{
  "detail": "Human-readable error message"
}
```

Frontend:

* показывает `detail` пользователю;
* не парсит текст на бизнес-логику.

---

## 13. Принципы (НЕ НАРУШАТЬ)

Backend = истина.

Frontend **не**:

* вычисляет бизнес-логику;
* меняет статусы сам.

Все изменения → только через API.
Ошибки API не скрывать.

---

## 14. Offline & Retry (Mobile only)

Mobile app:

* не предполагает стабильный интернет;
* check-in / photo / checklist / check-out могут происходить офлайн.

Правила:

* API ничего не знает об оффлайн-режиме;
* Mobile хранит pending actions локально;
* ретраи отправляются строго в исходном порядке;
* Backend защищает от дублей на своей стороне.

Статус:

* Backend — **LOCKED**;
* API-контракты — зафиксированы;
* Manager Portal — интегрирован;
* Mobile Cleaner App — можно разрабатывать без предположений “как бы оно работало”.

---

## Mobile — Job Details (Cleaner)

Этот раздел фиксирует контракт между Mobile Job Details экраном и API.
Цель: по этому тексту можно полностью реализовать экран без догадок.

### 15.1. Навигация из Today Jobs

Источник: `GET /api/jobs/today/`.

Каждая карточка в списке Today Jobs использует:

* `id` → скрытый идентификатор job;
* `location__name` → заголовок карточки (название объекта);
* `scheduled_date` → строка `Date: <date>`;
* `status` → строка `Status: <status>`.

При тапе по карточке:

* навигация на экран `JobDetailsScreen(jobId = id)`.

⚠️ Контракт `/api/jobs/today/` ПЛОСКИЙ:

* нет вложенного `location`;
* нет вложенного `cleaner`;
* фронт не должен пытаться их там искать.

### 15.2. Загрузка данных Job Details

При открытии `JobDetailsScreen`:

```http
GET /api/jobs/<id>/
Authorization: Token <token>
```

Ответ (концептуально):

Основные поля:

* `id`
* `status` — `scheduled` / `in_progress` / `completed`
* `scheduled_date`
* `scheduled_start_time`
* `scheduled_end_time`
* `actual_start_time` (может быть `null`)
* `actual_end_time` (может быть `null`)

`location`:

* `name`
* `address`
* `latitude`
* `longitude`

`cleaner`:

* `id`
* `full_name`

`checklist_items` (массив):

* `id`
* `text`
* `is_completed`
* `is_required`

`photos` (0–2 элемента):

* `photo_type` — `"before"` | `"after"`
* `file_url`
* `latitude` / `longitude` (могут быть `null`)
* `photo_timestamp` (может быть `null`)
* `exif_missing` (bool, если есть)

`check_events`:

* `event_type` — `"check_in"` | `"check_out"`
* `event_timestamp`
* `latitude`
* `longitude`

Гарантии:

* `actual_start_time`, `actual_end_time`, `photos`, `check_events` могут отсутствовать / быть `null` — это не считается ошибкой;
* `check_events` отсортированы по `created_at` по возрастанию;
* фронтенд порядок событий не меняет.

### 15.3. Header / Basic Info ↔ API

На основе `GET /api/jobs/<id>/`:

* заголовок экрана: `location.name`;
* подзаголовок: `scheduled_date`;
* статус (badge / текст): `status`.

Блок адреса:

* label: `Address`;
* значение: `location.address`.

### 15.4. Статус и действия (Check-in / Check-out)

Повтор статусов:

* `scheduled → in_progress → completed`.

#### 15.4.1. Состояние `scheduled`

UI:

* статус: `Status: scheduled`;
* кнопка **Check-in** — активна;
* Upload Photo / Check-out:

  * либо скрыты,
  * либо disabled (backend всё равно всё проверит).

API:

```http
POST /api/jobs/<id>/check-in/
Authorization: Token <token>
Content-Type: application/json
```

```json
{
  "latitude": <device_lat>,
  "longitude": <device_lng>
}
```

Backend проверяет:

* роль `cleaner`;
* принадлежность job;
* `job.status == "scheduled"`;
* расстояние ≤ 100 м.

Если GPS недоступен:

* фронт не вызывает API;
* показывает `"Can't get location, please try again"`.

Ответ (успех):

* `job.status → in_progress`;
* в `check_events` появляется `check_in`.

UI:

* обновляет состояние из ответа;
* перерисовывает как `in_progress`.

Ошибки:

* `400` — координаты далеко;
* `401 / 403` — токен / роль;
* `409` — job уже не `scheduled`.

Фронт:

* показывает `detail`;
* статус локально не меняет.

#### 15.4.2. Состояние `in_progress`

UI:

* статус: `Status: in_progress`.

Check-in блок:

* `Checked in at <time>` — берём либо из `actual_start_time`, либо из первого `check_in`-события.

Кнопки:

* **Upload Before Photo** — активна, если ещё нет `photo_type="before"`;
* **Upload After Photo** — активна, если `before` уже есть, а `after` ещё нет;
* **Check-out** — активна при `status="in_progress"` (backend всё равно валидирует условия).

#### 15.4.3. Состояние `completed`

UI:

* статус: `Status: completed`.

Check-in / Check-out блок:

* `Checked in at <time>` — как выше;
* `Checked out at <time>` — из `actual_end_time` или события `check_out`.

Кнопки:

* Check-in / Upload / Check-out — скрыты или disabled.

Job в `completed` не меняется через мобильный.

### 15.5. Photos Block ↔ API

Два слота:

* Before photo;
* After photo.

#### 15.5.1. Чтение

Из `photos`:

* `photo_type="before"` → слот Before;
* `photo_type="after"` → слот After.

Каждый слот:

* превью: `file_url`;
* подпись (опционально): время из `photo_timestamp`;
* индикатор EXIF при `exif_missing == true`.

#### 15.5.2. Загрузка

Before:

```http
POST /api/jobs/<id>/photos/
Authorization: Token <token>
Content-Type: multipart/form-data
file=<image binary>
type=before
```

After:

```http
POST /api/jobs/<id>/photos/
Authorization: Token <token>
Content-Type: multipart/form-data
file=<image binary>
type=after
```

Ответ:

```json
{
  "id": 12,
  "photo_type": "before",
  "file_url": "https://...",
  "latitude": 25.0763,
  "longitude": 55.1345,
  "photo_timestamp": "2026-01-17T08:32:11+04:00",
  "exif_missing": false
}
```

UI:

* обновляет соответствующий слот;
* использует `file_url` для превью.

Backend-ограничения:

* максимум 1 `before` и 1 `after`;
* `after` запрещён без `before`;
* загрузка только при `status="in_progress"`.

Ошибки:

* `409` — двойное фото или `after` без `before`;
* `400` — слишком далеко по EXIF.

Фронт показывает `detail` пользователю.

---

### 15.6. Checklist Block ↔ API

Источник: `checklist_items` из `GET /api/jobs/<id>/`.

Каждый пункт:

* текст → `text`;
* чекбокс → `is_completed`;
* required → `is_required` (визуальная пометка).

Изменение чеклиста:

* tap по чекбоксу меняет локальное состояние;
* фронтенд отправляет изменения bulk-эндпоинтом чеклиста;
* backend валидирует роль/статус (`cleaner`, `status="in_progress"`).

При ошибке (например, job уже `completed`):

* показываем `detail`;
* откатываем локальное изменение.

---

## Checklist Templates — final architecture

Чек-листы реализованы как ChecklistTemplate + ChecklistTemplateItem с привязкой к компании.
Логика инициализации дефолтных чек-листов вынесена в хелпер create_default_checklist_templates_for_company(company) и вызывается лениво при первом запросе GET /api/manager/meta/, если у компании отсутствуют валидные шаблоны с пунктами.

Важно:

проверка выполняется по наличию items, а не по названию шаблона;
исключены дубликаты шаблонов и пунктов;
фронтенд не занимается созданием или проверкой чек-листов — он всегда получает готовый список;
архитектура безопасна для повторных вызовов и не ломается при повторном логине или перезагрузке.

## Checklist templates и SLA

Checklist templates являются источником истины для формирования чек-листа конкретного job.
При создании job с checklist_template_id backend создаёт набор JobChecklistItem, соответствующий пунктам выбранного шаблона.

Невыполнение обязательных пунктов чек-листа используется как основание для SLA-нарушения с причиной:
checklist_not_completed

Таким образом, checklist templates напрямую участвуют в SLA-логике и аналитике качества выполнения работ.

Checklist flow (manager → job → SLA)

Реализована сквозная логика чеклистов: менеджер выбирает checklist_template при создании job, после чего backend создаёт набор JobChecklistItem, привязанных к job. Чеклист существует как обязательная часть proof-флоу, наряду с before/after фото.

Во фронтенде (JobSidePanel) менеджер видит:
название применённого checklist template;
превью пунктов чеклиста с возможностью раскрыть полный список;
статус чеклиста, зависящий от состояния job (Pending для незавершённых, Complete / Not completed для завершённых).

SLA-причина checklist_not_completed возникает только для completed jobs, у которых обязательные пункты чеклиста не выполнены.
---

### Job force-complete (manager override) — backend behavior

**Цель:** дать менеджеру controlled-способ принудительно завершить Job и при этом не ломать SLA-логику.

Техническая реализация:

1. **Endpoint**

   - Новый view `force_complete_job(request, job_id)` в `apps/api/views.py`.
   - URL: `POST /api/manager/jobs/<int:job_id>/force-complete/`.
   - Permissions:
     - `IsAuthenticated`
     - `IsManager` (наш существующий пермишн для менеджера компании)
     - компания не `suspended` (проверка через тот же helper, что и для create-job).

2. **Валидация**

   - Находим job компании менеджера.
   - Разрешены только статусы `scheduled` и `in_progress`.
   - Из тела запроса читаем:
     - `reason_code` (обязательный, строка)
     - `comment` (обязательный, строка, не пустой).
   - Проверяем, что `reason_code` входит в белый список SLA-кодов (`missing_before_photo`, `missing_after_photo`, `checklist_not_completed` и т.п.).

3. **Изменения в Job**

   - `job.status = "completed"`.
   - Если нет `actual_end_time` — проставляем текущий `timezone.now()`.
   - `job.sla_status = "violated"`.
   - В `job.sla_reasons`:
     - если список пустой — записываем `[reason_code]`;
     - если нет — добавляем `reason_code`, не создавая дублей.
   - Сохраняем job.

4. **Audit trail**

   - Создаём `JobCheckEvent`:
     - `job = job`
     - `event_type = "force_complete"`
     - `user = request.user`
     - `comment = <comment>`
     - `payload = { "reason_code": ..., "previous_status": ..., "previous_sla_status": ... }`.

   Это позволяет в будущем выводить override в таймлайне и PDF.

5. **Ответ**

   - Возвращаем сериализованный `ManagerJobDetail` (тот же serializer, что и в `GET /api/manager/jobs/<id>/`), чтобы фронт сразу получил обновлённый статус, SLA и флаги override.


## SLA model and violation visibility

CleanProof enforces SLA correctness by design at the execution layer (mobile cleaner app).

A cleaner cannot complete a job unless:
check-in and check-out are performed,
before and after photos are uploaded,
checklist is fully completed.

Because of this, SLA violations are exceptional events, not normal workflow outcomes.
The Job Timeline UI includes a “show only violations” mode, intended for:
audit,
owner review,
enterprise compliance checks.

An empty violations view is a successful SLA result, not an error state.
This must be preserved and clearly communicated in UI/UX.

### 2. DEV_BRIEF.md

**Куда вставить**  
Ближе к блоку про jobs/planning и чеклисты (там, где уже упоминается SLA-причина `checklist_not_completed`).

**Текст блока:**

### Checklist templates — инициализация и использование

Для новых компаний базовые чеклисты создаются лениво при первом запросе менеджера к `GET /api/manager/meta/`.  
Хелпер `create_default_checklist_templates_for_company(company)`:

* проверяет, есть ли у компании хотя бы один `ChecklistTemplate` с пунктами (`items__isnull=False`);
* если нет — создаёт 4 дефолтных шаблона:
  * `Apartment – Standard (6 items)`
  * `Apartment – Deep (12 items)`
  * `Office – Standard (8 items)`
  * `Villa – Full (12 items)`
* для каждого шаблона создаёт `ChecklistTemplateItem` с корректным `order` и `is_required=True`.

Эндпоинт `GET /api/manager/meta/` возвращает эти шаблоны в поле `checklist_templates` с дополнительными полями:

* `description` — краткое текстовое описание;
* `items_preview` — первые 3–4 пункта чеклиста (для превью в интерфейсе);
* `items_count` — общее количество пунктов.

Фронтенд (панель планирования `CreateJobDrawer`) использует `checklist_templates` как:

* источник для выпадающего списка чеклистов при создании `Job`;
* основу для UX вокруг SLA-причины `checklist_not_completed` — менеджер явно видит, какой чеклист был выбран и сколько пунктов в нём должно быть закрыто.

## Job PDF: SLA & Proof integration

В рамках текущего этапа Job PDF был синхронизирован с доменной SLA-логикой.
Генерация Job PDF (generate_job_report_pdf) использует существующие функции вычисления SLA (compute_sla_status_for_job, compute_sla_reasons_for_job) без дублирования бизнес-правил.
Mobile-приложение жёстко enforce’ит выполнение чеклиста и обязательных фото до check-out, поэтому SLA-нарушения не являются частью стандартного execution-флоу и рассматриваются как audit-level сценарии.
PDF отражает фактическое состояние job и предназначен для внешнего доказательства выполнения работ.

## Job PDF email delivery

Отправка Job PDF по email реализована как бизнес-функция, а не техническое уведомление.
Email формируется на backend и предназначен для прямой пересылки клиентам и owner’ам без дополнительного контекста системы.
Каждая попытка отправки PDF логируется с указанием job, компании, пользователя-инициатора, целевого email и результата (success / failed).
Поведение при ошибках (PDF generation, email delivery) явно обрабатывается и отражается в логах.

## PDF reports и email-логирование (Job scope)

В рамках Job Details реализован полный PDF pipeline:

backend-генерация PDF (apps/api/pdf.py) без внешних сервисов
включены: job summary, photos before/after, checklist items, audit events;
PDF доступен для скачивания и отправки по email;
каждая email-отправка логируется в базе (ReportEmailLog).

Важно:
PDF Email History не вычисляется, а читается из persisted-логов. Это осознанное архитектурное решение для SLA-доказательств.

Frontend (JobDetails.tsx) использует отдельный API-запрос для получения истории email-отправок и отображает её как самостоятельный блок.

### 15.7. Check-out Block ↔ API

Кнопка Check-out видна при `status == "in_progress"`.

Запрос:

```http
POST /api/jobs/<id>/check-out/
Authorization: Token <token>
Content-Type: application/json
```

```json
{
  "latitude": <device_lat>,
  "longitude": <device_lng>
}
```

Backend проверяет:

* принадлежность job;
* `status == "in_progress"`;
* все required checklist-items → `is_completed = true`;
* есть `before` и `after` фото;
* расстояние ≤ 100 м.

Ответ (успех):

* `status → completed`;
* `check_events` дополняется `check_out`;
* `actual_end_time` обновляется.

UI:

* обновляет состояние из ответа;
* перерисовывает экран как `completed`;
* может показать `"Job Completed"`.

Ошибки:

* `400` — далеко от точки / не все required пункты закрыты;
* `409` — неверный статус для операции.

Фронт показывает `detail` и не меняет статус локально.

---
## Cleaner login flow (Manager-controlled PIN)

В MVP используется упрощённая схема логина клинеров: телефон + 4-значный PIN без email-верификации и SMS. Менеджер полностью контролирует доступ клинера: создаёт пользователя, передаёт логин-данные вручную и при необходимости сбрасывает PIN. PIN не хранится и не отображается в интерфейсе постоянно, а показывается только в момент создания или сброса. Это снижает нагрузку на поддержку и исключает сценарии восстановления доступа со стороны клинера.

## Email history — frontend integration & filtering

Полностью завершена интеграция экрана Reports → Email history. Фронт и бэк приведены к одному контракту: фильтры, календарь диапазона дат и пагинация работают через GET /api/manager/report-emails/. Выбор диапазона дат в UI фильтрует логи по фактической дате отправки письма (created_at), а не по периоду отчёта. Реализованы состояния загрузки, пустого списка (empty state) и корректного сброса фильтров. Таблица корректно отображает все типы отчётов (job / weekly / monthly) в одном списке без дополнительной агрегации на фронте.

### 15.8. Timeline (опционально)

Если нужен визуальный timeline:

* берём `check_events` в том виде, как их вернул backend;
* строим список:

  * `check_in` → `Checked in at <time>`;
  * `check_out` → `Checked out at <time>`.

Это чистый UI — на API-контракт не влияет.

---

## Email PDF / Reports Email

### Email PDF — future improvements (post-MVP)

Current behavior (v1):

* “Email PDF” sends the job report to the **manager’s own email**
* Email address is taken from the authenticated user (`request.user.email`)
* No email selection UI
* No history of sent emails
* Purely operational workflow (manager → self)

This behavior is **intentional** and correct for MVP.

---

Reports email functionality (v1) sends the report to the manager’s account email automatically.
This keeps the flow simple and aligned with authenticated access.

Future improvements (v2+):

* Allow entering a custom recipient email before sending
* Provide a dropdown with saved / previously used emails
* Support sending reports directly to clients
* Store report email history (timestamp, recipient, report period)
* Allow sharing via downloadable link with access control

---

Planned improvements (v2+):

1. **Email selection UI**

   * Clicking “Email PDF” opens a lightweight inline input or modal
   * Manager can:

     * confirm their own email (default)
     * enter a custom email address
     * optionally select from previously used emails

2. **Client delivery**

   * Ability to send PDF directly to a client’s email
   * Client email may be:

     * stored on Location
     * stored on Job
     * entered manually at send time

3. **Multiple recipients**

   * Support for multiple emails (To / CC)
   * Clear UI indication of recipients

4. **Email delivery history**

   * Store each email send event:

     * job_id
     * recipient email(s)
     * sent_at
     * sent_by (manager)
   * Display delivery history in Job Details

5. **Delivery confirmation**

   * Explicit UI feedback:

     * “Sent to: [client@example.com](mailto:client@example.com)”
     * timestamp of last delivery

All of the above is **explicitly out of scope for MVP**
and must not affect the current simple, predictable behavior.

---

### Email PDF — intentional MVP scope

Current behavior (v1):

* “Email PDF” sends the job report to the manager’s own email.
* Recipient email is derived from the authenticated user (`request.user.email`).
* No email selection UI.
* No client delivery.
* No email send history.

This behavior is intentional and correct for MVP.

Planned improvements (v2+):

* Inline email input or modal when clicking “Email PDF”.
* Ability to confirm manager email or enter a custom recipient.
* Support for client email delivery.
* Multiple recipients (To / CC).
* Persistent email send history per job (recipient, timestamp, sender).

All of the above is explicitly out of scope for MVP
and must not affect the current predictable behavior.

---

### Reports Email v1 (Current state)

В системе реализована реальная отправка PDF-отчётов по email:

* Job PDF reports
* Weekly / Monthly performance reports

Email-отправка:

* инициируется менеджером из UI,
* выполняется backend’ом,
* использует единый генератор PDF (single source of truth).

По умолчанию отчёт отправляется на email текущего пользователя (`request.user.email`),
с возможностью передачи альтернативного email в запросе.

### Reports Email & Audit Logging

All outgoing report emails (job PDF, weekly reports, monthly reports) are handled exclusively on the backend and logged for audit purposes.

Key points:

* Email recipient can be selected by the manager (self or custom email).
* Backend always accepts an optional `email` field; frontend never assumes delivery.
* Every email send attempt creates a `ReportEmailLog` record:

  * company
  * initiating user
  * report type (job / weekly / monthly)
  * target email
  * period (for weekly/monthly)
  * status (sent / failed)
  * error message (if any)

Important:

* Email delivery depends entirely on Django `EMAIL_BACKEND`.
* In dev, console backend may be used; real delivery requires SMTP configuration.
* UI success indicates backend execution, not guaranteed external delivery.

---
## Reports follow a role-based responsibility model.

Managers are responsible for generating and distributing SLA reports (PDF / email).  
Owners are consumers of these reports and are not expected to generate documents directly from the UI.

The "Owner overview" section in the Reports page is an in-app dashboard representation of owner-level SLA aggregates and mirrors the data already present in the PDF report. It is not a separate reporting artifact.

---

### Commercial enforcement (read-only mode)

Commercial restrictions are enforced exclusively on the backend.

* Company suspension is controlled via `Company.is_active` and related fields.
* When a company is suspended:

  * backend permissions block all mutating actions
  * API returns `403 Forbidden` with `code = company_blocked`
* Trial expiration is handled similarly via `code = trial_expired`.

Frontend guidelines:

* Never infer commercial state from UI or local flags.
* Always rely on backend error codes (`company_blocked`, `trial_expired`).
* UX must treat these states as **read-only mode**, not system errors:

  * data remains visible
  * creation actions are disabled with explanatory messaging

This approach ensures consistent enforcement and avoids frontend-driven business logic.


## Job force-complete (manager override)

Force-complete is a manager-only mechanism for handling real-world exceptions
where a job cannot be completed through the standard mobile execution flow.

Key principles:

- Force-complete does not bypass or weaken mobile enforcement.
- Cleaners cannot trigger or influence force-complete.
- Force-complete always results in an SLA violation.
- The action is fully auditable via Job Timeline and SLA reports.

Implementation notes:

- Force-complete creates a `JobCheckEvent` with type `force_complete`.
- The manager must provide an explicit reason and a human-readable comment.
- SLA state is derived from factual proof data plus force-complete context.
- Force-complete exists to make exceptions explicit, not to normalize incomplete jobs.

This behavior must remain stable and must not be simplified into an alternative
happy-path for job completion.

---

### SLA & force-complete — технические инварианты

- Job и SLA живут отдельно:
  - `status` описывает жизненный цикл job.
  - `sla_status` + `sla_reasons` описывают, насколько корректно выполнены требуемые шаги (check-in/out, фото, чек-лист).

- `force-complete` не «чинит» SLA, а наоборот **принудительно фиксирует нарушение**:
  - handler для `POST /api/manager/jobs/{id}/force-complete/` обязан:
    - убедиться, что user — менеджер;
    - убедиться, что job ещё можно завершить (не `completed` / не `cancelled`);
    - выставить `status="completed"`;
    - выставить `sla_status="violated"`;
    - добавить `reason_code` в `sla_reasons` (если его там ещё нет);
    - записать `force_completed=true`, `force_completed_at=now`, `force_completed_by=<manager>`.

- Frontend исходит из того, что:
  - job может быть `completed` и при этом иметь `sla_status="violated"`;
  - блок **SLA & Proof** — источник правды по качеству исполнения;
  - кнопка **Force complete job** доступна только для незавершённого job или для кейсов, которые мы явно разрешим (ограничения можно ужесточать/смягчать без изменения контракта).

Эта модель нужна, чтобы в будущем:
- не ломать операционный процесс завершения джоб из-за проблем с интернетом/фото;
- строить аналитику и performance-метрики на уровне SLA, а не просто по статусу `completed`.

## Analytics Page — implementation status**

Добавлена отдельная страница `/analytics` в Manager Portal с полной визуализацией операционной аналитики. Страница построена на независимом наборе UI-компонентов (`components/analytics/*`) и не использует legacy-код Reports.

Реализовано:

* KPI-карточки (summary).
* Графики трендов (jobs completed, avg duration, proof completion).
* Таблица performance клинеров + comparison chart.
* Корректная работа layout при свёрнутом sidebar (контент расширяется).

API-вызовы вынесены в `src/api/analytics.ts`, query-параметры формируются вручную (без `params/query`), что соответствует текущей сигнатуре `apiClient`.

Страница стабильно рендерится и использует мок-данные, готова к замене на live API без изменений UI.

### Manager Analytics — v1 (summary + cleaners)

Реализована интеграция страницы `/analytics` с backend-API через `apiClient`:

- верхние KPI-карточки теперь берут данные из `GET /api/manager/analytics/summary/` (период пока захардкожен на уровне фронта);
- таблица «Cleaner Performance» и график сравнения клинеров используют данные `GET /api/manager/analytics/cleaners-performance/`;
- при ошибке запросов выводится лаконичное сообщение и остаются дефолтные моки.

**Следующий шаг (фронт):**

- вынести date range (Last 14 days / This month / Custom) в отдельный контрол и подставлять `date_from` / `date_to` во все аналитические запросы;
- перевести графики в блоке **Trends** на реальные эндпоинты (`job-duration`, далее — proof-trends) вместо статических данных.

---

## DEV BRIEF — Job Details stability rules

Контекст: экран Job Details уже был рабочим, но его ломали серией изменений. На этом этапе выполнено восстановление и стабилизация поведения.

Ключевые правила:

1. **Job Details Screen — единственная точка бизнес-логики.**

   * UI-секции — тупые (dumb components).
   * Все действия (check-in, check-out, upload photo, checklist) управляются сверху.

2. **После любого mutating action:**

   * выполняется refetch job details;
   * UI никогда не обновляется “наугад” в обход backend.

3. **GPS:**

   * в DEV допускается подстановка координат job;
   * в PROD — только реальный GPS.

4. **Фото:**

   * используется актуальный `expo-image-picker`;
   * `mediaTypes` передаются строго по документации;
   * любые `as any` — только временная мера.

5. **Confirm modals:**

   * обязательны для Check-in и Check-out;
   * защищают от случайных нажатий;
   * считаются частью UX-контракта.

6. **Логи:**

   * `console.log` в API и screens не допускаются;
   * временные debug-логи удаляются перед коммитом.

Запрещено:

* дублировать бизнес-логику в секциях;
* «чинить» UI без понимания backend-состояния;
* удалять dev-хелперы без восстановления альтернативы.

```
::contentReference[oaicite:0]{index=0}
```
