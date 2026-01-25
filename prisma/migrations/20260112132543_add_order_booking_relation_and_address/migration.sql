/*
  Warnings:

  - A unique constraint covering the columns `[booking_id]` on the table `order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "order_id" INTEGER;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "booking_department_id" INTEGER,
ADD COLUMN     "booking_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "order_booking_id_key" ON "order"("booking_id");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_booking_department_id_fkey" FOREIGN KEY ("booking_department_id") REFERENCES "booking_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
