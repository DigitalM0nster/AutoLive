# Простая система загрузки файлов

## Обзор

Простая система загрузки файлов без внешних зависимостей. Автоматически определяет среду выполнения и использует Base64 для Vercel или файловую систему для собственного сервера. Все операции с файлами выполняются через единую утилиту `src/lib/simpleFileUpload.ts`.

## Основные функции

### `uploadFile(file, options)`
Загружает файл (Base64 для Vercel, файлы для собственного сервера).

**Параметры:**
- `file: File` - файл для загрузки
- `options: UploadOptions` - опции загрузки
  - `prefix?: string` - префикс для имени файла (например, "product", "category")
  - `entityId?: number` - ID сущности для уникальности имени

**Возвращает:** `Promise<UploadResult>`

### `validateFile(file, maxSize, allowedTypes)`
Валидирует файл перед загрузкой.

**Параметры:**
- `file: File` - файл для валидации
- `maxSize?: number` - максимальный размер в байтах (по умолчанию 5MB)
- `allowedTypes?: string[]` - разрешенные типы файлов

**Возвращает:** `{ isValid: boolean; error?: string }`

### `deleteFile(url)`
Удаляет файл (Base64 не удаляется, файлы на сервере удаляются).

**Параметры:**
- `url: string` - URL файла для удаления

**Возвращает:** `Promise<boolean>`

## Использование в API

### Пример для товаров:
```typescript
import { uploadFile, validateFile } from "@/lib/simpleFileUpload";

// Валидируем файл
const validation = validateFile(imageFile);
if (!validation.isValid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
}

// Загружаем файл
const uploadResult = await uploadFile(imageFile, {
    prefix: "product",
    entityId: productId,
    access: "public",
});

// Сохраняем URL в БД
updateData.image = uploadResult.url;
```

### Пример для категорий:
```typescript
const uploadResult = await uploadFile(imageFile, {
    prefix: "category",
    entityId: categoryId,
    access: "public",
});
```

### Пример для аватаров:
```typescript
const uploadResult = await uploadFile(avatarFile, {
    prefix: "avatar",
    entityId: userId,
    access: "public",
});
```

## Обновленные файлы

✅ **API файлы:**
- `src/app/api/upload/route.ts` - основной API загрузки
- `src/app/api/products/[productId]/route.ts` - загрузка изображений товаров
- `src/app/api/categories/[categoryId]/route.ts` - загрузка изображений категорий
- `src/app/api/admin/profile/update/route.tsx` - загрузка аватаров

## Преимущества простой системы

1. **Нет внешних зависимостей** - только встроенные Node.js модули
2. **Автоматическое определение среды** - Vercel vs собственный сервер
3. **Простота** - один файл, понятный код
4. **Легкая миграция** - просто меняете переменную окружения
5. **Работает везде** - Vercel, собственный сервер, любая платформа

## Как это работает

1. **На Vercel** (`VERCEL=1`) - использует Base64
2. **На собственном сервере** - использует файловую систему
3. **Автоматически** - никаких настроек не нужно

## Переход на собственный сервер

Просто уберите переменную `VERCEL=1` из окружения - система автоматически переключится на файловую систему!
