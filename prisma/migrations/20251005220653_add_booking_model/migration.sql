-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateTable
CREATE TABLE "public"."booking" (
    "id" SERIAL NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" VARCHAR(10) NOT NULL,
    "client_id" INTEGER,
    "manager_id" INTEGER NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."booking" ADD CONSTRAINT "booking_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking" ADD CONSTRAINT "booking_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
