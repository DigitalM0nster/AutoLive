/*
  Warnings:

  - You are about to drop the column `snapshot` on the `productlog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `productlog` DROP COLUMN `snapshot`,
    ADD COLUMN `snapshotAfter` JSON NULL,
    ADD COLUMN `snapshotBefore` JSON NULL;
