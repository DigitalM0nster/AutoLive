// src\app\api\products\get-products-by-category\route.js
import { getDatabaseConnection } from "@/lib/db";

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const categoryId = searchParams.get("category");

	if (!categoryId) {
		return new Response(JSON.stringify({ error: "Не указан ID категории" }), { status: 400 });
	}

	try {
		const db = await getDatabaseConnection();

		// Получаем товары категории
		const [products] = await db.query(
			`
			SELECT id, name, price, image_url FROM products WHERE category_id = ?
		`,
			[categoryId]
		);

		// Получаем категорию
		const [categories] = await db.execute("SELECT name FROM categories WHERE id = ?", [categoryId]);

		// Получаем только используемые фильтры и их значения для этой категории
		const [filters] = await db.query(
			`
			SELECT DISTINCT f.id AS filter_id, f.name AS filter_name, fv.id AS value_id, fv.value
			FROM product_filters pf
			JOIN filters f ON pf.filter_id = f.id
			JOIN filter_values fv ON pf.filter_value_id = fv.id
			WHERE pf.product_id IN (SELECT id FROM products WHERE category_id = ?)
		`,
			[categoryId]
		);

		// Получаем связи товаров и фильтров
		const [productFilters] = await db.query(
			`
			SELECT pf.product_id, pf.filter_id, pf.filter_value_id, fv.value
			FROM product_filters pf
			JOIN filter_values fv ON pf.filter_value_id = fv.id
			WHERE pf.product_id IN (SELECT id FROM products WHERE category_id = ?)
		`,
			[categoryId]
		);

		// Структурируем фильтры
		const structuredFilters = filters.reduce((acc, row) => {
			const { filter_id, filter_name, value_id, value } = row;
			if (!acc[filter_id]) {
				acc[filter_id] = { id: filter_id, name: filter_name, values: [] };
			}
			acc[filter_id].values.push({ id: value_id, value });
			return acc;
		}, {});

		// Привязываем фильтры к каждому товару
		const structuredProducts = products.map((product) => ({
			...product,
			filters: productFilters
				.filter((pf) => pf.product_id === product.id)
				.map((pf) => ({
					filter_id: pf.filter_id,
					value_id: pf.filter_value_id,
					value: pf.value,
				})),
		}));

		return new Response(
			JSON.stringify({
				category: {
					id: categoryId,
					name: categories[0]?.name || "Неизвестная категория",
					products: structuredProducts,
					filters: Object.values(structuredFilters),
				},
			}),
			{ status: 200 }
		);
	} catch (error) {
		console.error("Ошибка при получении товаров:", error);
		return new Response(JSON.stringify({ error: "Ошибка сервера" }), { status: 500 });
	}
}
