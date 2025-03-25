"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./styles.module.scss";

type NavigationMenuProps = {
	productId?: string | number;
};

type ProductResponse = {
	product?: {
		name: string;
		// можно добавить и другие поля: id, price, image и т.д.
	};
};

export default function NavigationMenu({ productId }: NavigationMenuProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
	const [product, setProduct] = useState<ProductResponse | null>(null);

	// Страницы и их названия
	const pages = {
		"/discounts": "Акции",
		"/service-materials": "Материалы для ТО",
		"/service-kits": "Комплекты ТО",
		"/service-booking": "Запись на ТО",
		"/catalog": "Запчасти",
	};

	// Получение списка категорий
	useEffect(() => {
		fetch("/api/categories/get-categories")
			.then((res) => res.json())
			.then(setCategories)
			.catch(() => setCategories([]));
	}, []);

	// Получение списка продуктов
	useEffect(() => {
		if (productId) {
			fetch(`/api/products/${productId}/get-product`)
				.then((res) => res.json())
				.then(setProduct)
				.catch(() => setProduct(null));
		}
	}, []);

	// useEffect(() => {
	// 	console.log(categories);
	// }, [categories]);

	// Функция для получения названия категории по ID
	const getCategoryName = (categoryId: string | number): string => {
		const category = categories?.find((c) => c.id.toString() === categoryId.toString());
		return category ? category.name : categoryId.toString();
	};

	// Генерация хлебных крошек
	const generateBreadcrumbs = () => {
		const segments = pathname.split("/").filter(Boolean);
		return segments.map((segment, index) => {
			const fullPath = "/" + segments.slice(0, index + 1).join("/");
			let name = pages[fullPath] || decodeURIComponent(segment);

			// Если путь относится к "Материалам для ТО"
			if (segments[0] === "service-materials") {
				if (index === 1) {
					name = getCategoryName(segment);
				}
				if (index === 2 && product && productId) {
					name = product?.product?.name; // Получаем имя продукта
				}
			}

			return { name, path: fullPath };
		});
	};

	const breadcrumbs = useMemo(generateBreadcrumbs, [pathname, categories, product]);

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

					{breadcrumbs.map((crumb, index) => (
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
					{Object.entries(pages).map(([path, name]) => (
						<div key={path} className={`button ${styles.pageButton} ${pathname.startsWith(path) ? styles.active : ""}`} onClick={() => router.push(path)}>
							{name}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
