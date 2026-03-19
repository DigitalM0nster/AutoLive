#!/usr/bin/env node
/**
 * Сравнивает папки prisma/migrations с таблицей _prisma_migrations через pg.
 * Не использует schema-engine — обходит P1017 при «тяжёлом» prisma migrate status на Neon.
 *
 * Те же URL, что prisma.config.ts: DIRECT_DB_URL или DB_URL.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

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

function listMigrationFolders() {
	return fs
		.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
		.sort();
}

function pgOptions(connectionString) {
	return {
		connectionString,
		connectionTimeoutMillis: 25_000,
		keepAlive: true,
		keepAliveInitialDelayMillis: 10_000,
	};
}

async function main() {
	const folders = listMigrationFolders();
	const disk = new Set(folders);
	const client = new Client(pgOptions(getDatabaseUrl()));
	client.on("error", () => {});
	await client.connect();
	const { rows } = await client.query(`SELECT "migration_name" FROM "_prisma_migrations"`);
	await client.end();

	const inDb = new Set(rows.map((r) => r.migration_name));

	const missingInDb = folders.filter((n) => !inDb.has(n));
	const extraInDb = [...inDb].filter((n) => !disk.has(n)).sort();

	console.log("Локальных папок миграций:", folders.length);
	console.log("Записей в _prisma_migrations:", inDb.size);
	console.log("");

	if (missingInDb.length === 0 && extraInDb.length === 0) {
		console.log("OK: каждая папка из prisma/migrations есть в _prisma_migrations.");
		console.log("");
		console.log("Дальше: npx prisma generate");
		console.log("(migrate status с Windows к Neon может снова дать P1017 — это не значит, что история битая.)");
		return;
	}

	if (missingInDb.length) {
		console.log("Нет в БД (нужно migrate deploy или db:sync-migration-history:apply):");
		missingInDb.forEach((n) => console.log("  -", n));
		console.log("");
	}
	if (extraInDb.length) {
		console.log("Есть в БД, но нет папки локально (редко):");
		extraInDb.forEach((n) => console.log("  -", n));
	}
	process.exit(missingInDb.length ? 1 : 0);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
