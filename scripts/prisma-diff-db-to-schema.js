#!/usr/bin/env node
/**
 * Сравнение: текущая БД (URL из prisma.config.ts) vs prisma/schema.prisma.
 * Prisma 7: вместо --from-url используется --from-config-datasource.
 *
 * Пустой вывод / код 0 — обычно совпадение; SQL в stdout — дрифт.
 */
const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const root = path.join(__dirname, "..");
const raw = process.env.DIRECT_DB_URL || process.env.DB_URL;
if (!raw || !String(raw).trim()) {
	console.error("Задай DIRECT_DB_URL или DB_URL в .env / .env.local (как для prisma.config.ts).");
	process.exit(1);
}

try {
	execSync(
		"npx prisma migrate diff --config prisma.config.ts --from-config-datasource --to-schema prisma/schema.prisma --script",
		{ stdio: "inherit", cwd: root, env: process.env, shell: true }
	);
} catch (e) {
	process.exit(e.status || 1);
}
