-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('superadmin', 'admin', 'manager', 'client');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('unverified', 'verified');

-- CreateEnum
CREATE TYPE "public"."FilterType" AS ENUM ('select', 'multi', 'range', 'boolean');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- CreateTable
CREATE TABLE "public"."user" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "middle_name" VARCHAR(255),
    "role" "public"."Role" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'unverified',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department_id" INTEGER,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "image" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(255) NOT NULL DEFAULT 'UNKNOWN',
    "price" DOUBLE PRECISION NOT NULL,
    "supplier_price" DOUBLE PRECISION,
    "description" TEXT,
    "image" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" INTEGER,
    "department_id" INTEGER NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."filter" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" "public"."FilterType" NOT NULL DEFAULT 'select',
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."filter_value" (
    "id" SERIAL NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "filter_id" INTEGER NOT NULL,

    CONSTRAINT "filter_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_filter_value" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "filter_value_id" INTEGER NOT NULL,

    CONSTRAINT "product_filter_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_analog" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "analog_id" INTEGER NOT NULL,

    CONSTRAINT "product_analog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_kit" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(255),
    "price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_kit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manager_id" INTEGER NOT NULL,
    "department_id" INTEGER,
    "client_id" INTEGER NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_item" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_sku" VARCHAR(255) NOT NULL,
    "product_title" VARCHAR(255) NOT NULL,
    "product_price" DOUBLE PRECISION NOT NULL,
    "product_brand" VARCHAR(255) NOT NULL,
    "product_image" VARCHAR(255),
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."department" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."department_category" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "department_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."markup_rule" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER,
    "category_id" INTEGER,
    "brand" VARCHAR(255),
    "price_from" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_to" DOUBLE PRECISION,
    "markup" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markup_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_kit_item" (
    "id" SERIAL NOT NULL,
    "kit_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "analog_product_id" INTEGER,

    CONSTRAINT "service_kit_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."__drizzle_migrations" (
    "id" BIGSERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" BIGINT,

    CONSTRAINT "__drizzle_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bulk_action_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "count" INTEGER NOT NULL,
    "user_snapshot" JSONB,
    "department_snapshot" JSONB,
    "products_snapshot" JSONB,
    "user_id" INTEGER,
    "department_id" INTEGER,
    "snapshots" TEXT NOT NULL,

    CONSTRAINT "bulk_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."department_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actions" TEXT NOT NULL,
    "message" TEXT,
    "user_id" INTEGER,
    "department_id" INTEGER NOT NULL,
    "snapshot_before" TEXT,
    "snapshot_after" TEXT,
    "admin_snapshot" TEXT,
    "user_snapshot" JSONB,
    "department_snapshot" JSONB,

    CONSTRAINT "department_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."import_log" (
    "id" SERIAL NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "image_policy" VARCHAR(255),
    "markup_summary" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "count" INTEGER NOT NULL,
    "user_snapshot" JSONB,
    "department_snapshot" JSONB,
    "products_snapshot" JSONB,
    "user_id" INTEGER,
    "department_id" INTEGER,
    "snapshots" TEXT,
    "snapshot_before" TEXT,
    "snapshot_after" TEXT,

    CONSTRAINT "import_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."price_format" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "columns" TEXT NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_format_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "user_snapshot" JSONB,
    "department_snapshot" JSONB,
    "product_snapshot" JSONB,
    "user_id" INTEGER,
    "department_id" INTEGER,
    "product_id" INTEGER,
    "snapshot_before" TEXT,
    "snapshot_after" TEXT,

    CONSTRAINT "product_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sms_code" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Promotion" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image" VARCHAR(255),
    "buttonText" VARCHAR(255),
    "buttonLink" VARCHAR(255),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "admin_snapshot" JSONB,
    "target_user_snapshot" JSONB,
    "department_snapshot" JSONB,
    "admin_id" INTEGER,
    "target_user_id" INTEGER,
    "department_id" INTEGER,
    "user_id" INTEGER,
    "snapshot_before" TEXT,
    "snapshot_after" TEXT,

    CONSTRAINT "user_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChangeLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "message" TEXT,
    "snapshotBefore" JSONB,
    "snapshotAfter" JSONB,
    "adminSnapshot" JSONB,
    "actions" JSONB,
    "entityId" INTEGER,
    "adminId" INTEGER,
    "departmentId" INTEGER,

    CONSTRAINT "ChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_unique" ON "public"."user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "category_title_unique" ON "public"."category"("title");

-- CreateIndex
CREATE INDEX "product_title_idx" ON "public"."product"("title");

-- CreateIndex
CREATE INDEX "product_sku_idx" ON "public"."product"("sku");

-- CreateIndex
CREATE INDEX "product_brand_idx" ON "public"."product"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "product_filter_value_product_id_filter_value_id_unique" ON "public"."product_filter_value"("product_id", "filter_value_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_analog_product_id_analog_id_unique" ON "public"."product_analog"("product_id", "analog_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_category_department_id_category_id_unique" ON "public"."department_category"("department_id", "category_id");

-- AddForeignKey
ALTER TABLE "public"."user" ADD CONSTRAINT "user_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product" ADD CONSTRAINT "product_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."filter" ADD CONSTRAINT "filter_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."filter_value" ADD CONSTRAINT "filter_value_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "public"."filter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_filter_value" ADD CONSTRAINT "product_filter_value_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_filter_value" ADD CONSTRAINT "product_filter_value_filter_value_id_fkey" FOREIGN KEY ("filter_value_id") REFERENCES "public"."filter_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_analog" ADD CONSTRAINT "product_analog_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_analog" ADD CONSTRAINT "product_analog_analog_id_fkey" FOREIGN KEY ("analog_id") REFERENCES "public"."product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order" ADD CONSTRAINT "order_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order" ADD CONSTRAINT "order_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order" ADD CONSTRAINT "order_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_category" ADD CONSTRAINT "department_category_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_category" ADD CONSTRAINT "department_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."markup_rule" ADD CONSTRAINT "markup_rule_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."markup_rule" ADD CONSTRAINT "markup_rule_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_kit_item" ADD CONSTRAINT "service_kit_item_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."service_kit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_kit_item" ADD CONSTRAINT "service_kit_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_kit_item" ADD CONSTRAINT "service_kit_item_analog_product_id_fkey" FOREIGN KEY ("analog_product_id") REFERENCES "public"."product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
