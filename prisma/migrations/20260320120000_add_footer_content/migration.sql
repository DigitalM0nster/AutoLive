-- Контент подвала: телефон, блоки адресов, строка копирайта
CREATE TABLE "footer_content" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR(64),
    "pickup_title" VARCHAR(255),
    "pickup_lines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "service_title" VARCHAR(255),
    "service_lines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "copyright_line" VARCHAR(500),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "footer_content_pkey" PRIMARY KEY ("id")
);
