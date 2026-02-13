# CleanProof — Docs Index

Карта основных документов проекта: **что это**, **для чего**, **когда открывать** и **кому он нужен**.

---

## 0. Как читать эту карту

Для каждого документа указано:

- **Роль** — зачем документ существует в системе.
- **Кому** — основной читатель / владелец.
- **Когда использовать** — типичные ситуации, когда его нужно открывать.
- **Что внутри** — краткое содержание.
- **Как менять** — правила обновления (и нужен ли CHANGELOG).

Эта карта **не дубль** содержимого, а навигатор по документации.

---

## 1. MASTER_BRIEF.md

**Роль:**  
Главный “паспорт продукта” для CleanProof. Описывает, что это за продукт, для кого, какие основные слои и принципы.

**Кому:**  
Фаундер, product, любые новые люди в проекте, внешние партнёры.

**Когда использовать:**

- когда кто-то новый подключается к проекту;
- когда нужно вспомнить продуктовое видение и границы MVP;
- при обсуждении новых направлений (V2, масштабирование, тарифы).

**Что внутри:**

- общая формула продукта;
- ключевые слои (execution, proof, SLA, reports, analytics);
- принципы развития («что не делаем»);
- связь с рынком и позиционирование.

**Как менять:**

- аккуратно, не превращая в свалку деталей;
- большие изменения — только после того, как они уже закреплены в коде/API/остальных доках;
- можно вести краткий CHANGELOG в конце файла (опционально).

---

## 2. MASTER_CONTEXT_*.md

Семейство файлов:

- `MASTER_CONTEXT_EXECUTION.md`
- `MASTER_CONTEXT_SLA.md`
- `MASTER_CONTEXT_ANALYTICS.md`
- `MASTER_CONTEXT_REPORTS.md`
- `MASTER_CONTEXT_ARCHITECTURE.md`
- `MASTER_CONTEXT_PRODUCT.md`

**Роль:**  
Разрезают MASTER_BRIEF на фокусные контексты по слоям. Это “линзы” на продукт: execution, SLA, analytics, reports и т.д.

**Кому:**  
Точечно — тому, кто работает с конкретным слоем:

- backend / mobile — execution, SLA, architecture;
- frontend — execution, reports, analytics;
- product — product / reports / sla / analytics.

**Когда использовать:**

- когда нужно глубже понять **конкретный слой** (например, только SLA-логика);
- при проектировании новых фич внутри слоя;
- при подготовке PRD для отдельного блока.

**Что внутри:**

- фокусированный контекст по слою;
- причины, почему так спроектировано;
- границы «что делаем / чего не делаем» в рамках слоя.

**Как менять:**

- обновлять только после того, как слой реально доехал до факта (код + API + PROJECT_STATE);
- использовать как “extended context”, не как source of truth;
- без детальных контрактов и статусов — для этого есть другие файлы.

---

## 3. API_CONTRACTS.md

**Роль:**  
**Единственный закон** по API. Контракты, эндпоинты, поля, коды ошибок, семантика.

**Кому:**  
Backend, frontend, mobile, любой интегратор.

**Когда использовать:**

- при любом изменении API;
- при интеграции фронта или мобилки;
- при отладке запросов (какие поля, какие коды).

**Что внутри:**

- список эндпоинтов;
- структуры запросов/ответов;
- коды ошибок и их значение;
- секция `## CHANGELOG` с версионированием контрактов.

**Как менять:**

- **только после** того, как код реально соответствует контракту (или вместе с изменением кода);
- каждое изменение оформлять в `## CHANGELOG`:
  - `X.Y.Z — YYYY-MM-DD`
  - `NEW / CHANGED / FIXED / DEPRECATED / BREAKING`.

---

## 4. DEV_BRIEF.md

**Роль:**  
“Как жить с backend’ом” для frontend и mobile. Инварианты, флоу, запреты, правила использования API.

**Кому:**  
Frontend, mobile, backend (как напоминание инвариантов).

**Когда использовать:**

