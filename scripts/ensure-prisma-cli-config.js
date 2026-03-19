/**
 * Prisma 7 CLI хранит состояние в %APPDATA%\prisma-nodejs\Config\commands.json.
 * Формат: объект с полем firstCommandTimestamp (ISO-строка). Массив [] или пустой объект — "Invalid command state schema".
 * @see prisma/build — функция чтения command state
 */
const fs = require("fs");
const path = require("path");

if (process.platform !== "win32") process.exit(0);

const appData = process.env.APPDATA;
if (!appData) process.exit(0);

const dir = path.join(appData, "prisma-nodejs", "Config");
const file = path.join(dir, "commands.json");

function defaultState() {
	return { firstCommandTimestamp: new Date().toISOString() };
}

function needsRewrite() {
	if (!fs.existsSync(file)) return true;
	try {
		const n = JSON.parse(fs.readFileSync(file, "utf8"));
		return typeof n.firstCommandTimestamp !== "string";
	} catch {
		return true;
	}
}

try {
	fs.mkdirSync(dir, { recursive: true });
	if (needsRewrite()) {
		fs.writeFileSync(file, `${JSON.stringify(defaultState(), null, 2)}\n`, "utf8");
	}
} catch {
	/* не блокируем install */
}
