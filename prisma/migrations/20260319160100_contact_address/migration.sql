-- Таблица адресов контактной информации (несколько адресов с координатами, телефонами, почтами, режимом работы)
CREATE TABLE "contact_address" (
    "id" SERIAL NOT NULL,
    "contacts_content_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phones" TEXT[] NOT NULL DEFAULT '{}',
    "emails" TEXT[] NOT NULL DEFAULT '{}',
    "working_hours" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contact_address_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contact_address" ADD CONSTRAINT "contact_address_contacts_content_id_fkey" FOREIGN KEY ("contacts_content_id") REFERENCES "contacts_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
