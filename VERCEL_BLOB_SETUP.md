# Хранилище файлов (Vercel Blob) — локально и production

Загрузка картинок и документов **везде одинаковая**: файлы уходят в **Vercel Blob**, в БД сохраняется публичный URL (`https://….blob.vercel-storage.com/...`).

Локальная папка `public/uploads/` больше **не используется** для новых загрузок.

---

## 1. Создать Blob Store в Vercel

1. [Vercel Dashboard](https://vercel.com/dashboard) → проект **AutoLive**
2. Вкладка **Storage** → **Create Database / Store** → **Blob**
3. После создания появится переменная `BLOB_READ_WRITE_TOKEN` (или добавьте вручную)

## 2. Production (Vercel)

**Settings → Environment Variables:**

| Name | Environments |
|------|----------------|
| `BLOB_READ_WRITE_TOKEN` | Production (и Preview, если нужны загрузки на превью) |

После добавления — **Redeploy**.

## 3. Локальная разработка (XAMPP / `npm run dev`)

Тот же токен, что и на production:

### Вариант A — подтянуть с Vercel (рекомендуется)

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.local
```

В `.env.local` появится `BLOB_READ_WRITE_TOKEN=...`

### Вариант B — вручную

Скопируйте значение `BLOB_READ_WRITE_TOKEN` из Vercel Dashboard в файл `.env.local` в корне проекта:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Перезапустите `npm run dev`.

## 4. Проверка

1. Админка → Акции → загрузить картинку
2. В DevTools у `<img>` должен быть URL вида `https://….public.blob.vercel-storage.com/...`
3. Тот же URL открывается на сайте `/promotions`

Если токена нет — API вернёт понятную ошибку про `BLOB_READ_WRITE_TOKEN`.

## Зачем так

| Раньше | Сейчас |
|--------|--------|
| Локально → `/uploads/...` | Везде → Blob URL |
| Vercel → base64 в БД | Везде → Blob URL |
| Разное поведение | Одно поведение |

Старые записи с `data:image/...` (base64) и `/uploads/...` в БД по-прежнему отображаются, пока не перезагрузите файл.
