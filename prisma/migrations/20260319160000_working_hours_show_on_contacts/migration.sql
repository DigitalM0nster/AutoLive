-- PickupPoint: режим работы и галочка «отображать на странице Контакты»
ALTER TABLE "pickup_point" ADD COLUMN "working_hours" VARCHAR(500);
ALTER TABLE "pickup_point" ADD COLUMN "show_on_contacts_page" BOOLEAN NOT NULL DEFAULT true;

-- BookingDepartment: режим работы и галочка «отображать на странице Контакты»
ALTER TABLE "booking_department" ADD COLUMN "working_hours" VARCHAR(500);
ALTER TABLE "booking_department" ADD COLUMN "show_on_contacts_page" BOOLEAN NOT NULL DEFAULT true;
