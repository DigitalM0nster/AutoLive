/*
  Warnings:

  - Added the required column `contact_phone` to the `booking` table without a default value. This is not possible if the table is not empty.

*/
-- Шаг 1: Добавляем поле как nullable
ALTER TABLE "booking" ADD COLUMN "contact_phone" VARCHAR(255);

-- Шаг 2: Заполняем существующие записи
-- Сначала пытаемся взять телефон из связанного клиента
UPDATE "booking" 
SET "contact_phone" = "user"."phone"
FROM "user"
WHERE "booking"."client_id" = "user"."id" 
  AND "booking"."contact_phone" IS NULL
  AND "user"."phone" IS NOT NULL;

-- Затем извлекаем телефон из notes для незарегистрированных клиентов
UPDATE "booking"
SET "contact_phone" = TRIM(SUBSTRING("notes" FROM 'Телефон:\s*([^\n\r]+)'))
WHERE "contact_phone" IS NULL 
  AND "notes" IS NOT NULL
  AND "notes" ~ 'Телефон:\s*';

-- Если телефон всё ещё не найден, устанавливаем пустую строку (для безопасности)
UPDATE "booking"
SET "contact_phone" = ''
WHERE "contact_phone" IS NULL;

-- Шаг 3: Делаем поле обязательным
ALTER TABLE "booking" ALTER COLUMN "contact_phone" SET NOT NULL;
