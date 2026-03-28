-- AlterTable
ALTER TABLE "homepage_content" ADD COLUMN     "second_block_title" VARCHAR(255) NOT NULL DEFAULT 'Выбрать запчасти самостоятельно:';

-- AlterTable
ALTER TABLE "homepage_request" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
