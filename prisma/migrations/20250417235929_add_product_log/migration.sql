-- CreateTable
CREATE TABLE `ProductLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `productId` INTEGER NULL,
    `productSku` VARCHAR(191) NULL,
    `productTitle` VARCHAR(191) NULL,
    `productBrand` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `departmentId` INTEGER NULL,
    `message` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductLog` ADD CONSTRAINT `ProductLog_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
