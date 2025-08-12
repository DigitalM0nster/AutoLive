/*
  Warnings:

  - You are about to drop the column `createdAt` on the `supplier` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `bulkactionlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departmentcategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `importlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orderitem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `priceformat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promotion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `servicekititem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `smscode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userlog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `bulkactionlog` DROP FOREIGN KEY `BulkActionLog_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `bulkactionlog` DROP FOREIGN KEY `BulkActionLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `departmentcategory` DROP FOREIGN KEY `DepartmentCategory_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `departmentcategory` DROP FOREIGN KEY `DepartmentCategory_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `importlog` DROP FOREIGN KEY `ImportLog_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `importlog` DROP FOREIGN KEY `ImportLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `orderitem` DROP FOREIGN KEY `OrderItem_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `priceformat` DROP FOREIGN KEY `PriceFormat_supplierId_fkey`;

-- DropForeignKey
ALTER TABLE `productlog` DROP FOREIGN KEY `ProductLog_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `productlog` DROP FOREIGN KEY `ProductLog_productId_fkey`;

-- DropForeignKey
ALTER TABLE `productlog` DROP FOREIGN KEY `ProductLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `servicekititem` DROP FOREIGN KEY `ServiceKitItem_analog_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `servicekititem` DROP FOREIGN KEY `ServiceKitItem_kit_id_fkey`;

-- DropForeignKey
ALTER TABLE `servicekititem` DROP FOREIGN KEY `ServiceKitItem_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `userlog` DROP FOREIGN KEY `UserLog_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `userlog` DROP FOREIGN KEY `UserLog_departmentId_fkey`;

-- DropForeignKey
ALTER TABLE `userlog` DROP FOREIGN KEY `UserLog_targetUserId_fkey`;

-- DropForeignKey
ALTER TABLE `userlog` DROP FOREIGN KEY `UserLog_userId_fkey`;

-- AlterTable
ALTER TABLE `category` MODIFY `title` VARCHAR(255) NOT NULL,
    MODIFY `image` VARCHAR(255) NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- AlterTable
ALTER TABLE `department` MODIFY `name` VARCHAR(255) NOT NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- AlterTable
ALTER TABLE `filter` MODIFY `title` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `filter_value` MODIFY `value` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `markup_rule` MODIFY `brand` VARCHAR(255) NULL,
    MODIFY `price_from` FLOAT NOT NULL DEFAULT 0,
    MODIFY `price_to` FLOAT NULL,
    MODIFY `markup` FLOAT NOT NULL DEFAULT 1,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- AlterTable
ALTER TABLE `order` MODIFY `title` VARCHAR(255) NOT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- AlterTable
ALTER TABLE `product` MODIFY `title` VARCHAR(255) NOT NULL,
    MODIFY `sku` VARCHAR(255) NOT NULL,
    MODIFY `price` FLOAT NOT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `image` VARCHAR(255) NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `brand` VARCHAR(255) NOT NULL DEFAULT 'UNKNOWN',
    MODIFY `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `supplier_price` FLOAT NULL;

-- AlterTable
ALTER TABLE `service_kit` MODIFY `title` VARCHAR(255) NOT NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `image` VARCHAR(255) NULL,
    MODIFY `price` FLOAT NOT NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- AlterTable
ALTER TABLE `supplier` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `name` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `avatar`,
    MODIFY `first_name` VARCHAR(255) NULL,
    MODIFY `last_name` VARCHAR(255) NULL,
    MODIFY `phone` VARCHAR(255) NOT NULL,
    MODIFY `password` VARCHAR(255) NOT NULL,
    MODIFY `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    MODIFY `middle_name` VARCHAR(255) NULL;

-- DropTable
DROP TABLE `bulkactionlog`;

-- DropTable
DROP TABLE `departmentcategory`;

-- DropTable
DROP TABLE `importlog`;

-- DropTable
DROP TABLE `orderitem`;

-- DropTable
DROP TABLE `priceformat`;

-- DropTable
DROP TABLE `productlog`;

-- DropTable
DROP TABLE `promotion`;

-- DropTable
DROP TABLE `servicekititem`;

-- DropTable
DROP TABLE `smscode`;

-- DropTable
DROP TABLE `userlog`;

-- CreateTable
CREATE TABLE `order_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_sku` VARCHAR(255) NOT NULL,
    `product_title` VARCHAR(255) NOT NULL,
    `product_price` FLOAT NOT NULL,
    `product_brand` VARCHAR(255) NOT NULL,
    `product_image` VARCHAR(255) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `department_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    UNIQUE INDEX `department_category_department_id_category_id_unique`(`department_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_kit_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kit_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `analog_product_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `__drizzle_migrations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `hash` TEXT NOT NULL,
    `created_at` BIGINT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bulk_action_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `department_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `action` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `snapshots` LONGTEXT NOT NULL,
    `count` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `actions` TEXT NOT NULL,
    `message` TEXT NULL,
    `user_id` INTEGER NULL,
    `department_id` INTEGER NOT NULL,
    `snapshot_before` TEXT NULL,
    `snapshot_after` TEXT NULL,
    `admin_snapshot` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `created` INTEGER NOT NULL,
    `updated` INTEGER NOT NULL,
    `skipped` INTEGER NOT NULL DEFAULT 0,
    `image_policy` VARCHAR(255) NULL,
    `markup_summary` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `user_id` INTEGER NULL,
    `message` TEXT NULL,
    `count` INTEGER NOT NULL,
    `department_id` INTEGER NULL,
    `snapshots` LONGTEXT NULL,
    `snapshot_before` LONGTEXT NULL,
    `snapshot_after` LONGTEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_format` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier_id` INTEGER NOT NULL,
    `columns` LONGTEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `action` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `user_id` INTEGER NULL,
    `department_id` INTEGER NULL,
    `product_id` INTEGER NULL,
    `snapshot_before` LONGTEXT NULL,
    `snapshot_after` LONGTEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(255) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `expires_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `action` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `admin_id` INTEGER NULL,
    `target_user_id` INTEGER NULL,
    `department_id` INTEGER NULL,
    `snapshot_before` TEXT NULL,
    `snapshot_after` TEXT NULL,
    `admin_snapshot` TEXT NULL,
    `user_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChangeLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `entityType` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `snapshotBefore` JSON NULL,
    `snapshotAfter` JSON NULL,
    `adminSnapshot` JSON NULL,
    `entityId` INTEGER NULL,
    `adminId` INTEGER NULL,
    `departmentId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_item` ADD CONSTRAINT `order_item_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_category` ADD CONSTRAINT `department_category_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `department_category` ADD CONSTRAINT `department_category_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_kit_item` ADD CONSTRAINT `service_kit_item_kit_id_fkey` FOREIGN KEY (`kit_id`) REFERENCES `service_kit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_kit_item` ADD CONSTRAINT `service_kit_item_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_kit_item` ADD CONSTRAINT `service_kit_item_analog_product_id_fkey` FOREIGN KEY (`analog_product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
CREATE UNIQUE INDEX `category_title_unique` ON `category`(`title`);
DROP INDEX `category_title_key` ON `category`;

-- RedefineIndex
CREATE UNIQUE INDEX `product_analog_product_id_analog_id_unique` ON `product_analog`(`product_id`, `analog_id`);
DROP INDEX `product_analog_product_id_analog_id_key` ON `product_analog`;

-- RedefineIndex
CREATE UNIQUE INDEX `product_filter_value_product_id_filter_value_id_unique` ON `product_filter_value`(`product_id`, `filter_value_id`);
DROP INDEX `product_filter_value_product_id_filter_value_id_key` ON `product_filter_value`;

-- RedefineIndex
CREATE UNIQUE INDEX `user_phone_unique` ON `user`(`phone`);
DROP INDEX `user_phone_key` ON `user`;
