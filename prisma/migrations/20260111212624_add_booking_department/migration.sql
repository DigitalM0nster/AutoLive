/*
  Warnings:

  - You are about to drop the column `department_id` on the `booking` table. All the data in the column will be lost.
  - Added the required column `booking_department_id` to the `booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "booking" DROP CONSTRAINT "booking_department_id_fkey";

-- AlterTable
ALTER TABLE "booking" DROP COLUMN "department_id",
ADD COLUMN     "booking_department_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "booking_department" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_department_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_booking_department_id_fkey" FOREIGN KEY ("booking_department_id") REFERENCES "booking_department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
