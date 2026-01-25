/*
  Warnings:

  - Added the required column `department_id` to the `booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "booking" DROP CONSTRAINT "booking_manager_id_fkey";

-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "department_id" INTEGER NOT NULL,
ALTER COLUMN "manager_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "booking_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "booking_id" INTEGER NOT NULL,
    "adminSnapshot" JSONB,
    "bookingSnapshot" JSONB,
    "managerSnapshot" JSONB,
    "departmentSnapshot" JSONB,

    CONSTRAINT "booking_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_log" ADD CONSTRAINT "booking_log_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
