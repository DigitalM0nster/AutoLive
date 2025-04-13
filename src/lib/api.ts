// src\lib\api.ts

import { Category, Promotion, ServiceKit } from "./types";

// Получаем товары
export async function getProductsByCategory(categoryId: string): Promise<{ category: Category } | { error: string }> {
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/get-products-by-category?category=${categoryId}`, {
			next: { revalidate: 3600 },
		});

		if (!res.ok) {
			return { error: `Ошибка загрузки: ${res.status}` };
		}

		const data = await res.json();

		if (!data || !data.category) {
			return { error: "Категория не найдена" };
		}

		return { category: data.category };
	} catch (error) {
		console.error("Ошибка запроса:", error);
		return { error: "Ошибка запроса" };
	}
}

// Получить продукт по ID
export async function getProductById(id: string | number) {
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`, {
			cache: "no-store",
		});
		if (!res.ok) throw new Error("Ошибка загрузки продукта");
		return await res.json();
	} catch (error) {
		console.error("getProductById:", error);
		return null;
	}
}

// Получаем категории
export async function getCategories() {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories`);
	const data = await res.json();
	// ✅ убедись, что на сервере /api/categories отсортированы по order
	return data;
}

// Получаем комплекты ТО
export async function getServiceKits(): Promise<ServiceKit[]> {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/get-kits`, {
		next: { revalidate: 3600 },
	});
	if (!res.ok) {
		console.error("Ошибка загрузки комплектов ТО:", res.statusText);
		return [];
	}
	return await res.json();
}

export async function getServiceKitById(kitId: string): Promise<ServiceKit | null> {
	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/service-kits/${kitId}`, {
			cache: "no-store", // чтобы всегда получать свежие данные
		});
		if (!res.ok) return null;
		const kit = await res.json();
		return kit;
	} catch (err) {
		console.error("Ошибка загрузки комплекта ТО:", err);
		return null;
	}
}

// Получаем Скидки и акции
export async function getPromotions(): Promise<Promotion[]> {
	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/promotions`, {
		next: { revalidate: 3600 },
	});
	const promotions = await res.json();

	// подстрахуемся — сортировка по order
	return promotions.sort((a: Promotion, b: Promotion) => a.order - b.order);
}
