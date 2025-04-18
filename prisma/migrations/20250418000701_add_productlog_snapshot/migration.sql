/*
  Warnings:

  - You are about to drop the column `productBrand` on the `productlog` table. All the data in the column will be lost.
  - You are about to drop the column `productSku` on the `productlog` table. All the data in the column will be lost.
  - You are about to drop the column `productTitle` on the `productlog` table. All the data in the column will be lost.
  - Made the column `productId` on table `productlog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `productlog` DROP COLUMN `productBrand`,
    DROP COLUMN `productSku`,
    DROP COLUMN `productTitle`,
    ADD COLUMN `snapshot` JSON NULL,
    MODIFY `productId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
