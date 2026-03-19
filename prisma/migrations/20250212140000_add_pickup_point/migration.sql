-- CreateTable
CREATE TABLE "pickup_point" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255),
    "address" TEXT NOT NULL,
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_point_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_point_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "pickup_point_id" INTEGER NOT NULL,
    "admin_snapshot" JSONB,
    "pickup_point_snapshot" JSONB,

    CONSTRAINT "pickup_point_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pickup_point_log" ADD CONSTRAINT "pickup_point_log_pickup_point_id_fkey" FOREIGN KEY ("pickup_point_id") REFERENCES "pickup_point"("id") ON DELETE CASCADE ON UPDATE CASCADE;
