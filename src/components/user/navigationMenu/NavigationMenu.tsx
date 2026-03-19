"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./styles.module.scss";
import { Product, Category } from "@/lib/types";

type NavigationMenuProps = {
	productId?: string | number;
};

export default function NavigationMenu({ productId }: NavigationMenuProps) {
	const pathname = usePathname();
	const router = useRouter();

	const [categories, setCategories] = useState<Category[]>([]);
	const [product, setProduct] = useState<Product | null>(null);

	// Все сегменты путей клиентской части — только русские подписи, чтобы в крошках не было английского
	// Только разделы навигации: без регистрации и корзины
	const pages = useMemo<Record<string, string>>(
		() => ({
			"/promotions": "Акции",
			"/categories": "Материалы для ТО",
			"/service-kits": "Комплекты ТО",
			"/booking": "Запись на ТО",
			"/products": "Запчасти",
			"/contacts": "Контакты",
		}),
		[],
	);

	// 🔄 Обновлённый fetch категорий
	useEffect(() => {
		console.log("Загружаем категории...");
		fetch("/api/categories")
			.then((res) => {
				console.log("Ответ API категорий:", res.status);
				return res.json();
			})
			.then((data) => {
				console.log("Загруженные категории:", data);
				setCategories(data);
			})
			.catch((err) => {
				console.error("Ошибка загрузки категорий:", err);
				setCategories([]);
			});
	}, []);

	// Загружаем данные о продукте, если передан productId
	useEffect(() => {
		if (productId) {
			fetch(`/api/products/${productId}/public`)
				.then((res) => res.json())
				.then((data) => setProduct(data.product))
				.catch((err) => console.error("Ошибка загрузки продукта:", err));
		}
	}, [productId]);

	const getCategoryTitle = useCallback((id: string | number): string | undefined => {
		if (!Array.isArray(categories)) {
			return undefined;
		}
		const found = categories.find((cat) => cat.id.toString() === id.toString());
		return found?.title;
	}, [categories]);

	const breadcrumbs = useMemo(() => {
		const segments = pathname.split("/").filter(Boolean);

		// Добавляем корзину в хлебные крошки
		if (segments[0] === "cart") {
			return [
				{
					name: "Корзина",
					path: "/cart",
				},
			];
		}

		// Специальная логика для прямого пути к продукту /products/[productId]
		if (segments[0] === "products" && segments.length === 2) {
			const productId = segments[1];

			// Если данные о продукте еще не загружены, показываем загрузку
			if (/^\d+$/.test(productId) && !product) {
				return [{ name: "Загрузка...", path: `/products/${productId}` }];
			}

			if (/^\d+$/.test(productId) && product?.title) {
				const breadcrumbs = [];

				// Добавляем "Материалы для ТО", если есть категория
				if (product.categoryId) {
					breadcrumbs.push({
						name: "Материалы для ТО",
						path: "/categories",
					});

					const categoryTitle = getCategoryTitle(product.categoryId);
					if (categoryTitle) {
						breadcrumbs.push({
							name: categoryTitle,
							path: `/categories/${product.categoryId}`,
						});
					}
				}

				// Добавляем товар
				breadcrumbs.push({
					name: product.title,
					path: `/products/${productId}`,
				});

				return breadcrumbs;
			}

			// Если это прямой путь к продукту, но данные не загружены, возвращаем пустой массив
			return [];
		}

		// Специальная логика для прямого пути к категории /categories/[categoryId]
		if (segments[0] === "categories" && segments.length === 2) {
			const categoryId = segments[1];

			// Если это ID категории (число)
			if (/^\d+$/.test(categoryId)) {
				// Проверяем, что categories загружены и является массивом
				if (Array.isArray(categories) && categories.length > 0) {
					const categoryTitle = getCategoryTitle(categoryId);
					console.log("Category ID:", categoryId, "Title:", categoryTitle, "Categories:", categories);

					if (categoryTitle) {
						return [
							{
								name: "Материалы для ТО",
								path: "/categories",
							},
							{
								name: categoryTitle,
								path: `/categories/${categoryId}`,
							},
						];
					}
				}

				// Если категории не загружены или категория не найдена, показываем ID
				return [
					{
						name: "Материалы для ТО",
						path: "/categories",
					},
					{
						name: ``,
						path: `/categories/${categoryId}`,
					},
				];
			}

			// Если это не ID категории, возвращаем пустой массив
			return [];
		}

		// Обычная логика для остальных путей
		return segments
			.map((segment, index) => {
				const fullPath = "/" + segments.slice(0, index + 1).join("/");

				let name: string = pages[fullPath] ?? decodeURIComponent(segment);

				// Логика для категорий /categories/[categoryId] - только если это НЕ прямой путь
				if (segments[0] === "categories" && index === 1 && segments.length > 2) {
					// Проверяем, является ли сегмент ID категории (число)
					if (/^\d+$/.test(segment)) {
						const categoryTitle = getCategoryTitle(segment);
						if (!categoryTitle) return null;
						name = categoryTitle;
					}
				}

				// Логика для продуктов /products/[productId] - только если это НЕ прямой путь
				if (segments[0] === "products" && index === 1 && segments.length > 2) {
					// Проверяем, является ли сегмент ID продукта (число)
					if (/^\d+$/.test(segment)) {
						if (!product?.title) return null;
						name = product.title;
					}
				}

				return { name, path: fullPath };
			})
			.filter(Boolean);
	}, [pathname, categories, product, getCategoryTitle, pages]);

	return (
		<div className={styles.navigationMenu}>
			<div className={`${styles.navLine} ${styles.crumbs}`}>
				<div className={styles.backButtonBlock} onClick={() => window.history.back()}>
					← Назад
				</div>
				<div className={styles.navs}>
					<div className={styles.navBlock}>
						<div className={styles.nav} onClick={() => router.push("/")}>
							Главная
						</div>
						{breadcrumbs.length > 0 && <div className={`${styles.nav} ${styles.separator}`}> / </div>}
					</div>

					{(breadcrumbs as { name: string; path: string }[]).map((crumb, index) => (
						<div key={crumb.path} className={styles.navBlock}>
							<div className={`${styles.nav} ${pathname === crumb.path ? styles.active : ""}`} onClick={() => router.push(crumb.path)}>
								{crumb.name}
							</div>
							{index < breadcrumbs.length - 1 && <div className={`${styles.nav} ${styles.separator}`}> / </div>}
						</div>
					))}
				</div>
			</div>

			<div className={styles.navLine}>
				<div className={styles.pages}>
					{Object.entries(pages).map(([path, name]) => {
						// Специальная логика для продуктов с категорией
						let isActive = pathname.startsWith(path);

						// Если это страница продукта и у продукта есть категория, то активным должно быть "Материалы для ТО"
						if (pathname.startsWith("/products/") && product?.categoryId && path === "/categories") {
							isActive = true;
						} else if (pathname.startsWith("/products/") && product?.categoryId && path === "/products") {
							isActive = false;
						}

						return (
							<div key={path} className={`button ${styles.pageButton} ${isActive ? styles.active : ""}`} onClick={() => router.push(path)}>
								{name}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
