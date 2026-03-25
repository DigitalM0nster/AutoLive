-- Убираем ответственного у записи ТО: клиент и запись — в Order и Booking
ALTER TABLE "technical_service" DROP CONSTRAINT IF EXISTS "technical_service_responsible_user_id_fkey";
ALTER TABLE "technical_service" DROP COLUMN IF EXISTS "responsible_user_id";
