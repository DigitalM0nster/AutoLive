-- AlterTable
ALTER TABLE "public"."order" ADD COLUMN     "confirmation_date" TIMESTAMP(0),
ADD COLUMN     "final_delivery_date" TIMESTAMP(0);
