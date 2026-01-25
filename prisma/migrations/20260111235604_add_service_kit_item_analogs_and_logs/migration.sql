/*
  Warnings:

  - You are about to drop the column `analog_product_id` on the `service_kit_item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "service_kit_item" DROP CONSTRAINT "service_kit_item_analog_product_id_fkey";

-- DropForeignKey
ALTER TABLE "service_kit_item" DROP CONSTRAINT "service_kit_item_kit_id_fkey";

-- AlterTable
ALTER TABLE "service_kit" ADD COLUMN     "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "service_kit_item" DROP COLUMN "analog_product_id";

-- CreateTable
CREATE TABLE "service_kit_item_analog" (
    "id" SERIAL NOT NULL,
    "service_kit_item_id" INTEGER NOT NULL,
    "analog_product_id" INTEGER NOT NULL,

    CONSTRAINT "service_kit_item_analog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_kit_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "service_kit_id" INTEGER NOT NULL,
    "adminSnapshot" JSONB,
    "serviceKitSnapshot" JSONB,

    CONSTRAINT "service_kit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_kit_item_analog_unique" ON "service_kit_item_analog"("service_kit_item_id", "analog_product_id");

-- AddForeignKey
ALTER TABLE "service_kit_item" ADD CONSTRAINT "service_kit_item_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "service_kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_kit_item_analog" ADD CONSTRAINT "service_kit_item_analog_service_kit_item_id_fkey" FOREIGN KEY ("service_kit_item_id") REFERENCES "service_kit_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_kit_item_analog" ADD CONSTRAINT "service_kit_item_analog_analog_product_id_fkey" FOREIGN KEY ("analog_product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_kit_log" ADD CONSTRAINT "service_kit_log_service_kit_id_fkey" FOREIGN KEY ("service_kit_id") REFERENCES "service_kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
