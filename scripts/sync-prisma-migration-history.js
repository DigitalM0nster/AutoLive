#!/usr/bin/env node
/**
 * Добавляет в _prisma_migrations записи для папок из prisma/migrations,
 * которых ещё нет в БД (аналог prisma migrate resolve --applied для каждой).
 *
 * Не выполняет SQL из migration.sql — только историю. Схема в БД должна уже совпадать.
 *
 * Использует те же переменные, что prisma.config.ts: DIRECT_DB_URL или DB_URL.
 *
 * Запуск:
 *   node scripts/sync-prisma-migration-history.js           — только список, что добавится
 *   node scripts/sync-prisma-migration-history.js --yes     — записать в БД
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

function pgOptions(connectionString) {
	return {
		connectionString,
		connectionTimeoutMillis: 25_000,
		keepAlive: true,
		keepAliveInitialDelayMillis: 10_000,
	};
}

async function withPg(connectionString, fn) {
	const client = new Client(pgOptions(connectionString));
	client.on("error", () => {});
	await client.connect();
	try {
		return await fn(client);
	} finally {
		try {
			await client.end();
		} catch {
			/* ignore */
		}
	}
}

async function insertOneMigration(connectionString, id, checksum, name, attempt = 1) {
	try {
		await withPg(connectionString, async (client) => {
			const ins = await client.query(
				`INSERT INTO "_prisma_migrations" (
          "id", "checksum", "finished_at", "migration_name",
          "logs", "rolled_back_at", "started_at", "applied_steps_count"
        )
        SELECT $1::varchar, $2::varchar, NOW(), $3::varchar, NULL, NULL, NOW(), 1
        WHERE NOT EXISTS (
          SELECT 1 FROM "_prisma_migrations" x WHERE x."migration_name" = $3
        )`,
				[id, checksum, name]
			);
			if (ins.rowCount === 1) console.log("Записано:", name);
			else console.log("Уже было:", name);
		});
	} catch (e) {
		if (attempt < 4) {
			const wait = 400 * attempt * attempt;
			console.warn(`Повтор ${attempt}/3 через ${wait}ms (${name}):`, e.message || e);
			await sleep(wait);
			return insertOneMigration(connectionString, id, checksum, name, attempt + 1);
		}
		throw e;
	}
}

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
		console.error(
			"Нет DIRECT_DB_URL или DB_URL в .env / .env.local (как в prisma.config.ts). Для Neon укажите direct URL."
		);
		process.exit(1);
	}
	return url;
}

function listMigrationFolders() {
	if (!fs.existsSync(MIGRATIONS_DIR)) {
		console.error("Папка не найдена:", MIGRATIONS_DIR);
		process.exit(1);
	}
	return fs
		.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((name) => {
			const sqlPath = path.join(MIGRATIONS_DIR, name, "migration.sql");
			return fs.existsSync(sqlPath);
		})
		.sort();
}

function checksumForFile(filePath) {
	const buf = fs.readFileSync(filePath);
	return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
	const databaseUrl = getDatabaseUrl();
	const folders = listMigrationFolders();

	const existing = await withPg(databaseUrl, async (client) => {
		const { rows: existingRows } = await client.query(
			`SELECT "migration_name" FROM "_prisma_migrations"`
		);
		return new Set(existingRows.map((r) => r.migration_name));
	});

	const toAdd = [];
	for (const name of folders) {
		if (existing.has(name)) continue;
		const sqlPath = path.join(MIGRATIONS_DIR, name, "migration.sql");
		toAdd.push({ name, checksum: checksumForFile(sqlPath) });
	}

	if (toAdd.length === 0) {
		console.log("Все миграции из prisma/migrations уже есть в _prisma_migrations. Ничего делать не нужно.");
		return;
	}

	console.log("Будут добавлены записи (схема в БД уже должна соответствовать этим миграциям):");
	for (const m of toAdd) {
		console.log(`  - ${m.name}`);
		console.log(`    checksum: ${m.checksum}`);
	}

	if (!APPLY) {
		console.log("");
		console.log("Чтобы записать в БД, выполните:");
		console.log("  npm run db:sync-migration-history:apply");
		return;
	}

	for (const m of toAdd) {
		const id = crypto.randomUUID();
		await insertOneMigration(databaseUrl, id, m.checksum, m.name);
		await sleep(350);
	}

	console.log("");
	console.log("Дальше:");
	console.log("  npm run db:migrate-status-lite");
	console.log("  npx prisma generate");
	console.log("(npx prisma migrate status к Neon может дать P1017 — используйте db:migrate-status-lite.)");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
