// src\app\service-materials\[materialsCategoryId]\page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import { getProductsByCategory } from "@/lib/api";
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

	const categoryData: { category: Category } | { error: string } = await getProductsByCategory(categoryId);
	console.log("Получаем товары по выбранной категории: ", categoryData);

	if ("error" in categoryData) {
		return <div className="text-center">Ошибка загрузки данных</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={undefined} />
				<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryData.category.name}</h1>
				<CategoryPageClient categoryData={categoryData} />
			</div>
		</div>
	);
}
