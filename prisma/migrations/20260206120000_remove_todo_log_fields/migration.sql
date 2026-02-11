-- Завершение миграции: удаление полей с TODO из таблиц логов.
-- Данные уже перенесены в Json-поля (user_snapshot, department_snapshot и т.д.).

-- bulk_action_log: удаляем старые поля
ALTER TABLE "bulk_action_log" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "bulk_action_log" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE "bulk_action_log" DROP COLUMN IF EXISTS "snapshots";

-- import_log: удаляем старые поля
ALTER TABLE "import_log" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "import_log" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE "import_log" DROP COLUMN IF EXISTS "snapshots";
ALTER TABLE "import_log" DROP COLUMN IF EXISTS "snapshot_before";
ALTER TABLE "import_log" DROP COLUMN IF EXISTS "snapshot_after";

-- product_log: добавляем новые Json-поля, затем удаляем старые
ALTER TABLE "product_log" ADD COLUMN IF NOT EXISTS "product_snapshot_before" JSONB;
ALTER TABLE "product_log" ADD COLUMN IF NOT EXISTS "product_snapshot_after" JSONB;

ALTER TABLE "product_log" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "product_log" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE "product_log" DROP COLUMN IF EXISTS "product_id";
ALTER TABLE "product_log" DROP COLUMN IF EXISTS "snapshot_before";
ALTER TABLE "product_log" DROP COLUMN IF EXISTS "snapshot_after";

-- user_log: удаляем старые поля
ALTER TABLE "user_log" DROP COLUMN IF EXISTS "admin_id";
ALTER TABLE "user_log" DROP COLUMN IF EXISTS "target_user_id";
ALTER TABLE "user_log" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE "user_log" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "user_log" DROP COLUMN IF EXISTS "snapshot_before";
ALTER TABLE "user_log" DROP COLUMN IF EXISTS "snapshot_after";
