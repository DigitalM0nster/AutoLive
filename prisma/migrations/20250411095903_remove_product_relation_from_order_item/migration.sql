/*
  Warnings:

  - You are about to drop the column `productId` on the `orderitem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_productId_fkey`;

-- DropIndex
DROP INDEX `OrderItem_productId_fkey` ON `orderitem`;

-- AlterTable
ALTER TABLE `orderitem` DROP COLUMN `productId`;
