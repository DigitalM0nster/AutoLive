-- Связь заказа только с booking; отдельная сущность technical_service не используется
ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "order_technical_service_id_fkey";
DROP INDEX IF EXISTS "order_technical_service_id_key";
ALTER TABLE "order" DROP COLUMN IF EXISTS "technical_service_id";
DROP TABLE IF EXISTS "technical_service";
