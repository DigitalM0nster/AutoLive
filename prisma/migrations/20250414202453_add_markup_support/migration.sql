-- AlterTable
ALTER TABLE `product` ADD COLUMN `supplier_price` DOUBLE NULL;

-- CreateTable
CREATE TABLE `markup_rule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `department_id` INTEGER NULL,
    `category_id` INTEGER NULL,
    `brand` VARCHAR(191) NULL,
    `price_from` DOUBLE NOT NULL DEFAULT 0,
    `price_to` DOUBLE NULL,
    `markup` DOUBLE NOT NULL DEFAULT 1.0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `markup_rule` ADD CONSTRAINT `markup_rule_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `markup_rule` ADD CONSTRAINT `markup_rule_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
