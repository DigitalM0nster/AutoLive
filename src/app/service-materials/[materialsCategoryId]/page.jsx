import styles from "./styles.module.scss";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import { getProductsByCategory } from "@/app/lib/api";
import CategoryPageClient from "./CategoryPageClient";

export default async function MaterialPageByCategory({ params }) {
	const awaitedParams = await params;
	const categoryId = awaitedParams?.materialsCategoryId ? decodeURIComponent(awaitedParams.materialsCategoryId) : null;

	if (!categoryId) {
		return <div className="text-center">Загрузка...</div>;
	}

	const categoryData = await getProductsByCategory(categoryId);
	console.log(categoryData);

	if (!categoryData || categoryData.error) {
		return <div className="text-center">Ошибка загрузки данных</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryData.category.name}</h1>

				<CategoryPageClient categoryData={categoryData} />
			</div>
		</div>
	);
}
