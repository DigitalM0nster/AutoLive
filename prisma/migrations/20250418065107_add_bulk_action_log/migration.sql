-- CreateTable
CREATE TABLE `BulkActionLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `departmentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `action` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `affectedIds` JSON NOT NULL,
    `count` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BulkActionLog` ADD CONSTRAINT `BulkActionLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BulkActionLog` ADD CONSTRAINT `BulkActionLog_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
