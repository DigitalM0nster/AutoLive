import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Загружаем .env и .env.local (как в Next.js: .env.local переопределяет .env)
// Иначе при запуске Prisma CLI из корня проекта переменные из .env.local не видны
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

/**
 * Neon + Prisma migrate с Windows: не «всегда сломано», а частый кейс P1017 (обрыв TCP ~20 с).
 * Причина: schema-engine шлёт один очень тяжёлый RPC (все migration.sql в одном запросе) —
 * прокси/Neon/сеть могут разорвать соединение. Локальная Postgres почти не страдает из‑за малого RTT.
 *
 * Что делать по приоритету:
 * 1) DIRECT_DB_URL / DB_URL — только Direct из Neon (без pooler; в host обычно НЕТ `-pooler`).
 * 2) `migrate deploy` гонять из CI (Linux, регион ближе к БД) или WSL2, не с хоста Windows.
 * 3) Локально проверять историю: `npm run db:migrate-status` (без schema-engine).
 * 4) Убрать `DEBUG=prisma:*` / `PRISMA_DEBUG`, если задано — меньше шума и чуть меньше нагрузки.
 * 5) При P1002 advisory lock: `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` (только если понимаешь риск).
 * 6) Крайний случай: выполнить SQL новой миграции в Neon SQL Editor, затем `migrate resolve --applied`
 *    или скрипт sync истории (схема уже должна совпасть).
 *
 * channel_binding=require на Windows с Prisma часто провоцирует обрывы — ниже удаляем из URL для CLI.
 */
function normalizeDatabaseUrlForPrismaCli(raw: string | undefined): string | undefined {
	if (!raw || !String(raw).trim()) return raw;
	try {
		const u = new URL(raw);
		u.searchParams.delete("channel_binding");
		return u.toString();
	} catch {
		return raw;
	}
}

const rawUrl = process.env.DIRECT_DB_URL || process.env.DB_URL;
const datasourceUrl = normalizeDatabaseUrlForPrismaCli(rawUrl);

// Конфигурация для миграций Prisma. Для Neon задай DIRECT_DB_URL (Direct connection, без -pooler)
export default defineConfig({
	schema: "prisma/schema.prisma",
	datasource: {
		url: datasourceUrl,
	},
});
