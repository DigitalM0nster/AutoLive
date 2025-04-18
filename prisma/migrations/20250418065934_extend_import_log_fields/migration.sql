-- AlterTable
ALTER TABLE `importlog` ADD COLUMN `imagePolicy` VARCHAR(191) NULL,
    ADD COLUMN `markupSummary` VARCHAR(191) NULL,
    ADD COLUMN `skipped` INTEGER NOT NULL DEFAULT 0;