- при разработке/рефакторинге фронта или мобилки;
- при онбординге нового разработчика;
- когда нужно понять **как правильно** использовать API и что трогать нельзя.

**Что внутри:**

- execution-флоу (jobs, check-in/out, photos, checklist);
- правила GPS, proof, SLA;
- trial / commercial поведение;
- инварианты и "что нарушать нельзя";
- **sales-assisted onboarding commands** (section 29.1):
  - `create_company_with_owner` — создание компании с Owner
  - `ensure_company_owner` — исправление компаний без Owner.

**Как менять:**

- синхронно с `API_CONTRACTS.md` и фактическим кодом;
- без фантазий и будущих хотелок — только то, что реально работает;
- можно вести небольшой `## CHANGELOG` по крупным изменениям.

---

## 5. PROJECT_STATE.md

**Роль:**  
Фактический снимок проекта **на сегодня**.  
Только статусы: ✅ / 🟡 / ⛔ по слоям.

**Кому:**  
Фаундер, product, любой разработчик, кто хочет быстро понять “что уже есть”.

**Когда использовать:**

- перед планированием следующих задач;
- перед хэнд-оффом в новый чат / новому исполнителю;
- когда нужно честно ответить «где мы сейчас по проекту».

**Что внутри:**

- слои (Core, Mobile, Management, Commerce, Marketing, Scale);
- для каждого — короткие bullets с фактом и статусом;
- без мотиваций и философии.

**Как менять:**

- только по факту (после слияния кода / фичи);
- не добавлять туда планы и гипотезы;
- желательно хранить версию и дату в шапке (`v7.0`, `Обновлено: YYYY-MM-DD`).

---

## 6. PROJECT_CONTEXT.md

**Роль:**  
Архитектурный контекст и история проекта. Объясняет **почему** всё устроено так, а не иначе.

**Кому:**  

- новые разработчики (особенно backend / архитекторы);
- product, который хочет понять архитектурные ограничения;
- сам фаундер, когда нужно вспомнить прошлые решения.

**Когда использовать:**

- при обсуждении архитектурных изменений;
- при проектировании новых слоёв (Analytics, Scale, Commerce);
- при объяснении проекта внешнему технарю.

**Что внутри:**

- high-level обзор продукта;
- основные Django apps и их роль;
- концептуальные слои (Layer 0–5);
- ключевые решения по execution, proof, GPS, photos, PDF;
- исторические заметки (как развивался продукт).

**Как менять:**

- не пытаться делать его “идеально актуальным” до байта — для этого есть PROJECT_STATE и API_CONTRACTS;
- периодически обновлять, когда меняются крупные архитектурные решения;
- явные лажи/устаревшее — править сразу.

---

## 7. CLEANPROOF_V2_SCOPE.md

**Роль:**  
Продуктовый и архитектурный **scope для V2**. Документ не про то, “что есть”, а про то, **куда мы развиваемся**.

**Кому:**  
Фаундер, product, архитектура.

**Когда использовать:**

- при планировании V2 (offline, proof policies, advanced checklist, email history v2 и т.д.);
- при подготовке PRD по конкретным пилонам V2 (Execution, SLA, Analytics, Commerce, Platform);
- когда нужно объяснить партнёру/подрядчику, что такое “V2” именно для CleanProof.

**Что внутри:**

- V1 vs V2 (чем отличаются);
- принципы V2 (evolution, not rewrite);
- пилоны: V2.1 Execution & Mobile, V2.2 SLA & Evidence, V2.3 Analytics, V2.4 Commerce & Roles, V2.5 Platform & Security;
- что **осознанно не делаем** в V2.

**Как менять:**

- только после того, как стратегическое решение принято (иначе будет мусорный wish-list);
- это **не** зеркало кода, а дорожная карта по взрослому, без фичек ради фичек.

---

## 8. SCALE_BRIEF.md

**Роль:**  
Документ про **Layer 5 / Scale & Enterprise Readiness**: проскейленная версия CleanProof для Pro / Enterprise.

