/*
  Warnings:

  - Made the column `department_id` on table `product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `product_department_id_fkey`;

-- DropIndex
DROP INDEX `product_department_id_fkey` ON `product`;

-- AlterTable
ALTER TABLE `product` MODIFY `department_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `product_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
