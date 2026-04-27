# BAZARI ARA — интернет-магазин в Тбилиси

> Быстрая доставка товаров для дома, сада, туризма и детей по Тбилиси за 2 часа. Более 1000 товаров в наличии.

---

## О магазине

| Параметр | Значение |
|---|---|
| **Название** | BAZARI ARA |
| **Слоган** | Привезём всё, что нужно, за 2 часа! |
| **Сайт** | https://bazariara.ge |
| **Местоположение** | Тбилиси, Грузия |
| **Валюта** | Грузинский лари (GEL, ₾) |
| **Ценовой сегмент** | Доступный, масс-маркет |
| **Телефон** | +995 591 017 495 |
| **Telegram** | https://t.me/bazariarage |
| **Время работы** | 09:00 – 21:00, ежедневно |

---

## Ключевые особенности

- **Доставка:** 2 часа по всему Тбилиси. Стоимость — 10 GEL.
- **Ассортимент:** Более 1000 товаров — дом, сад, кемпинг, туризм, дети.
- **Склад:** Все товары физически находятся на складе в Тбилиси.
- **Возврат:** 14 дней согласно законодательству Грузии.
- **Языки сайта:** Русский 🇷🇺, Грузинский 🇬🇪, Английский 🇬🇧

---

## Структура сайта

| Страница | URL |
|---|---|
| Главная | `https://bazariara.ge` |
| Категория | `/?category={key}` |
| Подкатегория | `/?category={key}&subcategory={subkey}` |
| Страница товара | `/products/{category}/{id}` |
| Поиск | `/?search={query}` |
| Корзина | `/cart` |
| Оформление заказа | `/checkout` |
| Политика возврата | `/returns` |
| Политика конфиденциальности | `/privacy-policy` |

---

## Технологии

| Слой | Технология |
|---|---|
| **Frontend** | Next.js 15 (App Router), React, Tailwind CSS |
| **База данных** | Neon (PostgreSQL), `postgres.js` |
| **Хостинг** | Relaxdev (Docker + Traefik) |
| **CDN / Хранилище фото** | Yandex Object Storage + `cdn.relaxdev.ru` |
| **Аналитика** | Google Analytics (G-EN4C3S417X), Яндекс Метрика (107711719), Facebook Pixel |
| **SSL** | Let's Encrypt via Traefik ACME (HTTP-01) |

---

## AI — генерация описаний

### Провайдеры (приоритет)

1. **OpenCode Go** (primary) — OpenAI-совместимый эндпоинт
   - URL: `https://opencode.ai/zen/go/v1/chat/completions`
   - Ключ: `OPENCODE_API_KEY`
   - Модели (в порядке попытки): `deepseek-v4-pro` → `deepseek-v4-flash` → `glm-5.1` → `kimi-k2.5`

2. **Yandex GPT 5.1** (fallback) — при любой ошибке OpenCode
   - URL: `https://ai.api.cloud.yandex.net/v1`
   - Ключ: `YANDEX_API_KEY` + `YANDEX_FOLDER`

### Переводы

Имена товаров на `en` и `ka` — **Google Translate** (бесплатно, без ключа).

### API эндпоинты

| Эндпоинт | Описание |
|---|---|
| `POST /api/admin/generate-description` | Генерация описания/перевода для одного товара |
| `POST /api/admin/batch-translate` | Массовая генерация (до 50 товаров за раз) |

### Параметр `provider`

```json
{ "provider": "opencode" }   // по умолчанию — OpenCode Go → Yandex fallback
{ "provider": "yandex" }     // только Yandex GPT
```

---

## Загрузка фотографий

- **Хранилище:** Yandex Object Storage, bucket `izipost`, prefix `bazariara/`
- **CDN:** `https://cdn.relaxdev.ru/bazariara/`
- **API:** `POST /api/admin/upload?filename=...` — загружает файл, возвращает CDN URL
- **Удаление:** `DELETE /api/admin/upload?url=...`

---

## Переменные окружения

```env
# База данных
DATABASE_URL=postgres://...

# Yandex Cloud
YANDEX_API_KEY=...
YANDEX_FOLDER=b1gcr5m4ptniag2qpsqm
YANDEX_REGION=ru-central1
YANDEX_ACCESS_KEY_ID=...
YANDEX_SECRET_ACCESS_KEY=...

# OpenCode Go (primary AI)
OPENCODE_API_KEY=...

# Админка
ADMIN_SECRET=...

# Парсер
SCRAPER_WEBHOOK_URL=http://YOUR_SERVER:8080/webhook
SCRAPER_WEBHOOK_SECRET=...
```

---

## Админ-панель `/admin`

**Вход:** `/admin/login` — вводи значение `ADMIN_SECRET`

| Раздел | URL | Описание |
|---|---|---|
| Дашборд | `/admin` | Статистика, запуск парсера |
| Товары | `/admin/products` | Таблица с поиском/фильтрами |
| Редактирование | `/admin/products/{id}` | Форма ru/en/ka + фото |
| Создать товар | `/admin/products/new` | Новая карточка |

### Функции дашборда
- Статистика: всего / в наличии / без фото / без SKU
- **«Обновить цены»** — `python main.py --update` (~30 мин)
- **«Полный парсинг»** — `python main.py` (~несколько часов)

---

## SEO

- **Sitemap:** `https://bazariara.ge/sitemap.xml` — генерируется динамически из БД
- **Robots:** `https://bazariara.ge/robots.txt` — закрыты `/admin`, `/cart`, `/checkout`, `/api/`
- **Schema.org:** Organization, LocalBusiness, WebSite, Product, BreadcrumbList, ItemList
- **hreflang:** ru / ka / en / x-default на всех страницах
- **Canonical:** прописан на всех страницах, `page=1` не добавляется

---

## Деплой

Сайт работает на **Relaxdev** через **Docker + Traefik**.

```bash
# Деплой через git push (если настроен webhook)
git push origin main:main

# Или вручную на сервере
docker compose pull && docker compose up -d
```

**Важно:** DNS домена `bazariara.ge` должен указывать только на IP Relaxdev (`72.56.37.162`). Второй A-record удалён.