**Кому:**  
Фаундер, product, продажи (в будущем), архитектура.

**Когда использовать:**

- когда нужно думать про тарифы Standard / Pro / Enterprise;
- при проработке enterprise-функций (audit exports, hierarchy, integrations);
- когда нужно понять, какие фичи относятся к “scale”, а какие — к “core”.

**Что внутри:**

- Layer 5 — смысл (масштаб, enterprise readiness);
- trial / usage / pre-billing архитектура;
- микроскоп SLA v2 (time-based, repeated violations);
- роль планов и тарифов (Standard / Pro / Enterprise);
- философия ценообразования.

**Как менять:**

- как стратегический документ: редко, но осмысленно;
- не мешать туда текущее состояние кода;
- использовать вместе с CLEANPROOF_V2_SCOPE.md для планирования будущих фич.

---

## 9. ANALYTICS_API_V1.md

**Роль:**  
Подробное описание **Analytics API v1** — операционная аналитика: summary, тренды, performance по клинерам, proof completion.

**Кому:**  
Backend, frontend (Analytics page), product при проектировании аналитики.

**Когда использовать:**

- при разработке / доработке `/analytics` страницы;
- при отладке KPI / трендов;
- при будущем расширении до v1.1 / v2.

**Что внутри:**

- список эндпоинтов Analytics:
  - `analytics/summary`
  - `analytics/jobs-completed`
  - `analytics/job-duration`
  - `analytics/proof-completion`
  - `analytics/cleaners-performance`
- семантика полей (что такое `on_time_completion_rate`, `proof_completion_rate` и т.д.);
- связь с SLA Engine (`compute_sla_status_and_reasons_for_job`).

**Как менять:**

- только после того, как реально меняется Analytics backend;
- не дублировать сюда всё из `API_CONTRACTS.md` — это более “расширенный” техдок именно по аналитике;
- можно завести маленький `## CHANGELOG` при изменениях API.

---

## 10. DEV_QUICKSTART.md

**Роль:**  
Быстрый старт для локальной разработки backend.

**Кому:**  
Backend-разработчики, подрядчики, фаундер.

**Когда использовать:**

- первый запуск проекта;
- проверка, что backend жив;
- быстрый доступ к DEV-аккаунтам и auth.

**Что внутри:**

- команды запуска сервера и тестов;
- base URL;
- DEV credentials (manager / cleaner);
- auth endpoints;
- минимальный набор ключевых API-эндпоинтов.

**Как менять:**

- только при изменении локального dev-флоу;
- credentials — **только DEV**, никогда PROD;
- не дублировать сюда контракты (они в API_CONTRACTS.md).

---
## 11. DEMO_CALL_SCRIPT.md

**Роль:**  
Скрипт живого демо и квалификации клиентов.

**Кому:**  
Founder, sales, bizdev.

**Когда использовать:**

- перед демо-звонками;
- при онбординге sales;
- для проверки, что демо не врёт возможностям продукта.

**Что внутри:**

- жёсткая формула позиционирования (“proof layer”);
- live demo flow: manager → cleaner → PDF;
- акценты на доказательства, а не UI;
- квалификация и фильтрация неподходящих клиентов;
- строгие language rules (что говорить / не говорить).

**Как менять:**

- только если реально меняется продукт или позиционирование;
- запрещено добавлять фичи, которых нет в коде;
- не использовать как маркетинговый текст для лендинга.

---
## 12. QA & Operations

**`QA_CHECKLIST.md`**  
– Ручной regression-checklist:  
  - smoke-инварианты;  
  - happy-path (manager + cleaner);  
  - SLA / force-complete;  
  - Reports + Email + Email history;  
  - Analytics.  
– Используется: перед релизами, крупными изменениями и refactor, чтобы убедиться, что
  ядро продукта (proof + SLA + reports) не сломано.
---


## 13. Mobile App (mobile-cleaner)

### `docs/mobile/MOBILE_STATE.md`

