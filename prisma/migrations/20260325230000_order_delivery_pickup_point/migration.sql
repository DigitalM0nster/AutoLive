-- Адрес доставки заказа: пункт выдачи (альтернатива booking_department_id)
ALTER TABLE "order" ADD COLUMN "delivery_pickup_point_id" INTEGER;

ALTER TABLE "order" ADD CONSTRAINT "order_delivery_pickup_point_id_fkey"
  FOREIGN KEY ("delivery_pickup_point_id") REFERENCES "pickup_point"("id") ON DELETE SET NULL ON UPDATE CASCADE;
