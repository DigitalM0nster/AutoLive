"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./styles.module.scss";

export default function NavigationMenu() {
	const pathname = usePathname();
	const router = useRouter();
	const [categories, setCategories] = useState([]);

	// Список стандартных страниц
	const pages = {
		"/discounts": "Акции",
		"/service-materials": "Материалы для ТО",
		"/service-kits": "Комплекты ТО",
		"/service-booking": "Запись на ТО",
		"/catalog": "Запчасти",
	};

	// Получаем категории при первом рендере
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await fetch("/api/categories/get-categories");
				const data = await res.json();
				setCategories(data);
			} catch {
				setCategories([]);
			}
		};
		fetchCategories();
	}, []);

	// Функция получения названия категории по `id`
	const getCategoryName = (categoryId) => {
		const category = categories.find((categoryItem) => categoryItem.id.toString() === categoryId);
		return category ? category.name : " ";
	};

	// Определяем название категории, если путь начинается с `/service-materials/`
	const categoryName = (() => {
		if (pathname.startsWith("/service-materials/")) {
			const categoryId = pathname.split("/")[2];
			return getCategoryName(categoryId);
		}
		return "";
	})();

	// Функция генерации хлебных крошек
	const generateBreadcrumbs = () => {
		const pathSegments = pathname.split("/").filter(Boolean);
		return pathSegments.map((segment, index) => {
			const fullPath = "/" + pathSegments.slice(0, index + 1).join("/");
			const name =
				fullPath === "/service-materials"
					? "Материалы для ТО"
					: fullPath.startsWith("/service-materials/") && categoryName
					? categoryName
					: pages[fullPath] || decodeURIComponent(segment);
			return { name, path: fullPath };
		});
	};

	const breadcrumbs = useMemo(generateBreadcrumbs, [pathname, categoryName]);

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
