// src\app\categories\[categoryId]\page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import CategoryPageClient from "./CategoryPageClient";
import type { Category } from "@/lib/types";

type PageParams = {
	params: Promise<{
		categoryId: string;
	}>;
};

export default async function CategoryPage({ params }: PageParams) {
	const { categoryId } = await params;

	if (!categoryId) {
		return <div className="text-center">Загрузка...</div>;
	}

	// Загружаем данные категории с товарами
	const categoryRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/get-products-by-category?category=${categoryId}`, {
		next: { revalidate: 3600 },
	});

	if (!categoryRes.ok) {
		return <div className="text-center">Ошибка загрузки данных категории</div>;
	}

	const categoryData = await categoryRes.json();

	if (!categoryData || !categoryData.category) {
		return <div className="text-center">Ошибка загрузки данных категории</div>;
	}

	// Загружаем фильтры категории
	const filtersRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/categories/${categoryId}/filters/public`, {
		next: { revalidate: 3600 },
	});

	let filters = [];
	if (filtersRes.ok) {
		filters = await filtersRes.json();
	}

	// Добавляем фильтры к данным категории
	const categoryDataWithFilters = {
		...categoryData,
		category: {
			...categoryData.category,
			filters: filters,
		},
	};

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={undefined} />
				<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryDataWithFilters.category.title}</h1>
				<CategoryPageClient categoryData={categoryDataWithFilters} />
			</div>
		</div>
	);
}
