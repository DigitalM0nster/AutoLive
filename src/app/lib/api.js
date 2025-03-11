// Получаем товары
export async function getProductsByCategory(categoryId) {
	try {
		const response = await fetch(`http://localhost:3000/api/products/get-products-by-category?category=${categoryId}`, {
			cache: "no-store",
		});

		if (!response.ok) {
			console.error("Ошибка при загрузке данных:", response.status, response.statusText);
			return null;
		}

		const data = await response.json();
		console.log("Полученные данные:", data); // Отладка
		return data;
	} catch (error) {
		console.error("Ошибка запроса:", error);
		return null;
	}
}

// Получаем разделы сайта
// Загружаем данные ОДИН раз во время билда, но обновляем их раз в 60 минут (SSG)
export async function getCategories() {
	console.log("Получаем категории товаров");
	const res = await fetch("http://localhost:3000/api/categories/get-categories", {
		next: { revalidate: 3600 }, // Данные обновляются раз в 1 час
	});

	// Проверяем, что сервер вернул JSON
	if (!res.ok) {
		console.error("Ошибка при загрузке данных:", res.status, res.statusText);
		return [];
	}

	try {
		const categories = await res.json();
		return categories;
	} catch (error) {
		console.error("Ошибка парсинга JSON:", error);
		return [];
	}
}
