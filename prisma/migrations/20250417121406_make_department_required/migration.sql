-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `product_department_id_fkey`;

-- DropIndex
DROP INDEX `product_department_id_fkey` ON `product`;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
