#!/usr/bin/env node
/**
 * Создаёт таблицу pickup_point_log, если её нет (актуальные колонки под schema.prisma).
 * Только pg, без Prisma engine. Требует существующую таблицу pickup_point.
 *
 *   node scripts/repair-pickup-point-log.js        — проверка
 *   node scripts/repair-pickup-point-log.js --yes  — создать при отсутствии
 */
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const APPLY = process.argv.includes("--yes");

function normalizeDatabaseUrl(raw) {
	if (!raw) return raw;
	try {
		const u = new URL(raw);
		u.searchParams.delete("channel_binding");
		return u.toString();
	} catch {
		return raw;
	}
}

function getDatabaseUrl() {
	const url = normalizeDatabaseUrl(process.env.DIRECT_DB_URL || process.env.DB_URL);
	if (!url || String(url).trim() === "") {
		console.error("Нужен DIRECT_DB_URL или DB_URL.");
		process.exit(1);
	}
	return url;
}

async function main() {
	const url = getDatabaseUrl();
	const client = new Client({
		connectionString: url,
		connectionTimeoutMillis: 60_000,
	});
	await client.connect();

	const { rows } = await client.query(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pickup_point_log'`
	);

	if (rows.length > 0) {
		console.log('Таблица "pickup_point_log" уже есть — ничего не делаю.');
		await client.end();
		return;
	}

	console.log('Таблицы "pickup_point_log" нет.');

	if (!APPLY) {
		console.log("Создать: node scripts/repair-pickup-point-log.js --yes");
		await client.end();
		process.exit(2);
	}

	const { rows: pp } = await client.query(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pickup_point'`
	);
	if (pp.length === 0) {
		console.error('Нет таблицы "pickup_point" — сначала создай пункты выдачи / миграции.');
		await client.end();
		process.exit(1);
	}

	await client.query(`
CREATE TABLE "pickup_point_log" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(255) NOT NULL,
    "message" TEXT,
    "pickup_point_id" INTEGER NOT NULL,
    "adminSnapshot" JSONB,
    "pickupPointSnapshot" JSONB,
    CONSTRAINT "pickup_point_log_pkey" PRIMARY KEY ("id")
)`);

	await client.query(`
ALTER TABLE "pickup_point_log"
  ADD CONSTRAINT "pickup_point_log_pickup_point_id_fkey"
  FOREIGN KEY ("pickup_point_id") REFERENCES "pickup_point"("id") ON DELETE CASCADE ON UPDATE CASCADE
`);

	console.log('Создана таблица "pickup_point_log". Проверка: npm run db:diff');
	await client.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
