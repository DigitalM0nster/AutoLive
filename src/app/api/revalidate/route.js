import { revalidatePath } from "next/cache";

export async function POST(req) {
	try {
		const body = await req.json();
		const { path } = body; // Путь, который нужно обновить

		if (!path) {
			return new Response(JSON.stringify({ error: "Не указан путь" }), { status: 400 });
		}

		revalidatePath(path); // Принудительно обновляем кеш указанного пути

		return new Response(JSON.stringify({ message: `Кеш обновлён для ${path}` }), { status: 200 });
	} catch (error) {
		console.error("Ошибка при обновлении кеша:", error);
		return new Response(JSON.stringify({ error: "Ошибка сервера" }), { status: 500 });
	}
}
