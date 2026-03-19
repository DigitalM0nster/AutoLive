#!/usr/bin/env node
/**
 * Сравнение списка таблиц public в Neon с ожидаемыми из prisma/schema.prisma (model + @@map).
 * Только pg — без Prisma schema-engine (нет гигантского RPC → нет P1017).
 *
 * Не заменяет полный `prisma migrate diff` (колонки/типы не сверяет), но ловит «таблицы не созданы».
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.prisma");

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
	if (!url || !String(url).trim()) {
		console.error("Нужен DIRECT_DB_URL или DB_URL.");
		process.exit(1);
	}
	return url;
}

/** Имя таблицы для каждого model-блока: @@map("x") или имя модели */
function expectedTablesFromSchema() {
	const text = fs.readFileSync(SCHEMA_PATH, "utf8");
	const re = /^model\s+(\w+)\s*\{/gm;
	const starts = [];
	let m;
	while ((m = re.exec(text)) !== null) {
		starts.push({ name: m[1], index: m.index });
	}
	const expected = new Set();
	for (let i = 0; i < starts.length; i++) {
		const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
		const block = text.slice(starts[i].index, end);
		const mapM = block.match(/@@map\("([^"]+)"\)/);
		expected.add(mapM ? mapM[1] : starts[i].name);
	}
	return expected;
}

async function main() {
	const expected = expectedTablesFromSchema();
	const url = getDatabaseUrl();
	const client = new Client({
		connectionString: url,
		connectionTimeoutMillis: 60_000,
		keepAlive: true,
	});
	client.on("error", () => {});
	await client.connect();

	const { rows } = await client.query(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
	);
	await client.end();

	const dbTables = new Set(rows.map((r) => r.tablename));
	const ignore = new Set(["_prisma_migrations"]);

	const missing = [...expected].filter((t) => !dbTables.has(t)).sort();
	const extra = [...dbTables].filter((t) => !expected.has(t) && !ignore.has(t)).sort();

	const dataTableCount = [...dbTables].filter((t) => !ignore.has(t)).length;
	console.log("Ожидаемых таблиц по schema.prisma:", expected.size);
	console.log(
		"Таблиц под модели в public (без _prisma_migrations):",
		dataTableCount,
		"| всего строк в pg_tables:",
		dbTables.size
	);
	console.log("");

	if (missing.length === 0 && extra.length === 0) {
		console.log("OK: набор таблиц совпадает (имена). Колонки/типы эта проверка не смотрит.");
		console.log("Полный SQL-дрифт: npm run db:diff:prisma (часто P1017 с Windows → CI/WSL).");
		return;
	}

	if (missing.length) {
		console.log("Нет в БД (должны быть по схеме):");
		missing.forEach((t) => console.log(" ", t));
		console.log("");
	}
	if (extra.length) {
		console.log("Есть в БД, но нет model/@@map в schema (или опечатка):");
		extra.forEach((t) => console.log(" ", t));
		console.log("");
	}

	process.exit(1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
