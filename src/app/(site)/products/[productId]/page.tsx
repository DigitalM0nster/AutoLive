import { Suspense } from "react";
import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import ProductContent from "./ProductContent";
import ProductSkeleton from "./ProductSkeleton";

type PageParams = {
	params: Promise<{
		productId: string;
	}>;
};

export default async function DirectProductPage({ params }: PageParams) {
	// безопасно извлекаем значения
	const { productId } = await params;

	if (!productId) {
		return <div className="text-center">Загрузка...</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={productId} />

				{/* Секция с контентом товара с использованием Suspense для скелетона */}
				<Suspense fallback={<ProductSkeleton />}>
					<ProductContent productId={productId} />
				</Suspense>
			</div>
		</div>
	);
}
