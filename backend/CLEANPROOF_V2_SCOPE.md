# CleanProof V2 — Product & Architecture Scope

**Status:** ACTIVE — Product & Architecture Scope  
**Scope:** V2 (includes already implemented parts)  
**Last reviewed:** 2026-02-04

⚠️ Этот документ **НЕ является**:
- технической спецификацией задач;
- фактическим состоянием системы;
- заменой DEV_BRIEF или PROJECT_STATE.

Документ:
- фиксирует **архитектурные решения и продуктовую логику**;
- описывает **V2 как эволюцию V1**, включая уже реализованные части;
- используется как основа для PRD, roadmap и стратегических решений.

Фактическое состояние системы см.:
- `PROJECT_STATE.md`
- `DEV_BRIEF.md`

---

## 0. Связь с V1

### V1 — что уже есть  
**Status:** ✅ Implemented (V1 / V1.5)

На текущий момент в CleanProof **реально работает**:

**Execution**
- Jobs lifecycle: `scheduled → in_progress → completed`
- GPS check-in / check-out + distance validation
- Proof-of-work:
  - before / after photos,
  - checklist (snapshot),
  - audit trail (`JobCheckEvent`)

**SLA**
- SLA Engine v1:
  - `sla_status`, `sla_reasons`
  - proof-based violations
- Performance aggregation:
  - violation rate,
  - repeated violations
- SLA breakdown:
  - top reasons,
  - cleaners,
  - locations

**Reports & Evidence**
- Weekly / Monthly reports (JSON + PDF)
- Job PDF reports
- Email delivery (job / weekly / monthly)
- Unified Email history (audit trail)
- Reports → Violations → Jobs → Job details drill-down
- Owner overview (read-only)

V1 уже является **демонстрируемым и операционным продуктом**.

---

### Зачем нужен V2

V2 — это **не «больше экранов»**.

**V2 = снятие ограничений V1 и подготовка к масштабу**  
(50–100+ локаций, несколько ролей, аудит, политики).

Цели V2:

1. Сделать execution устойчивым к реальным условиям (оффлайн, сбои).
2. Формализовать SLA & Evidence для споров и аудита.
3. Превратить аналитику из отчётов в единый Analytics-слой.
4. Добавить коммерческий скелет без усложнения.
5. Подготовить платформу к enterprise-требованиям.

---

## 1. Принципы V2

1. **Evolution, not rewrite**
   - Никаких переписываний ядра.
   - V2 строится поверх V1.

2. **Backend = source of truth**
   - Все правила, политики, расчёты — backend.
   - Frontend — отображение и UX.

3. **Вертикальные срезы**
   - Execution → SLA → Analytics → Commerce → Platform.
   - Каждый слой закрывается минимально, но полностью.

4. **Ограничения лучше хаоса**
   - Меньше фич, но с предсказуемым поведением.

5. **Analytics = факты, Reports = интерпретация**
   - Analytics даёт цифры.
   - Reports и SLA — объясняют их.

---

## 2. Пилон V2.1 — Execution & Mobile

### Общий статус  
**Status:** 🟡 Partially implemented

---

### 2.1. Offline-first execution

**Status:** 🟡 Architecture only (groundwork done)

#### Семантика

Вводится состояние синхронизации событий:

- `pending_sync`
- `synced`
- `sync_failed`

Применимо к:
- check-in / check-out,
- фото,
- чек-листу,
- completion.

#### Backend требования

- Приём событий с:
  - `created_at` (device),
  - `received_at` (server).
- Правила дедупликации и конфликтов.

#### UX требования

- Клинер **всегда видит** состояние синхронизации.
- Никаких silent failures.

---

### 2.2. Flexible proof policies

**Status:** 🔮 Planned

Позволяет конфигурировать требования proof:

- Company-level policy
- Location-level override
- (позже) Job-type policy

SLA reasons остаются универсальными:
- `missing_before_photo`
- `missing_after_photo`
- `checklist_not_completed`

Policy отвечает:
> «Считается ли отсутствие proof нарушением?»

---

