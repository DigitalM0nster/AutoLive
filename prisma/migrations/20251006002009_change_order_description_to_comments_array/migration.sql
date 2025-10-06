/*
  Warnings:

  - You are about to drop the column `description` on the `order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."order" DROP COLUMN "description",
ADD COLUMN     "comments" TEXT[];
