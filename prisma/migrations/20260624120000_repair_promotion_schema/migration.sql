-- Восстановление схемы Promotion на production, если миграции не применились полностью (P2022 ColumnNotFound)
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "startDate" DATE;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "endDate" DATE;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "buttons_json" TEXT;

-- Перенос legacy-кнопок, если старые колонки ещё есть
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'Promotion'
			AND column_name = 'buttonText'
	) THEN
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
		WHERE "buttons_json" IS NULL
			AND "buttonText" IS NOT NULL
			AND TRIM("buttonText") <> ''
			AND "buttonLink" IS NOT NULL
			AND TRIM("buttonLink") <> '';
	END IF;
END $$;

ALTER TABLE "Promotion" DROP COLUMN IF EXISTS "buttonText";
ALTER TABLE "Promotion" DROP COLUMN IF EXISTS "buttonLink";

-- Base64-картинки на Vercel длиннее VARCHAR(255)
ALTER TABLE "Promotion" ALTER COLUMN "image" TYPE TEXT;
