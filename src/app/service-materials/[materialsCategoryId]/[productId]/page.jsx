import styles from "./styles.module.scss";
import NavigationMenu from "@/components/navigationMenu/NavigationMenu";
import { getProductById } from "@/app/lib/api";

export default async function productPage({ params }) {
	const awaitedParams = await params;

	const categoryId = awaitedParams?.materialsCategoryId ? decodeURIComponent(awaitedParams.materialsCategoryId) : null;
	const productId = awaitedParams?.productId ? decodeURIComponent(awaitedParams.productId) : null;

	if (!productId) {
		return <div className="text-center">Загрузка...</div>;
	}

	const productData = await getProductById(productId);
	console.log(productData.product);

	if (!productData || productData.error) {
		return <div className="text-center">Ошибка загрузки данных</div>;
	}

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={productId} />
				<h1 className={`pageTitle ${styles.pageTitle}`}>{productData?.product?.name}</h1>
				{productData.product && (
					<div className={styles.productItem}>
						<div className={styles.leftBlock}>
							<div className={styles.imageBlock}>
								<img src={productData.product.image_url} alt={productData.product.name} />
							</div>
						</div>
						<div className={styles.rightBlock}>
							<div className={styles.descriptionBlock}>
								<div className={styles.descriptionTitle}>Описание</div>
								<div className={styles.description}>
									Очень длинное описание. Очень длинное описание. Очень длинное описание. Очень длинное описаниею. Очень длинное описание . Очень длинное
									описаниеОчень длинное описаниеОчень длинное описание .Очень длинное описание
								</div>
							</div>
							<div className={styles.filtersBlock}>
								<div className={styles.filtersTitle}>Свойства:</div>
								{productData?.product?.filters?.map((filter, filterIndex) => {
									return (
										<div key={`filter${filterIndex}`} className="filter">
											<div className={styles.name}>{filter.name}</div>
											<div className={styles.values}>
												{filter.selected_values.map((value, valueIndex) => {
													return (
														<div key={`filter${filterIndex}-value${valueIndex}`} className={styles.value}>
															{value.value}
														</div>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
