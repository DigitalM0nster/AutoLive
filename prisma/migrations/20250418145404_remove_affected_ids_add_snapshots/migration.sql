/*
  Warnings:

  - You are about to drop the column `affectedIds` on the `bulkactionlog` table. All the data in the column will be lost.
  - Added the required column `snapshots` to the `BulkActionLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `bulkactionlog` DROP COLUMN `affectedIds`,
    ADD COLUMN `snapshots` JSON NOT NULL;
