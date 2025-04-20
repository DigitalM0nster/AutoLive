/*
  Warnings:

  - Added the required column `count` to the `ImportLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `importlog` ADD COLUMN `count` INTEGER NOT NULL;
