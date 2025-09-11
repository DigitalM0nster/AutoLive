# Настройка Vercel Blob Storage

## Шаги для настройки:

### 1. Получите токен доступа
1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в настройки проекта
3. Найдите раздел "Environment Variables"
4. Добавьте переменную:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Получите токен из [Vercel Blob Dashboard](https://vercel.com/dashboard/blob)

### 2. Альтернативный способ получения токена
Если у вас нет доступа к Vercel Blob Dashboard, выполните команду:
```bash
npx vercel env add BLOB_READ_WRITE_TOKEN
```

### 3. Перезапустите деплой
После добавления переменной окружения перезапустите деплой на Vercel.

## Преимущества Vercel Blob Storage:
- ✅ Бесплатно до 1GB
- ✅ Быстрая загрузка и скачивание
- ✅ Автоматическое CDN
- ✅ Интеграция с Vercel
- ✅ Нет ограничений на размер файлов (как в Base64)
- ✅ Оптимизация изображений
