/*
  Warnings:

  - You are about to drop the `order_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_kit_item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `order_item` DROP FOREIGN KEY `order_item_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_item` DROP FOREIGN KEY `order_item_productId_fkey`;

-- DropForeignKey
ALTER TABLE `service_kit_item` DROP FOREIGN KEY `service_kit_item_analog_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `service_kit_item` DROP FOREIGN KEY `service_kit_item_kit_id_fkey`;

-- DropForeignKey
ALTER TABLE `service_kit_item` DROP FOREIGN KEY `service_kit_item_product_id_fkey`;

-- DropTable
DROP TABLE `order_item`;

-- DropTable
DROP TABLE `service_kit_item`;

-- CreateTable
CREATE TABLE `ServiceKitItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kit_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `analog_product_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_sku` VARCHAR(191) NOT NULL,
    `product_title` VARCHAR(191) NOT NULL,
    `product_price` DOUBLE NOT NULL,
    `product_brand` VARCHAR(191) NOT NULL,
    `product_image` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `productId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceKitItem` ADD CONSTRAINT `ServiceKitItem_kit_id_fkey` FOREIGN KEY (`kit_id`) REFERENCES `service_kit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceKitItem` ADD CONSTRAINT `ServiceKitItem_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceKitItem` ADD CONSTRAINT `ServiceKitItem_analog_product_id_fkey` FOREIGN KEY (`analog_product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
