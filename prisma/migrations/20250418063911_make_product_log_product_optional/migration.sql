-- DropForeignKey
ALTER TABLE `productlog` DROP FOREIGN KEY `ProductLog_productId_fkey`;

-- DropIndex
DROP INDEX `ProductLog_productId_fkey` ON `productlog`;

-- AlterTable
ALTER TABLE `productlog` MODIFY `productId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
