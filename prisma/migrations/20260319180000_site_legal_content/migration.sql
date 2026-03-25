-- Юридические документы (ПДн, cookies) — отдельно от подвала сайта

CREATE TABLE "site_legal_content" (
    "id" SERIAL NOT NULL,
    "privacy_policy_title" VARCHAR(255),
    "privacy_policy_file_url" VARCHAR(1000),
    "cookies_policy_title" VARCHAR(255),
    "cookies_policy_file_url" VARCHAR(1000),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_legal_content_pkey" PRIMARY KEY ("id")
);
