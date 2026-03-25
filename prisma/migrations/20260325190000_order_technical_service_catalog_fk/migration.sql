-- Заказ ссылается на запись ТО из справочника; колонка order_id у technical_service удаляется.

-- 1) Связь с заказа на существующую запись ТО
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "technical_service_id" INTEGER;

UPDATE "order" o
SET "technical_service_id" = ts."id"
FROM "technical_service" ts
WHERE ts."order_id" = o."id";

-- 2) Убираем старую связь technical_service -> order
ALTER TABLE "technical_service" DROP CONSTRAINT IF EXISTS "technical_service_order_id_fkey";

DROP INDEX IF EXISTS "technical_service_order_id_key";

ALTER TABLE "technical_service" DROP COLUMN IF EXISTS "order_id";

-- 3) FK и уникальность на стороне заказа
CREATE UNIQUE INDEX IF NOT EXISTS "order_technical_service_id_key" ON "order"("technical_service_id");

ALTER TABLE "order" DROP CONSTRAINT IF EXISTS "order_technical_service_id_fkey";

ALTER TABLE "order" ADD CONSTRAINT "order_technical_service_id_fkey" FOREIGN KEY ("technical_service_id") REFERENCES "technical_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
