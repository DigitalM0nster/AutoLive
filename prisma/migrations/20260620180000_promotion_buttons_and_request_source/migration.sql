-- Кнопки акций (JSON) и источник заявки с формы
CREATE TYPE "SiteFormRequestSource" AS ENUM ('homepage', 'promotion');

ALTER TABLE "Promotion" ADD COLUMN "buttons_json" TEXT;

UPDATE "Promotion"
SET "buttons_json" = json_build_array(
  json_build_object(
    'id', 'legacy-1',
    'type', 'link',
    'label', "buttonText",
    'href', "buttonLink",
    'openInNewTab', false
  )
)::text
WHERE "buttonText" IS NOT NULL
  AND TRIM("buttonText") <> ''
  AND "buttonLink" IS NOT NULL
  AND TRIM("buttonLink") <> '';

ALTER TABLE "Promotion" DROP COLUMN "buttonText";
ALTER TABLE "Promotion" DROP COLUMN "buttonLink";

ALTER TABLE "homepage_request" ADD COLUMN "source_type" "SiteFormRequestSource" NOT NULL DEFAULT 'homepage';
ALTER TABLE "homepage_request" ADD COLUMN "source_label" VARCHAR(255);
ALTER TABLE "homepage_request" ADD COLUMN "promotion_id" INTEGER;

ALTER TABLE "homepage_request"
  ADD CONSTRAINT "homepage_request_promotion_id_fkey"
  FOREIGN KEY ("promotion_id") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "homepage_request_source_type_idx" ON "homepage_request"("source_type");
CREATE INDEX "homepage_request_promotion_id_idx" ON "homepage_request"("promotion_id");

UPDATE "homepage_request"
SET "source_label" = 'Главная страница'
WHERE "source_type" = 'homepage' AND "source_label" IS NULL;
