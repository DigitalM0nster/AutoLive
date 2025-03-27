/*
  Warnings:

  - You are about to drop the column `slug` on the `category` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `category_slug_key` ON `category`;

-- AlterTable
ALTER TABLE `category` DROP COLUMN `slug`;
