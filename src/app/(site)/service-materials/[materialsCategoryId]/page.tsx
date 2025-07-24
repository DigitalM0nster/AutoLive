// src\app\service-materials\[materialsCategoryId]\page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import CategoryPageClient from "./CategoryPageClient";
import type { Category } from "@/lib/types";

type PageParams = {
	params: {
		materialsCategoryId: string;
	};
};

export default async function MaterialPageByCategory({ params }: PageParams) {
	const categoryId = decodeURIComponent(params?.materialsCategoryId || "");

	if (!categoryId) {
		return <div className="text-center">Загрузка...</div>;
	}

	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/get-products-by-category?category=${categoryId}`, {
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		return <div className="text-center">Ошибка загрузки данных</div>;
	}

	const categoryData = await res.json();
	console.log("Получаем товары по выбранной категории: ", categoryData);

	if (!categoryData || !categoryData.category) {
		return <div className="text-center">Ошибка загрузки данных</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={undefined} />
				<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryData.category.title}</h1>
				<CategoryPageClient categoryData={categoryData} />
			</div>
		</div>
	);
}
