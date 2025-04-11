/*
  Warnings:

  - You are about to drop the column `product_id` on the `order_item` table. All the data in the column will be lost.
  - Added the required column `product_brand` to the `order_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_price` to the `order_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_sku` to the `order_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_title` to the `order_item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `order_item` DROP FOREIGN KEY `order_item_product_id_fkey`;

-- DropIndex
DROP INDEX `order_item_product_id_fkey` ON `order_item`;

-- AlterTable
ALTER TABLE `order_item` DROP COLUMN `product_id`,
    ADD COLUMN `productId` INTEGER NULL,
    ADD COLUMN `product_brand` VARCHAR(191) NOT NULL,
    ADD COLUMN `product_image` VARCHAR(191) NULL,
    ADD COLUMN `product_price` DOUBLE NOT NULL,
    ADD COLUMN `product_sku` VARCHAR(191) NOT NULL,
    ADD COLUMN `product_title` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
