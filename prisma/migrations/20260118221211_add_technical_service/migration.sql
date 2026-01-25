-- CreateTable
CREATE TABLE "technical_service" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(255) NOT NULL,
    "order_id" INTEGER,
    "responsible_user_id" INTEGER,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "technical_service_order_id_key" ON "technical_service"("order_id");

-- AddForeignKey
ALTER TABLE "technical_service" ADD CONSTRAINT "technical_service_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_service" ADD CONSTRAINT "technical_service_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