**Роль:**
Factual snapshot of the Cleaner App: what it can do today, how it behaves
offline (per code, not expectations), and a structured Phase D/E/F improvement
roadmap.

**Кому:**
Mobile frontend engineer, platform architect, product.

**Когда использовать:**

- перед началом любой работы с `mobile-cleaner` — единственный документ,
  который честно описывает текущее состояние и offline-поведение по коду;
- при планировании Phase D (offline-first) и Phase E (UX comfort);
- при онбординге нового разработчика на мобилку.

**Что внутри:**

- Scope & Context (как связана с backend / Manager Portal);
- Current Capabilities: login, today jobs, job details, check-in/out, photos,
  checklist, PDF (с указанием эндпоинтов и компонентов);
- Network & Offline Behaviour: factual — что происходит при `isOnline === false`,
  что такое outbox сейчас (stub), что видит пользователь;
- Error Handling & UX Safety: все состояния, все паттерны отображения ошибок;
- Known Limitations: честный список пробелов;
- Improvement Roadmap (Phase D / E / F proposals).

**Как менять:**

- обновлять после каждой завершённой фазы (D, E, F);
- никаких aspirational утверждений — только факты по коду;
- версию / дату фиксировать в шапке.

---

## 15. Audit Reports & Security Fixes

All audit-related documentation is located in `docs/audit/`.

### `docs/audit/BACKEND_EXECUTION_AUDIT_2026-02-11.md`

**Роль:**
Security and integrity audit report of backend execution layer. Identifies critical
risks, logical inconsistencies, security gaps, and data integrity vulnerabilities.

**Кому:**
Platform architect, backend engineer, product, founder (for risk prioritization).

**Когда использовать:**

- при планировании исправлений Critical/High рисков;
- перед запуском production (чтобы убедиться, что audit findings закрыты);
- при архитектурных изменениях execution layer (jobs, check-in/out, SLA);
- при compliance reviews или подготовке к security certification.

**Что внутри:**

- Executive summary (7 critical risks, 4 high, 3 medium);
- Step 1: Execution Flow Validation (status transitions, race conditions);
- Step 2: Evidence Integrity Audit (SLA calculation, GPS validation, immutability);
- Step 3: Multi-Tenant Isolation (company filtering, permission layer);
- Step 4: Analytics Consistency (division-by-zero, aggregation base);
- Step 5: Time & Date Edge Cases (timezone assumptions, midnight boundaries);
- Step 6: Additional Findings (orphaned files, EXIF spoofing);
- Consolidated Risk Summary (Critical/High/Medium tables + Confirmed Strong Areas).

**Ключевые находки:**

- **CRITICAL:** Force-complete bypasses check-in (no GPS proof);
- **CRITICAL:** Race conditions (no locking on checklist toggles);
- **CRITICAL:** Force-complete fields don't exist on Job model (audit trail lost);
- **HIGH:** Timezone assumption (server TZ ≠ job TZ) breaks international SLA metrics;
- **HIGH:** JobCheckEvent not immutable (evidence tampering possible).

**Как менять:**

- audit reports are read-only snapshots;
- after fixes are implemented, create new audit report with date suffix;
- mark resolved risks in new audit or create separate FIXES_TRACKING.md.

---

### `docs/audit/AUDIT_FIXES_README.md`

**Роль:**
Implementation summary of audit fixes (Hybrid Verified Model). Overview of all
changes applied to resolve Critical and High audit risks.

**Кому:**
Platform architect, backend engineer, product.

**Когда использовать:**

- при изучении того, какие изменения были сделаны для устранения рисков;
- перед deployment audit fixes в production;
- при code review изменений execution layer.

**Что внутри:**

