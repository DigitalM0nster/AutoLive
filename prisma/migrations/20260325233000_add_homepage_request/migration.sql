-- Заявки с главной (форма «Оставить заявку»), отдельно от заказов и записей на ТО

CREATE TYPE "HomepageRequestStatus" AS ENUM ('new', 'processed');

CREATE TABLE "homepage_request" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,
    "status" "HomepageRequestStatus" NOT NULL DEFAULT 'new',
    "payload" JSONB NOT NULL,

    CONSTRAINT "homepage_request_pkey" PRIMARY KEY ("id")
);
