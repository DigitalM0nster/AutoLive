-- AlterTable
ALTER TABLE `importlog` ADD COLUMN `snapshotAfter` JSON NULL,
    ADD COLUMN `snapshotBefore` JSON NULL;
