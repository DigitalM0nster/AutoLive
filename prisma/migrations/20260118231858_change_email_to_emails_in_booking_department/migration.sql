/*
  Warnings:

  - You are about to drop the column `email` on the `booking_department` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "booking_department" DROP COLUMN "email",
ADD COLUMN     "emails" TEXT[];
