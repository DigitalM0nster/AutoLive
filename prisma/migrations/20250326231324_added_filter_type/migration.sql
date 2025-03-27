-- AlterTable
ALTER TABLE `filter` ADD COLUMN `type` ENUM('select', 'multi', 'range', 'boolean') NOT NULL DEFAULT 'select';
