# Platform Landing — Structure & Navigation (v1)

## Purpose
This document фиксирует **структуру главного лендинга платформы** и правила навигации.
Он отвечает на вопросы:
- что находится в верхнем меню,
- где пользователь понимает, какой продукт ему нужен,
- как платформа и продукты визуально и логически разделены.

Документ основан на принципах **Apple-style navigation**: минимализм, ясная иерархия, отсутствие перегруза.

---

## Core Principle

> **Navigation is not explanation.**  
> **Understanding happens in the page body, not in the menu.**

Верхнее меню — это тихий роутер.
Главная страница — место для ориентации.
Продуктовые лендинги — место для продажи.

---

## Top Navigation (Header)

### Structure

```
[ Logo ]   Products   Pricing   Contact   Sign in
```

### Rules

- Header всегда минимальный
- Нет слоганов, описаний или поясняющих текстов
- Нет CTA типа "Start trial" в шапке
- Header одинаков для всех страниц платформы

---

## Products Dropdown

### Purpose

Dropdown используется **только для навигации**, не для объяснения.

### Structure

```
Products
├── Cleaning
│   └── Verified cleaning reports
├── Property Management
│   └── Proof for apartment operations
├── Maintenance Services
│   └── Proof of service visits
└── Site Visits / Fit-out
    └── Proof of on-site work
```

### Visual Rules

- Название продукта — основное
- Описание — одна короткая строка (опционально)
- Маленький цветовой маркер рядом с названием
- Никаких иконок, карточек, иллюстраций

---

## Platform Landing — Page Structure

### 1. Hero Section

**Purpose:** задать масштаб и тон, не продавать.

Characteristics:
- крупная типографика
- минимум цвета
- один спокойный CTA (например, "View products")

---

### 2. Product Selection Section (Key Block)

**Purpose:** помочь пользователю выбрать свой продукт.

Structure:
- карточки продуктов одинакового размера
- одинаковая сетка
- одинаковая типографика

Differences:
- только маленький цветовой маркер

CTA:
- "View product"

---

### 3. Core Engine Overview

**Purpose:** объяснить, что все продукты работают на одном ядре.

Content (high-level):
- GPS check-in / out
- Before / After photos
- Checklist snapshot
- PDF report

Rules:
- без отраслевых слов
- без деталей

---

### 4. Platform Principles

**Purpose:** сформировать доверие.

Examples:
- Proof over promises
- No assumptions
- One visit — one verified result

---

### 5. Footer

Structure:
- Products
- Pricing
- Contact
- Sign in

Footer не продаёт и не объясняет.

---

## Product Landing Pages (Reference)

- Каждый продукт имеет собственный лендинг
- Продуктовые лендинги:
  - используют тот же header
  - используют свой accent color
  - содержат подробные сценарии и CTA

Главный лендинг **никогда** не конкурирует с продуктовым.

---

## Navigation Flow Summary

1. User enters platform landing
2. User understands platform purpose
3. User selects product (body or menu)
4. User lands on product page
5. Product page handles conversion

---

## Non-Goals

- Объяснять продукты в меню
- Продавать в header
- Делать сложную навигацию
- Использовать разные headers для продуктов

---

## Guiding Rule

> **If the header starts explaining, the page has failed.**

---

**Status:** Active
**Audience:** Internal (Founder / Design / Frontend)
**Changes:** Only with explicit design decision