### 2.3. Mobile UX reliability

**Status:** 🟡 Partially implemented

Направления:
- явные состояния job (proof required / syncing / error),
- единый стиль ошибок,
- backend-first валидация.

---

## 2.5. Checklist System v2

### Общий статус  
**Status:** 🟡 Core implemented, V2 extensions planned

---

### 2.5.1. Checklist templates v2

**Status:** 🟡 Partially implemented

Уже есть:
- templates,
- snapshot на job,
- required items,
- SLA integration.

V2 расширения:
- `category`
- `description`
- `version`

---

### 2.5.2. Checklist versioning

**Status:** 🔮 Planned

- Шаблон имеет `version`
- Job фиксирует версию
- SLA и отчёты используют snapshot

---

### 2.5.3. Partial completion semantics

**Status:** 🔮 Planned

- required vs optional
- counts:
  - `required_items_count`
  - `completed_required_items_count`

---

### 2.5.4. Checklist + Proof policies

**Status:** 🔮 Planned

Checklist становится частью общей proof-policy:
- required / optional / disabled
- влияет на SLA интерпретацию

---

## 2.6. Email History & Report Delivery

**Status:** ✅ Implemented (V1.5)

Email history — **Evidence & Audit слой**, не UI-фича.

Реализовано:
- unified log (job / weekly / monthly),
- backend filtering + pagination,
- manager-facing UI,
- append-only semantics,
- audit-ready модель.

Email **не генерирует SLA violation**,  
но используется как контекст и доказательство.

---

## 3. Пилон V2.2 — SLA & Evidence v2

### Общий статус  
**Status:** 🟡 Core implemented, extensions planned

---

### 3.1. Evidence timeline

**Status:** 🟡 Implemented (via JobCheckEvent)

Используется:
- check-in/out,
- photos,
- checklist,
- completion,
- force-complete.

Расширения:
- новые типы событий,
- расширенный Evidence view.

---

### 3.2. New SLA reasons

**Status:** 🔮 Planned

Примеры:
- `late_start`
- `late_finish`
- `gps_mismatch_minor / major`

Добавляются **расширением**, без ломки старых reason codes.

---

## 4. Пилон V2.3 — Reports & Analytics

### Общий статус  
**Status:** 🟡 Implemented (v1), consolidation planned

---

### Analytics v1

**Status:** ✅ Implemented

Реализовано:
- KPI summary,
- trends,
- cleaner performance,
- SLA breakdown,
- unified date range.

Frontend:
- read-only,
- backend = source of truth.

---

### Unified Analytics API

**Status:** 🔮 Planned

Цель:
- единый источник данных для:
  - Analytics UI,
  - Reports,
  - SLA Performance.

---

## 5. Пилон V2.4 — Commerce & Roles

**Status:** 🔮 Planned

- Plans / limits
- Trial → paid
- Soft enforcement
- Role model:
  - owner / manager / supervisor / cleaner

---

## 6. Пилон V2.5 — Platform & Security

### Audit & Export

**Status:** 🟡 Partially implemented

Есть:
- JobCheckEvent
- ReportEmailLog

Планируется:
- формализация audit actions,
- CSV / JSON export.

---

### API versioning

**Status:** 🔮 Planned

Правила:
- backward-compatible additions в v1,
- breaking → `/v2/` endpoints,
- явная фиксация в API_CONTRACTS.

---

## 7. Что НЕ входит в V2

**Status:** ✅ Explicitly excluded

- ❌ marketplace клинеров
- ❌ no-code workflow builders
- ❌ AI без проверяемых метрик
- ❌ real-time streaming dashboards

---

## 8. Как использовать документ

1. **PRD** — один PRD на один пилон.
2. **Планирование** — приоритет:
   - Execution → Commerce → Analytics.
3. **Коммуникация** — источник правды о scope V2.

---

## Итог

CleanProof V2:
- не ломает V1;
- усиливает доказательность;
- масштабируется;
- готов к enterprise-аудиту.

Execution → SLA → Evidence → Analytics → Commerce  
— единая, связная архитектура.
```

---

