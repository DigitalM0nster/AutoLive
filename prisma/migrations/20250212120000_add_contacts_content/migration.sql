-- CreateTable
CREATE TABLE "contacts_content" (
    "id" SERIAL NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(255),
    "email" VARCHAR(255),
    "working_hours" VARCHAR(500),
    "map_note" VARCHAR(500),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_content_pkey" PRIMARY KEY ("id")
);
