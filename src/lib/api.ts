// src\lib\api.ts

import { Category, ProductResponse, ServiceKit } from "./types";

// Получаем товары
export async function getProductsByCategory(categoryId: string): Promise<{ category: Category } | null> {
	try {
		const response = await fetch(`http://localhost:3000/api/products/get-products-by-category?category=${categoryId}`, {
			next: { revalidate: 3600 },
		});

		if (!response.ok) {
			console.error("Ошибка при загрузке данных:", response.status, response.statusText);
			return null;
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Ошибка запроса:", error);
		return null;
	}
}

export async function getProductById(productId: string): Promise<ProductResponse> {
	try {
		const res = await fetch(`http://localhost:3000/api/products/${productId}/get-product`, {
			next: { revalidate: 3600 },
		});

		if (!res.ok) {
			console.error("Ошибка при загрузке:", res.statusText);
			return { error: "Ошибка загрузки" };
		}

		const data = await res.json();
		return data;
	} catch (error) {
		console.error("Ошибка запроса:", error);
		return { error: "Ошибка запроса" };
	}
}

// Получаем категории
export async function getCategories(): Promise<Category[]> {
	console.log("Получаем категории товаров");
	const res = await fetch("http://localhost:3000/api/categories/get-categories", {
		next: { revalidate: 3600 },
	});

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

// Получаем комплекты ТО
export async function getServiceKits(): Promise<ServiceKit[]> {
	const res = await fetch("http://localhost:3000/api/get-kits", {
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
		const res = await fetch(`http://localhost:3000/api/service-kits/${kitId}`, {
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
