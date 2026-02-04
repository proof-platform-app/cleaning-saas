# QA / Regression Checklist — CleanProof

Этот документ описывает **минимальный, воспроизводимый набор проверок**,
который позволяет убедиться, что core‑функциональность CleanProof
**не сломалась после изменений** (код, инфраструктура, зависимости).

Документ **не является тест‑планом для QA‑команды** и **не заменяет автотесты**.
Это инженерный и продуктовый safety‑net.

---

## Когда использовать

Обязательно прогонять:

* перед любым merge в `main`;
* перед деплоем;
* перед демо / пилотом с клиентом;
* перед началом биллинга или V2‑работ.

Если чеклист не пройден — изменение считается **неготовым**.

---

## Уровень 0 — Инварианты системы (Smoke Check)

### 0.1 API доступность

* [ ] `/api/health/` возвращает `200 OK`
* [ ] Login manager (`/api/manager/auth/login/`) — успешен
* [ ] Login cleaner (`/api/auth/login/`) — успешен

---

## Уровень 1 — Happy Path (Core Execution)

### 1.1 Manager → Create Job

* [ ] Job создаётся через Planning
* [ ] Чеклист snapshot создаётся корректно
* [ ] Job отображается в Planning без reload

### 1.2 Cleaner → Job Execution

* [ ] Job появляется в Today Jobs
* [ ] Check‑in работает только в `scheduled`
* [ ] GPS валидация отрабатывает (ok / error)

### 1.3 Proof

* [ ] Before photo можно загрузить
* [ ] After photo запрещено без before
* [ ] After photo загружается корректно
* [ ] Checklist required items можно закрыть

### 1.4 Completion

* [ ] Check‑out доступен только при валидном proof
* [ ] Job переходит в `completed`
* [ ] Job становится read‑only

---

## Уровень 2 — SLA & Quality

### 2.1 SLA happy path

* [ ] Job без нарушений → `sla_status = ok`
* [ ] `sla_reasons` пустой массив

### 2.2 Force‑complete

* [ ] Force‑complete доступен только manager
* [ ] Job → `completed`
* [ ] `sla_status = violated`
* [ ] reason + comment сохраняются

---

## Уровень 3 — Reports & Evidence

### 3.1 Job PDF

* [ ] PDF генерируется
* [ ] PDF содержит:

  * timestamps
  * checklist
  * SLA status

### 3.2 Job PDF Email

* [ ] Email отправляется на default email
* [ ] Email отправляется на кастомный email
* [ ] Запись появляется в Email history

### 3.3 Weekly / Monthly Reports

* [ ] JSON отчёт открывается
* [ ] PDF отчёт генерируется
* [ ] Email отчёта логируется

---

## Уровень 4 — Analytics

* [ ] `/analytics` открывается
* [ ] KPI summary загружается
* [ ] Trends отображаются
* [ ] SLA Performance блок корректен

---

## Уровень 5 — Negative & Edge Cases

### 5.1 Permissions

* [ ] Cleaner не может force‑complete
* [ ] Cleaner не видит manager endpoints

### 5.2 Network / Errors

* [ ] Ошибка API отображается, не скрывается
* [ ] Нет silent‑fail состояний

---

## Статус прохождения

| Дата | Версия | Кто проверил | Результат |
| ---- | ------ | ------------ | --------- |
|      |        |              |           |

---

## Принципы

* Backend — source of truth
* Любое отклонение → фиксируется
* Чеклист должен быть **быстрым** (15–25 минут)

---

**Этот документ — часть Layer 5 (Scale Readiness)**

Он не добавляет функциональность,
но снижает риск регрессий при росте продукта.