- Summary of deliverables (models, views, analytics, migration);
- Risks resolved (Critical #1-4, High #5-6, Medium #11);
- Breaking changes (force-complete API);
- Zero-impact areas (cleaner API unchanged);
- Testing checklist и verification steps;
- Rollback plan.

---

### `docs/audit/AUDIT_FIXES_INVARIANTS.md`

**Роль:**
Comprehensive documentation of execution invariants preserved during audit fixes.
Explains what changed vs what stayed the same.

**Кому:**
Platform architect, backend engineer, product.

**Когда использовать:**

- при проверке, что audit fixes не сломали core execution flow;
- при планировании testing regression scenarios;
- при обновлении DEV_BRIEF или API_CONTRACTS.

**Что внутри:**

- Core invariants preserved (normal execution flow unchanged);
- New guarantees (force-complete security, race protection, immutability);
- Analytics impact (verified vs unverified separation);
- Migration path и rollback plan;
- Testing checklist;
- Documentation update requirements.

---

### `docs/audit/AUDIT_FIXES_APPLIED.md`

**Роль:**
Code changes summary for all audit fixes applied. Technical implementation details
for backend engineers.

**Кому:**
Backend engineer, code reviewers.

**Когда использовать:**

- при code review audit fixes;
- при debugging issues related to force-complete, locking, or immutability;
- при применении similar patterns в других частях кодовой базы.

**Что внутри:**

- Detailed code changes in models.py, views_cleaner.py, views_manager_jobs.py;
- Migration schema changes (0006_audit_fix_verification_override);
- Frontend breaking changes;
- Deployment steps;
- Testing checklist.

---

### `docs/audit/POST_FIX_INTEGRITY_VERIFICATION.md`

**Роль:**
Post-fix integrity verification report. Comprehensive verification that all audit
fixes work correctly and don't introduce new risks.

**Кому:**
Platform architect, QA engineer, backend engineer.

**Когда использовать:**

- после применения audit fixes (перед production deployment);
- при validation что все Critical/High risks действительно resolved;
- при планировании remaining risks (timezone, orphaned files).

**Что внутри:**

- Status transition matrix verification (6 sections);
- Analytics filtering verification (8 endpoints checked);
- JobCheckEvent immutability verification (triple-layer protection);
- Row-level locking verification (5 mutation endpoints);
- Scheduled time validation;
- Remaining production risks (HIGH/MEDIUM/LOW priority);
- Production readiness assessment.

---

### `docs/audit/INTEGRITY_VERIFICATION_EXECUTIVE_SUMMARY.md`

**Роль:**
Executive summary of post-fix integrity verification. High-level overview for
non-technical stakeholders.

**Кому:**
Founder, product, platform architect.

**Когда использовать:**

- при принятии решения о production deployment после audit fixes;
- при коммуникации security compliance со stakeholders;
- при planning next security audit.

**Что внутри:**

- Verification scope summary;
- Results summary (5 categories: PASS/FAIL);
- Critical fix applied during verification (force-complete race condition);
- Remaining known limitations (accepted for MVP);
- Production readiness verdict (PASS/FAIL);
- Deployment checklist.

---

### `docs/audit/MIGRATION_FIX_SUMMARY.md`

**Роль:**
Documentation of Django migration graph fix. Explains migration dependency conflict
and resolution.

**Кому:**
Backend engineer, platform architect.

**Когда использовать:**

- при применении migration 0006_audit_fix_verification_override;
- при debugging migration dependency errors;
- при понимании, почему migration был renumbered.

**Что внутри:**

- Issue explanation (NodeNotFoundError);
- Migration chain analysis (before/after);
- Fix applied (0001 deleted, 0006 created with correct dependencies);
- Terminal commands to run;
- Expected output;
- Rollback plan.

---

### Technical Specification Documents

Следующие документы содержат detailed technical specifications для audit fixes:

- **`docs/audit/AUDIT_FIXES_views_cleaner.md`** — Race condition fixes (4 endpoints)
- **`docs/audit/AUDIT_FIXES_force_complete.md`** — Force-complete rewrite specification
- **`docs/audit/AUDIT_FIXES_analytics.md`** — Analytics filtering specification

**Кому:** Backend engineer (implementation reference).

**Когда использовать:** При code review или reimplementation аналогичных паттернов.

---

## 16. Billing & Trial Management

All billing and trial-related documentation is located in `docs/billing/`.

### `docs/billing/TRIAL_FLOW.md`

**Роль:**
Complete technical specification of 7-day trial lifecycle and upgrade flow.
Documents trial signup, auto-start, expiration detection, and upgrade to active plan.

**Кому:**
Platform architect, backend engineer, frontend engineer, product.

**Когда использовать:**

- при реализации trial signup flow;
- при debugging trial auto-start или expiration logic;
- при integration биллинга (Stripe);
- при тестировании trial lifecycle;
- при планировании trial restart protection.

**Что внутри:**

- Trial model (database fields, status logic, limits);
- User journey (6 steps: Pricing → Signup → Auto-start → Active → Expired → Upgrade);
- API endpoints (3 endpoints: start trial, usage summary, upgrade to active);
- Trial limits (hard limits: 2 cleaners, 10 jobs; soft limits: warning thresholds);
- Frontend logic (Pricing page CTA states, Dashboard banner, auto-start);
- Testing (manual checklist + 11 automated tests);
- Production considerations (billing integration, email notifications, analytics).

**Ключевые компоненты:**

- **Backend:** `Company.plan` field, trial status methods, 3 API endpoints;
- **Frontend:** Pricing page mode detection, Dashboard auto-start, upgrade flow;
- **Tests:** 11 passing tests covering all trial states and transitions.

**Как менять:**

- update after billing integration (Stripe checkout);
- update after adding trial restart protection;
- update after implementing email notifications;
- версию/дату фиксировать в changelog.

---

## 17. Остальные документы

Если будут добавляться новые `.md`-файлы (например, PRD по конкретным фичам):

- **PRD_*:**
  - чётко маркировать в названии: `PRD_CHECKLIST_V2.md`, `PRD_OFFLINE_EXECUTION.md` и т.п.;
  - в начале файла указывать связь:
    - "Базируется на: CLEANPROOF_V2_SCOPE.md, раздел 2.5".

- **README / ONBOARDING:**
  - для совсем новых людей;
  - могут ссылаться на этот `DOCS_INDEX.md` как на карту.

---

## 18. Architecture

### `docs/architecture/PLATFORM_LAYER_V1_DEFINITION_OF_DONE.md`

**Роль:**
Architectural lock document that formally defines Platform Layer v1 baseline and acts as guardrail against scope expansion.

**Кому:**
Backend engineer, product, architecture lead, anyone proposing changes to Platform Layer.

**Когда использовать:**

- before modifying auth system, roles, or RBAC rules;
- before changing error response format;
- before adding new billing semantics;
- when proposing Platform Layer v2 features;
- during architectural review of new contexts (Fit-out, Maintenance, etc.).

**Что внутри:**

- Platform Layer v1 scope (auth, roles, errors, RBAC, Settings v1.1, trial);
- Core invariants (locked): role model, error structure, billing semantics, trial logic, deterministic payloads;
- Explicitly NOT included: payment provider integration, 2FA, sessions, advanced billing, context-specific logic;
- Change policy: version bump + contract review + verification update required;
- Relationship to operational contexts (context-neutral platform);
- Verification discipline (verify_rbac.sh + VERIFICATION_CHECKLIST.md).

**Как менять:**

- only when proposing breaking changes (v1 → v2);
- update changelog in document;
- update API_CONTRACTS.md, PROJECT_STATE.md, verification checklist;
- pass verification scripts before commit.

---

## 19. UX Specifications

### `docs/ux/SETTINGS_ACCOUNT_BILLING_UX_v1.1.md`

**Роль:**
Production-ready UX specification for Settings pages (Account + Billing).

**Кому:**
Frontend engineer, product, design system architect.

**Когда использовать:**

- при реализации Settings pages;
- при проверке role-based access control logic;
- при проверке token usage и component specs.

**Что внутри:**

- Settings Home (/settings) hub page with 4 tiles;
- Account Settings (/settings/account) with profile, password, notifications;
- Billing (/settings/billing) with subscription, usage, payment methods;
- Role-based access control (Owner/Manager/Staff);
- Progress bar color rules (≤79% accent, 80-99% warning, 100%+ error);
- Token usage governance (no raw hex, no landing tokens, accent only on primary CTAs);
- MVP boundaries (v1.1 vs v1.2+).

**Как менять:**

- после валидации с design system architect;
- обновлять CHANGELOG в начале файла;
- следовать governance rules из design system.

---

## 20. Company (Org Scope)

**Роль:**
Company pages provide org-level management separate from user-scope Settings (Account/Billing).

**Кому:**
Owner and Manager roles only (RBAC enforced).

**Когда использовать:**

- при управлении информацией компании (название, лого, контакты);
- при управлении командой и клинерами;
- НЕ путать с Settings (user scope) — это organization scope.

**Что внутри:**

- `/company/profile` — Company Profile (name, logo, contact email, contact phone);
- `/company/team` — Team & Cleaners list (preview with mock data);
- RBAC: Owner/Manager see menu, Staff/Cleaner blocked with redirect;
- Backend integration: 🟡 partial (UI ready, backend API not connected yet).

**Как менять:**

- Frontend changes only (UI/UX);
- Backend integration planned but not included in v1;
- Follow same design system as Settings pages;
- Update PROJECT_STATE.md when backend integration is added.

---

## 20.1 Owner/Manager Role Model

### `docs/product/OWNER_MANAGER_MODEL_v1.md`

**Роль:**
Design specification for Owner/Manager role distinction and RBAC rules.

**Кому:**
Product, backend engineer, frontend engineer, founder.

**Когда использовать:**

- при проектировании новых features с RBAC;
- при понимании различия Owner vs Manager;
- при планировании onboarding flow;
- при проверке, какая роль имеет доступ к какой функции.

**Что внутри:**

- Terminology: Owner (Billing Admin) vs Manager (Ops Admin);
- Onboarding models: self-serve vs sales-assisted;
- RBAC matrix for all existing features (billing, company, team, jobs, reports);
- Non-goals: transfer ownership, invites, multi-owner, payment integration;
- Implementation notes (existing code references).

**Как менять:**

- обновлять при изменении RBAC rules;
- обновлять при добавлении новых features с role-based access;
- версионировать в CHANGELOG.

---

## 21. Как пользоваться всей системой документов

Ниже — типовые ситуации и **какой документ открывать в первую очередь**.
Это не иерархия важности, а **карта навигации**, чтобы не читать всё подряд.

---

### 1. **Я только зашёл в проект и хочу быстро понять, что это вообще за продукт**

→ `MASTER_BRIEF.md`

Что даёт:

* что за продукт;
* для кого он;
* какую управленческую боль решает;
* где границы и чего **он не пытается быть**.

👉 Всегда начинать отсюда.
👉 Если после него хочется «прикрутить фичей» — сначала вернись сюда.

---

### 2. **Нужно за 2 минуты понять, что реально уже работает прямо сейчас**

→ `PROJECT_STATE.md`

Что даёт:

* честный фактологический снимок;
* только статусы: ✅ 🟡 ⛔;
* без планов, обещаний и гипотез.

👉 Это **единственный документ**, который отвечает на вопрос
«что реально реализовано сегодня».

---

### 3. **Мне нужно запустить backend локально и дернуть API**

→ `DEV_QUICKSTART.md`

Что даёт:

* как запустить сервер;
* DEV-аккаунты (manager / cleaner);
* auth;
* базовые рабочие эндпоинты.

👉 Это входная точка в код.
👉 Не заменяет `DEV_BRIEF` и `API_CONTRACTS`.

---

### 4. **Подключаю фронт или мобилку и хочу понять, как правильно работать с API**

→ `DEV_BRIEF.md` + `API_CONTRACTS.md`

Роли документов:

* `API_CONTRACTS.md` — **что есть и какие контракты**;
* `DEV_BRIEF.md` — **как этим пользоваться правильно** и что нельзя ломать
  (source of truth, запреты, ожидания backend’а).

👉 `API_CONTRACTS` без `DEV_BRIEF` читать опасно.
👉 `DEV_BRIEF` без `API_CONTRACTS` — бесполезно.

---

### 5. **Нужно разобраться, почему архитектура устроена именно так**

→ `PROJECT_CONTEXT.md`

* соответствующий `MASTER_CONTEXT_*.md`

Как пользоваться:

* `PROJECT_CONTEXT.md` — общая картина и история решений;
* `MASTER_CONTEXT_*` — углубление **в один слой**, например:

  * execution,
  * SLA,
  * analytics,
  * reports,
  * architecture.

👉 Эти документы **не про “что делать дальше”**,
а про **почему это уже сделано именно так**.

---

### 6. **Работаю с аналитикой или страницей Analytics**

→ `ANALYTICS_API_V1.md` + `API_CONTRACTS.md`

Что дают:

* семантика метрик;
* правила времени (actual vs scheduled);
* что считается фактом, а что интерпретацией;
* какие данные использует UI.

👉 Analytics здесь — **операционная**, не BI.
👉 SLA и Reports интерпретируют эти данные, но не меняют их.

---

### 7. **Планируем развитие продукта, V2 или масштабирование под Enterprise**

→ `CLEANPROOF_V2_SCOPE.md` + `SCALE_BRIEF.md`

Что дают:

* куда продукт идёт;
* какие пилоны существуют (Execution / SLA / Analytics / Commerce / Platform);
* что **осознанно не делаем**;
* где границы V2 и Layer 5.

👉 Эти документы — **не план задач**,
а рамка, чтобы roadmap не расползался.

---

### 8. **Готовлюсь к демо или хочу понять, как правильно показывать продукт клиентам**

→ `DEMO_SCRIPT_v1.md`

Что даёт:

* живой сценарий демо;
* правильные акценты (proof, evidence, audit);
* фильтрация неподходящих клиентов;
* никакого оверсейла.

👉 Если демо не укладывается в этот скрипт —
значит, ты показываешь то, чего продукт не обещает.

---

### 9. **Хочу проверить, что ничего не сломалось после изменений**

→ `QA_CHECKLIST.md`

Что даёт:

* ручной regression-checklist;
* smoke + happy-path;
* SLA / force-complete;
* Reports / PDF / Email / Email history;
* Analytics.

👉 Используется перед:

* релизами;
* биллингом;
* V2-изменениями;
* крупными refactor’ами.

---

###  Как пользоваться этим индексом


* Хочешь понять **что за продукт** → смотри `MASTER_BRIEF.md`.
* Хочешь узнать **что уже работает** → `PROJECT_STATE.md`.
* Подключаешь фронт/мобилу → `DEV_QUICKSTART.md` + `DEV_BRIEF.md` + `API_CONTRACTS.md`.
* Работаешь с **мобильным приложением** → `docs/mobile/MOBILE_STATE.md`.
* Разбираешься в архитектуре и слоях → `PROJECT_CONTEXT.md` + нужный `MASTER_CONTEXT_*.md`.
* Планируешь V2 / масштаб / enterprise → `CLEANPROOF_V2_SCOPE.md` + `SCALE_BRIEF.md`.
* Проверяешь, что ничего не сломалось → `QA_CHECKLIST.md`.
* Готовишься к демо клиенту → `DEMO_SCRIPT_v1.md`.
* Анализируешь риски и security gaps → `docs/audit/BACKEND_EXECUTION_AUDIT_2026-02-11.md`.
* Проверяешь, что audit fixes применены корректно → `docs/audit/POST_FIX_INTEGRITY_VERIFICATION.md` + `docs/audit/INTEGRITY_VERIFICATION_EXECUTIVE_SUMMARY.md`.
* Работаешь с trial/billing flow → `docs/billing/TRIAL_FLOW.md`.

Если не укладывается никуда — лучше сначала придумать, **к какому слою это относится**, а уже потом писать документ.

