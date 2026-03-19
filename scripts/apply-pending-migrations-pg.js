#!/usr/bin/env node
/**
 * Выполняет только те папки prisma/migrations, которых ещё нет в _prisma_migrations,
 * по одному файлу migration.sql через pg (короткие запросы). Обходит P1017 Prisma,
 * когда schema-engine рвёт соединение на тяжёлом applyMigrations.
 *
 * DIRECT_DB_URL или DB_URL — как в prisma.config.ts (лучше Neon Direct, без pooler).
 *
 *   node scripts/apply-pending-migrations-pg.js          — список ожидающих
 *   node scripts/apply-pending-migrations-pg.js --yes    — применить по порядку
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");
const APPLY = process.argv.includes("--yes");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
		console.error("Нет DIRECT_DB_URL или DB_URL в .env / .env.local.");
		process.exit(1);
	}
	return url;
}

function pgOptions(connectionString) {
	return {
		connectionString,
		connectionTimeoutMillis: 60_000,
		keepAlive: true,
		keepAliveInitialDelayMillis: 10_000,
	};
}

function listMigrationFolders() {
	if (!fs.existsSync(MIGRATIONS_DIR)) {
		console.error("Нет папки:", MIGRATIONS_DIR);
		process.exit(1);
	}
	return fs
		.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
		.sort();
}

function checksumForFile(filePath) {
	return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

/** Одна транзакция на файл; если внутри уже есть `BEGIN;` (часто после комментариев) — не дублируем. */
function wrapTransactionIfNeeded(sql) {
	if (/\bBEGIN\s*;/i.test(sql)) return sql;
	return `BEGIN;\n${sql}\nCOMMIT;`;
}

async function insertMigrationRow(client, id, checksum, name) {
	const ins = await client.query(
		`INSERT INTO "_prisma_migrations" (
      "id", "checksum", "finished_at", "migration_name",
      "logs", "rolled_back_at", "started_at", "applied_steps_count"
    )
    SELECT $1::varchar, $2::varchar, NOW(), $3::varchar, NULL, NULL, NOW(), 1
    WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" x WHERE x."migration_name" = $3)`,
		[id, checksum, name]
	);
	return ins.rowCount === 1;
}

async function applyOneMigration(url, name, attempt = 1) {
	const sqlPath = path.join(MIGRATIONS_DIR, name, "migration.sql");
	const rawSql = fs.readFileSync(sqlPath, "utf8");
	const checksum = checksumForFile(sqlPath);
	const sql = wrapTransactionIfNeeded(rawSql);
	const id = crypto.randomUUID();

	const client = new Client(pgOptions(url));
	client.on("error", () => {});

	try {
		await client.connect();
		await client.query(sql);
		const inserted = await insertMigrationRow(client, id, checksum, name);
		if (!inserted) {
			console.log("Пропуск (уже в истории):", name);
			return;
		}
		console.log("OK:", name);
	} catch (e) {
		try {
			await client.query("ROLLBACK").catch(() => {});
		} catch {
			/* */
		}
		if (attempt < 4) {
			const wait = 600 * attempt * attempt;
			console.warn(`Повтор ${attempt}/3 через ${wait}ms (${name}):`, e.message || e);
			await sleep(wait);
			return applyOneMigration(url, name, attempt + 1);
		}
		throw e;
	} finally {
		try {
			await client.end();
		} catch {
			/* */
		}
	}
}

async function main() {
	const url = getDatabaseUrl();
	const folders = listMigrationFolders();

	const client = new Client(pgOptions(url));
	client.on("error", () => {});
	await client.connect();
	const { rows } = await client.query(`SELECT "migration_name" FROM "_prisma_migrations"`);
	await client.end();

	const applied = new Set(rows.map((r) => r.migration_name));
	const pending = folders.filter((n) => !applied.has(n));

	if (pending.length === 0) {
		console.log("Нет ожидающих миграций (все имена из папок уже в _prisma_migrations).");
		console.log("Если схема всё равно не совпадает — это рассинхрон истории и реального SQL; чини вручную или через новую миграцию.");
		return;
	}

	console.log("К применению (по порядку):");
	pending.forEach((n) => console.log(" ", n));

	if (!APPLY) {
		console.log("\nЗапуск: npm run db:migrate-deploy:pg:apply");
		return;
	}

	for (const name of pending) {
		await applyOneMigration(url, name);
		await sleep(400);
	}

	console.log("\nГотово. Проверка: npm run db:migrate-status");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
