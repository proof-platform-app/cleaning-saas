# Cleaning SaaS — Project State

## Project Overview

Cleaning SaaS — backend-first продукт для **контроля выполнения клининговых работ** (рынок UAE).

Проект решает задачи:

- фиксации факта выполнения работы;
- контроля качества;
- доказательной базы (чек-листы, фото, аудит, PDF).

Сейчас уже есть:

- Django backend (ядро продукта),
- Manager Portal (web) для планирования и контроля,
- Mobile Cleaner App (Expo) для исполнителей.

---

## Roles

### Cleaner

- видит свои jobs (Today Jobs),
- выполняет check-in / check-out,
- отмечает чек-лист,
- загружает фото before / after,
- инициирует генерацию PDF отчёта (через backend).

### Manager

- планирует работы через Job Planning (web),
- назначает cleaners при создании jobs,
- контролирует выполнение,
- просматривает фото, чек-листы, audit trail,
- скачивает PDF отчёты.

---

## Architecture (Fixed)

### Django apps

- `apps.accounts`
  - User
  - Company
  - roles: manager / cleaner

- `apps.locations`
  - Location
  - ChecklistTemplate
  - ChecklistTemplateItem

- `apps.jobs`
  - Job
  - JobChecklistItem (snapshot)
  - JobCheckEvent
  - File
  - JobPhoto

- `apps.api`
  - DRF API
  - auth
  - jobs
  - checklist
  - photos
  - pdf
  - manager endpoints (planning, meta, create job)

---

## Layered Project State (by reality)

Формат: ✅ сделано 🟡 частично / в процессе ⛔ не делали

### 🧠 СЛОЙ 0 — ЯДРО (Backend + Manager Portal)

#### Backend (Django, API-first)

- Jobs (модель, связи, бизнес-логика) ✅  
- Status flow: `scheduled → in_progress → completed` ✅  
- Check-in / Check-out  
  - GPS  
  - distance validation  
  ✅  
- Checklist  
  - JobChecklistItem  
  - required items  
  - toggle / bulk update  
  ✅  
- Photos before / after  
  - EXIF extraction  
  - distance validation  
  - normalization to JPEG  
  - storage + File model  
  - связь с Job  
  ✅  
- Audit trail (JobCheckEvent) ✅  
- PDF report  
  - реальная генерация бинарного PDF  
  - эндпоинт `/api/jobs/<id>/report/pdf/`  
  - используется теми же данными, что UI  
  ✅  

👉 Backend-ядро полностью закрыто.

#### Manager Portal (Web)

- Today Jobs (страница Jobs, данные с API) ✅  
- Job Details (manager view) ✅  
  - таймлайн из `JobCheckEvent`, фото и чеклиста ✅  
  - фото before/after из `JobPhoto` ✅  
  - чеклист read-only + статус в таймлайне ✅  
  - GPS check-in/out + “Open in Maps” ✅  
  - Generate PDF — реальный PDF с backend ✅  
  - Download PDF — без повторной генерации ✅  
  - Email PDF — stub (API есть, письма фактически не отправляются) 🟡  

#### Job Planning (Manager)

**Backend**

- `/api/manager/jobs/planning/?date=YYYY-MM-DD` — агрегированная выдача по дате ✅  
- proof-флаги (before / after / checklist) нормализованы ✅  
- `/api/manager/meta/` — справочники (cleaners, locations, checklist templates) ✅  
- `/api/manager/jobs/` — создание job с snapshot чек-листа ✅  

**Frontend**

- страница Job Planning ✅  
  - таблица (дата, локация, клинер, время, статус) ✅  
  - колонка Proof (Before / List / After) в едином стиле ✅  
  - сайдпанель Job Details (основная инфа + proof + переход в Job Details) ✅  
- фильтры:  
  - дата ✅  
  - статусы (multi-select) ✅  
  - cleaner (All / конкретный) ✅  
  - location (All / конкретная) ✅  
- Create Job Drawer:  
  - дата, время, location, cleaner, checklist template ✅  
  - валидация времени (end > start) ✅  
  - работа с backend (`/meta`, `/jobs/`) ✅  
  - новая job сразу появляется в таблице без перезагрузки ✅  

👉 Статус слоя 0: **DONE ✅**  
Фактически слой усилен относительно изначального MVP за счёт Job Planning.

---

### 📱 СЛОЙ 1 — ИСПОЛНЕНИЕ (Mobile Cleaner App)

#### Mobile App (React Native / Expo)

- Login  
  - email / password  
  - token auth  
  - проверка роли cleaner  
  ✅  
- Today Jobs (`/api/jobs/today/`) ✅  
- Job Detail  
  - адрес  
  - статус  
  - чеклист  
  - действия (check-in, photos, checklist, check-out)  
  ✅  
- Check-in (GPS, `/check-in/`) ✅  
- Checklist  
  - toggle  
  - bulk update  
  ✅  
- Photos before / after 🟡  
  - backend полностью готов ✅  
  - на фронте есть логика камеры / выбора фото и загрузки ✅  
  - были баги (`expo-image-picker`, `split of undefined`) 🟡  
  - работает, но требует стабилизации и донастройки UX 🟡  
- Check-out (GPS, `/check-out/`) ✅  
- Job completed screen (минимальный, но есть) ✅  
- Navigation to location 🟡  
  - в web есть “Open in Maps” ✅  
  - в mobile отдельная кнопка навигации не доведена 🟡  

👉 Статус слоя 1: **рабочий MVP**, ключевые доработки — камера и навигация 🟡

---

### 🧑‍💼 СЛОЙ 2 — УПРАВЛЕНИЕ (Admin / Manager расширение)

