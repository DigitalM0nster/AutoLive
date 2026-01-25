/*
  Warnings:

  - You are about to drop the column `phone` on the `booking_department` table. All the data in the column will be lost.
  - Made the column `address` on table `booking_department` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "booking_department" DROP COLUMN "phone",
ADD COLUMN     "phones" TEXT[],
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "address" SET NOT NULL;

-- CreateTable
CREATE TABLE "booking_department_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "booking_department_id" INTEGER NOT NULL,
    "adminSnapshot" JSONB,
    "bookingDepartmentSnapshot" JSONB,

    CONSTRAINT "booking_department_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "booking_department_log" ADD CONSTRAINT "booking_department_log_booking_department_id_fkey" FOREIGN KEY ("booking_department_id") REFERENCES "booking_department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
