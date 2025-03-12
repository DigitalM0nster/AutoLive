import { getDatabaseConnection } from "@/app/lib/db";

export async function GET(req, context) {
	const { productId } = context.params; // Получаем productId из URL
	console.log("Запрос на продукт ID:", productId);

	try {
		const db = await getDatabaseConnection();

		// 1️⃣ Получаем основную информацию о товаре
		const [productData] = await db.query(
			`
			SELECT p.id, p.name, p.price, p.image_url, p.category_id, c.name AS category_name
			FROM products p
			JOIN categories c ON p.category_id = c.id
			WHERE p.id = ?
		`,
			[productId]
		);

		if (productData.length === 0) {
			return new Response(JSON.stringify({ error: "Продукт не найден" }), { status: 404 });
		}

		const product = productData[0];

		// 2️⃣ Получаем ВСЕ значения фильтров, привязанные к товару
		const [productFilters] = await db.query(
			`
			SELECT f.id AS filter_id, f.name AS filter_name, fv.id AS value_id, fv.value
			FROM product_filters pf
			JOIN filters f ON pf.filter_id = f.id
			JOIN filter_values fv ON pf.filter_value_id = fv.id
			WHERE pf.product_id = ?
		`,
			[productId]
		);

		// 3️⃣ Формируем объект, учитывая множественные значения фильтра
		const structuredFilters = productFilters.reduce((acc, row) => {
			const { filter_id, filter_name, value_id, value } = row;
			if (!acc[filter_id]) {
				acc[filter_id] = { id: filter_id, name: filter_name, selected_values: [] };
			}
			acc[filter_id].selected_values.push({ id: value_id, value });
			return acc;
		}, {});

		// 4️⃣ Добавляем фильтры в объект продукта
		product.filters = Object.values(structuredFilters);

		return new Response(JSON.stringify({ product }), { status: 200 });
	} catch (error) {
		console.error("Ошибка при получении продукта:", error);
		return new Response(JSON.stringify({ error: "Ошибка сервера" }), { status: 500 });
	}
}
