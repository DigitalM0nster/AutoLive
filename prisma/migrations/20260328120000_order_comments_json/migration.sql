-- Структурированные комментарии к заказу (JSON вместо text[])
ALTER TABLE "order" ADD COLUMN "comments_new" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "order" o
SET "comments_new" = COALESCE(
	(
		SELECT jsonb_agg(
			jsonb_build_object(
				'id', gen_random_uuid()::text,
				'text', elem,
				'authorId', NULL::int,
				'authorSnapshot', NULL::jsonb,
				'createdAt', to_jsonb(to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
			)
			ORDER BY ord
		)
		FROM unnest(o.comments) WITH ORDINALITY AS u(elem, ord)
	),
	'[]'::jsonb
);

ALTER TABLE "order" DROP COLUMN "comments";
ALTER TABLE "order" RENAME COLUMN "comments_new" TO "comments";
