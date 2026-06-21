const STORAGE_KEY = "autolive.siteNavStack";

function readStack(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		const parsed = raw ? (JSON.parse(raw) as unknown) : [];
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && isInternalPath(item)) : [];
	} catch {
		return [];
	}
}

function writeStack(stack: string[]): void {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
}

export function isInternalPath(path: string): boolean {
	return path.startsWith("/") && !path.startsWith("//");
}

/** Запоминаем посещённые страницы сайта в рамках вкладки */
export function trackSitePath(pathname: string): void {
	if (!isInternalPath(pathname)) return;
	const stack = readStack();
	if (stack[stack.length - 1] !== pathname) {
		stack.push(pathname);
		if (stack.length > 50) stack.shift();
		writeStack(stack);
	}
}

/** Предыдущая страница на сайте или null, если её нет */
export function getPreviousSitePath(currentPath: string): string | null {
	const stack = readStack();
	while (stack.length > 0 && stack[stack.length - 1] === currentPath) {
		stack.pop();
	}
	const previous = stack.length > 0 ? stack[stack.length - 1] : null;
	writeStack(stack);
	return previous && isInternalPath(previous) ? previous : null;
}
