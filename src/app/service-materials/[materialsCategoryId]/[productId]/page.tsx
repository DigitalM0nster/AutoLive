// src\app\service-materials\[materialsCategoryId]\[productId]\page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import { getProductById } from "@/lib/api";
import type { Product, ProductResponse } from "@/lib/types";

type PageParams = {
	params: {
		materialsCategoryId: string;
		productId: string;
	};
};

export default async function ProductPage({ params }: PageParams) {
	const categoryId = decodeURIComponent(params.materialsCategoryId || "");
	const productId = decodeURIComponent(params.productId || "");

	if (!productId) {
		return <div className="text-center">Загрузка...</div>;
	}

	const productData: ProductResponse = await getProductById(productId);
	console.log("Получаем данные продукта по ID", productData);

	if (!productData || productData.error) {
		return <div className="text-center">Ошибка загрузки данных</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={productId} />
				{productData.product ? (
					<div className={styles.productItem}>
						<div className={styles.imageBlock}>
							<img src={productData.product.image_url} alt={productData.product.name} />
						</div>

						<div className={styles.filtersBlock}>
							<div className={styles.filtersTitle}>Свойства:</div>
							<div className={styles.filtersList}>
								{productData.product.filters?.map((filter, filterIndex) => (
									<div key={`filter${filterIndex}`} className={styles.filterItem}>
										<div className={styles.name}>{filter.name}</div>
										<div className={styles.values}>
											{filter.selected_values.map((value, valueIndex) => (
												<div key={`filter${filterIndex}-value${valueIndex}`} className={styles.value}>
													{value.value}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>

						<div className={styles.descriptionBlock}>
							<div className={styles.textBlock}>
								<h1 className={`pageTitle ${styles.pageTitle}`}>{productData.product.name}</h1>
								<div className={styles.description}>
									Очень длинное описание. Очень длинное описание. Очень длинное описание. Очень длинное описание. Очень длинное описание. Очень длинное описание.
									Очень длинное описание.
								</div>
							</div>

							<div className={styles.buttonBlock}>
								<div className={styles.column}>
									<div className={styles.price}>Цена: {productData.product.price}₽</div>
									<div className="button">В корзину</div>
								</div>
							</div>
						</div>

						<div className={`${styles.buttonBlock} ${styles.mobile}`}>
							<div className={styles.column}>
								<div className={styles.price}>Цена: {productData.product.price}₽</div>
								<div className="button">В корзину</div>
							</div>
						</div>
					</div>
				) : (
					<div className="noProduct">Такого товара не существует...</div>
				)}
			</div>
		</div>
	);
}