- Locations  
  - модели есть ✅  
  - создание / редактирование из Manager Portal — нет ⛔  
  - геокодинг / карта — нет ⛔  

- Checklist templates  
  - backend-модели и snapshot-логика есть ✅  
  - UI для управления шаблонами (CRUD) — нет ⛔  

- Jobs  
  - backend полностью готов ✅  
  - создание job через Job Planning — есть ✅  
  - редактирование существующих job — нет 🟡  

- Назначение cleaners  
  - назначение при создании job (Create Job) — есть ✅  
  - отдельный UI для массового переназначения / правок — нет ⛔  

- История jobs  
  - Today Jobs (для клинера) — есть ✅  
  - Planning по конкретной дате (для менеджера) — есть ✅  
  - отдельная History-страница с диапазонами дат / фильтрами — нет 🟡  

- Фильтры и поиск  
  - дата ✅  
  - статусы (multi-select) ✅  
  - cleaner ✅  
  - location ✅  
  - текстовый поиск / фильтры по диапазону дат — нет ⛔  

- Повторяющиеся jobs (recurring) ⛔  

👉 Статус слоя 2:  
Job Planning доведён до рабочего уровня.  
До полноценного admin-уровня (templates UI, history, mass edit, recurring jobs) ещё есть объём 🟡

---

### 💳 СЛОЙ 3 — КОММЕРЦИЯ

- Регистрация компаний ⛔  
- Тарифы ⛔  
- Trial ⛔  
- Stripe / Paddle ⛔  

👉 Не начинали.

---

### 🌍 СЛОЙ 4 — МАРКЕТИНГ

- Landing ⛔  
- Demo ⛔  
- Pricing ⛔  
- Signup ⛔  

👉 Не начинали.

---

### 📊 СЛОЙ 5 — МАСШТАБ

- Аналитика ⛔  
- SLA ⛔  
- Performance reports ⛔  
- Multi-company roles ⛔  
- Audit exports ⛔  

👉 Не трогали.

---

## What works (DONE) — технический срез

### Auth

- `POST /api/auth/login/`
- email + password
- TokenAuthentication
- role-based access (manager / cleaner)
- используется и в web, и в mobile
- tests passing ✅

---

### Jobs (Cleaner flow, API)

- `GET /api/jobs/today/`
- `POST /api/jobs/<id>/check-in/`
  - GPS validation (≤ 100m)
  - status: `scheduled → in_progress`
- `POST /api/jobs/<id>/check-out/`
  - GPS validation
  - checklist validation (required items)
  - status: `in_progress → completed`
- audit через `JobCheckEvent`

---

### Checklist (API)

- snapshot из ChecklistTemplate при создании Job
- JobChecklistItem (immutable template, mutable snapshot)  
- toggle + bulk update  
- доступ:
  - только назначенный cleaner
  - только когда `job.status = in_progress`

---

### Photos (Phase 9 — DONE по backend)

- `POST /api/jobs/<id>/photos/`
- типы: `before` / `after`
- правила:
  - `after` нельзя без `before`
  - ровно одно фото каждого типа
- EXIF:
  - latitude / longitude / datetime
  - GPS validation (≤ 100m)
  - `exif_missing` flag (нет EXIF — всё равно разрешаем)
- storage через `MEDIA_ROOT` (детерминированный путь по company/job/type)
- нормализация в JPEG (stability между устройствами)
- tests passing ✅

---

### PDF

- `POST /api/jobs/<id>/report/pdf/`
- генерация через ReportLab
- включает:
  - job summary
  - timestamps
  - checklist
  - audit events
  - (фото готовы к встраиванию в следующей итерации)
- корректные headers
- скачивается через curl / browser

---

## Current Status

- Django system check: OK  
- Migrations applied  
- Tests passing (`manage.py test`)  
- API протестирован через curl и через реальные клиенты (web + mobile)  
- Фото реально сохраняются и читаются  
- PDF валиден и открывается стандартными viewer’ами  
- Manager Portal и Mobile App интегрированы с backend

---

## Known Limitations (by design, сейчас ок)

- Нет S3 / object storage (используем локальный `MEDIA_ROOT`)  
- Нет background jobs / очередей (всё синхронно)  
- Нет полноценного UI для:
  - locations,
  - checklist templates,
  - job history / диапазонов дат,
  - редактирования jobs,
  - recurring jobs.  
- Email PDF — stub (нет реальной интеграции с почтой).  

---

## Next Steps (осознанно, без фантазий)

Краткая логичная очередь:

1. **Mobile Cleaner App стабилизация**
   - починить/дочистить поток камеры (ImagePicker, ошибки);
   - добавить явную навигацию до локации (open in maps);
   - пройтись по UX Job Details на мобилке.

2. **Admin-слой (Слой 2)**
   - UI для Checklist Templates (минимальный CRUD);
   - Job History / диапазон дат;
   - базовый текстовый поиск по jobs.

3. **PDF v2**
   - включить фото before/after в PDF;
   - выровнять структуру под “юридический отчёт”.

Остальные слои (коммерция, маркетинг, масштаб) — сознательно позже.

---

## Workflow Rules

- **Passing tests = source of truth.**  
- Не ломать существующий API без явной причины и слоя совместимости.  
- Все изменения — пошагово, с фиксацией в docs (`MASTER_BRIEF`, `PROJECT_STATE`).  
- Backend-модели и миграции — не трогаем без крайней необходимости.  
- Для фронта:
  - маленькие файлы — возвращаем целиком,
  - большие — через точечные патчи, без “рефакторить всё”.

