-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "car_model" VARCHAR(255),
ADD COLUMN     "supplier_delivery_date" TIMESTAMP(0),
ADD COLUMN     "vin_code" VARCHAR(255);
