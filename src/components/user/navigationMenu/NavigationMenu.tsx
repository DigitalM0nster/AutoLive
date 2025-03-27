"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./styles.module.scss";

type NavigationMenuProps = {
	productId?: string | number;
};

type Category = {
	id: number;
	title: string;
};

type Product = {
	title: string;
};

export default function NavigationMenu({ productId }: NavigationMenuProps) {
	const pathname = usePathname();
	const router = useRouter();

	const [categories, setCategories] = useState<Category[]>([]);
	const [product, setProduct] = useState<Product | null>(null);

	// Страницы и их заголовки
	const pages: Record<string, string> = {
		"/promotions": "Акции",
		"/service-materials": "Материалы для ТО",
		"/service-kits": "Комплекты ТО",
		"/service-booking": "Запись на ТО",
		"/catalog": "Запчасти",
	};

	// Загружаем категории
	useEffect(() => {
		fetch("/api/categories/get-categories")
			.then((res) => res.json())
			.then(setCategories)
			.catch(() => setCategories([]));
	}, []);

	// Загружаем продукт по ID
	useEffect(() => {
		if (productId) {
			fetch(`/api/products/${productId}/get-product`)
				.then((res) => res.json())
				.then((data) => setProduct(data.product))
				.catch(() => setProduct(null));
		}
	}, [productId]);

	// Получение названия категории по ID
	const getCategoryTitle = (id: string | number): string | undefined => {
		const found = categories.find((cat) => cat.id.toString() === id.toString());
		return found?.title;
	};

	// Генерация хлебных крошек
	const breadcrumbs = useMemo(() => {
		const segments = pathname.split("/").filter(Boolean);

		return segments
			.map((segment, index) => {
				const fullPath = "/" + segments.slice(0, index + 1).join("/");

				let name: string = pages[fullPath] ?? decodeURIComponent(segment);

				// 🎯 Для service-materials
				if (segments[0] === "service-materials") {
					if (index === 1) {
						const categoryTitle = getCategoryTitle(segment);
						if (!categoryTitle) return null; // пока нет категории — не показываем
						name = categoryTitle;
					}
					if (index === 2) {
						if (!product?.title) return null; // пока нет товара — не показываем
						name = product.title;
					}
				}

				// 🎯 Для catalog
				if (segments[0] === "catalog") {
					if (index === 1) {
						const categoryTitle = getCategoryTitle(segment);
						if (!categoryTitle) return null;
						name = categoryTitle;
					}
					if (index === 2) {
						if (!product?.title) return null;
						name = product.title;
					}
				}

				return { name, path: fullPath };
			})
			.filter(Boolean); // удаляем все null
	}, [pathname, categories, product]);

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
