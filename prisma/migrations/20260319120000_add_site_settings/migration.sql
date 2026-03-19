-- CreateTable
CREATE TABLE "site_settings" (
    "id" SERIAL NOT NULL,
    "logo_url" VARCHAR(500),
    "favicon_url" VARCHAR(500),
    "color_grey" VARCHAR(32),
    "color_grey_light" VARCHAR(32),
    "color_green" VARCHAR(32),
    "color_white" VARCHAR(32),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
