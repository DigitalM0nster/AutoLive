-- DropForeignKey
ALTER TABLE "public"."order" DROP CONSTRAINT "order_created_by_fkey";

-- AlterTable
ALTER TABLE "public"."order" ALTER COLUMN "created_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."order" ADD CONSTRAINT "order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
