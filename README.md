# Admin Panel — bazariara.ge

Панель управления товарами и парсером. Добавляется поверх существующего Next.js сайта.
Существующий код (app/page.tsx, компоненты) не изменяется.

---

## Что добавляется

```
app/
  admin/
    layout.tsx              middleware защищает весь /admin/*
    login/page.tsx          страница входа (токен из .env)
    page.tsx                дашборд: статистика + кнопки запуска парсера
    DashboardClient.tsx     клиентская часть дашборда
    products/
      page.tsx              таблица товаров (поиск, фильтры, пагинация)
      [id]/
        page.tsx            страница редактирования / создания
        EditClient.tsx      форма с полями ru/en/ka

  api/admin/
    login/route.ts          POST — выдаёт cookie
    products/
      route.ts              GET (список) + POST (создать)
      [id]/route.ts         PATCH (изменить) + DELETE
    trigger-update/route.ts POST — запускает ежедневный апдейт
    trigger-scrape/route.ts POST — запускает полный парсинг

lib/
  admin-auth.ts             проверка cookie/Bearer токена

middleware.ts               redirect /admin/* → /admin/login если нет токена
```

---

## Установка

### 1. Скопируй файлы в репозиторий bazariara.ge

```bash
# Из этой папки — копируй структуру app/ и lib/ в корень Next.js проекта
cp -r app/admin       /path/to/bazariara/app/admin
cp -r app/api/admin   /path/to/bazariara/app/api/admin
cp    lib/admin-auth.ts /path/to/bazariara/lib/admin-auth.ts

# middleware.ts — если у тебя уже есть middleware, объедини вручную
cp middleware.ts /path/to/bazariara/middleware.ts
```

### 2. Добавь переменные в .env.local

```env
ADMIN_SECRET=придумай-сложный-токен

# URL твоего сервера со scraper-agent
SCRAPER_WEBHOOK_URL=http://YOUR_SERVER:8080/webhook
SCRAPER_WEBHOOK_SECRET=тот-же-секрет-что-в-scraper-agent
```

### 3. Деплой bazariara.ge (Vercel push)

```bash
git add app/admin app/api/admin lib/admin-auth.ts middleware.ts
git commit -m "feat: admin panel"
git push
```

После деплоя зайди на https://bazariara.ge/admin

---

## Использование

### Вход
Открой `/admin` → введи значение `ADMIN_SECRET` из .env

### Дашборд `/admin`
- Статистика: всего / в наличии / без фото / без SKU
- **«Обновить цены и наличие»** — запускает `python main.py --update` на сервере (~30 мин)
- **«Полный парсинг»** — запускает `python main.py` (~несколько часов)
- Лента последних обновлённых товаров

### Товары `/admin/products`
- Поиск по имени, SKU, external_id
- Фильтры: наличие / без фото / без SKU / категория
- Клик «Изменить» → форма редактирования

### Редактирование `/admin/products/[id]`
- Все текстовые поля на трёх языках (ru/en/ka)
- SKU, цена, наличие
- Главное фото (URL) с превью
- Кнопка «Удалить»
- Ссылка «→ gorgia.ge» на оригинальную страницу

### Создание нового товара
Кнопка «+ Добавить» в шапке таблицы → `/admin/products/new`

---

## Webhook-сервер (scraper-agent)

Чтобы кнопки запуска работали — на сервере со scraper-agent нужно запустить `webhook_server.py`.

### Добавить в docker-compose.yml scraper-agent

Уже добавлен как сервис `webhook`. Убедись что порт 8080 доступен с Vercel:

```bash
# Проверка
curl -X POST http://YOUR_SERVER:8080/webhook/update \
     -H "X-Secret: your-secret"
# → {"ok": true, "message": "Апдейт запущен"}

# Статус
curl http://YOUR_SERVER:8080/webhook/status \
     -H "X-Secret: your-secret"
```

### Если сервер за NAT / firewall

Открой порт 8080 или поставь nginx как reverse proxy:

```nginx
location /webhook/ {
    proxy_pass http://localhost:8080/webhook/;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Без webhook (запуск вручную)

Если не хочешь открывать порт — просто запускай вручную по SSH:

```bash
ssh user@your-server
cd /opt/gorgia-agent
docker compose run --rm updater    # обновление цен
docker compose run --rm scraper    # полный парсинг
```

---

## Безопасность

- `ADMIN_SECRET` — единственный токен доступа. Храни его надёжно.
- middleware.ts блокирует все `/admin/*` роуты без cookie.
- API роуты `/api/admin/*` проверяют cookie или `Authorization: Bearer TOKEN`.
- В продакшене обязательно используй HTTPS.
- Если нужна мультипользовательность — замени на NextAuth или Clerk.
