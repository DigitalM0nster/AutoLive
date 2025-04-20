-- AlterTable
ALTER TABLE `importlog` ADD COLUMN `departmentId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `ImportLog` ADD CONSTRAINT `ImportLog_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
