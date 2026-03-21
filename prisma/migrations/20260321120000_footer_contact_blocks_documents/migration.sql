-- Подвал: гибкие блоки контактов и документы вместо фиксированных pickup/service

ALTER TABLE "footer_content" ADD COLUMN "contact_blocks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "footer_content" ADD COLUMN "documents" JSONB NOT NULL DEFAULT '[]';

-- Перенос старых pickup/service в contact_blocks (сохраняем порядок: сначала ПВЗ, потом сервисы)
UPDATE "footer_content" AS fc
SET "contact_blocks" = COALESCE(
	(
		SELECT jsonb_agg(bl.agg_block ORDER BY bl.ord)
		FROM (
			SELECT
				1 AS ord,
				jsonb_build_object(
					'id', 'legacy-pickup-' || fc.id::text,
					'title', to_jsonb(NULLIF(btrim(fc.pickup_title), '')),
					'icon', 'shoppingCart',
					'items', COALESCE(
						(
							SELECT jsonb_agg(jsonb_build_object('type', 'text', 'value', btrim(t)))
							FROM unnest(COALESCE(fc.pickup_lines, ARRAY[]::text[])) AS u(t)
							WHERE btrim(t) != ''
						),
						'[]'::jsonb
					)
				) AS agg_block
			WHERE NULLIF(btrim(fc.pickup_title), '') IS NOT NULL
				OR EXISTS (
					SELECT 1 FROM unnest(COALESCE(fc.pickup_lines, ARRAY[]::text[])) AS u2(t2) WHERE btrim(t2) != ''
				)
			UNION ALL
			SELECT
				2 AS ord,
				jsonb_build_object(
					'id', 'legacy-service-' || fc.id::text,
					'title', to_jsonb(NULLIF(btrim(fc.service_title), '')),
					'icon', 'wrench',
					'items', COALESCE(
						(
							SELECT jsonb_agg(jsonb_build_object('type', 'text', 'value', btrim(t)))
							FROM unnest(COALESCE(fc.service_lines, ARRAY[]::text[])) AS u(t)
							WHERE btrim(t) != ''
						),
						'[]'::jsonb
					)
				) AS agg_block
			WHERE NULLIF(btrim(fc.service_title), '') IS NOT NULL
				OR EXISTS (
					SELECT 1 FROM unnest(COALESCE(fc.service_lines, ARRAY[]::text[])) AS u2(t2) WHERE btrim(t2) != ''
				)
		) AS bl
	),
	'[]'::jsonb
);

ALTER TABLE "footer_content" DROP COLUMN "pickup_title";
ALTER TABLE "footer_content" DROP COLUMN "pickup_lines";
ALTER TABLE "footer_content" DROP COLUMN "service_title";
ALTER TABLE "footer_content" DROP COLUMN "service_lines";
