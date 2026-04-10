/**
 * Запускается из npm run build.
 * prisma migrate deploy на Vercel Production (инфраструктура вне РФ — стабильный доступ к Neon).
 * Preview и локальный build пропускаем: не трогаем прод-БД с превью и не требуем доступ к БД при каждом next build.
 */

const { execSync } = require("child_process");

const onVercel = process.env.VERCEL === "1";
const vercelEnv = process.env.VERCEL_ENV;

if (!onVercel || vercelEnv !== "production") {
	console.log(
		"[migrate-deploy] Пропуск: миграции только на Vercel Production (сейчас VERCEL=" +
			(process.env.VERCEL ?? "") +
			", VERCEL_ENV=" +
			(vercelEnv ?? "") +
			").",
	);
	process.exit(0);
}

const hasDb =
	Boolean(process.env.DB_URL && String(process.env.DB_URL).trim()) ||
	Boolean(process.env.DIRECT_DB_URL && String(process.env.DIRECT_DB_URL).trim());

if (!hasDb) {
	console.error(
		"[migrate-deploy] Задайте DB_URL (или DIRECT_DB_URL) в Vercel → Settings → Environment Variables для Production.",
	);
	process.exit(1);
}

console.log("[migrate-deploy] Выполняю prisma migrate deploy …");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
