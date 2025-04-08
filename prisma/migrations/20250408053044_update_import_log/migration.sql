/*
  Warnings:

  - You are about to drop the column `adminId` on the `importlog` table. All the data in the column will be lost.
  - You are about to drop the column `filename` on the `importlog` table. All the data in the column will be lost.
  - Added the required column `created` to the `ImportLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `ImportLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated` to the `ImportLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ImportLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `importlog` DROP FOREIGN KEY `ImportLog_adminId_fkey`;

-- DropIndex
DROP INDEX `ImportLog_adminId_fkey` ON `importlog`;

-- AlterTable
ALTER TABLE `importlog` DROP COLUMN `adminId`,
    DROP COLUMN `filename`,
    ADD COLUMN `created` INTEGER NOT NULL,
    ADD COLUMN `fileName` VARCHAR(191) NOT NULL,
    ADD COLUMN `updated` INTEGER NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `ImportLog` ADD CONSTRAINT `ImportLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
