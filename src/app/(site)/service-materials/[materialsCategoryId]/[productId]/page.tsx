import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";

type PageParams = {
	params: Promise<{
		materialsCategoryId: string;
		productId: string;
	}>;
};

export default async function ProductPage({ params }: PageParams) {
	// безопасно извлекаем значения
	const { materialsCategoryId, productId } = await params;

	if (!productId) {
		return <div className="text-center">Загрузка...</div>;
	}

	const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
		cache: "no-store",
	});

	if (!res.ok) {
		return <div className="text-center">Ошибка загрузки продукта</div>;
	}

	const { product } = await res.json();

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu productId={productId} />
				<div className={styles.productItem}>
					<div className={styles.imageBlock}>
						{product.image ? <img src={product.image} alt={product.title} /> : <img className={styles.noImage} src="/images/no-image.png" alt="" />}
					</div>

					{product.filters?.length > 0 && (
						<div className={styles.filtersBlock}>
							<div className={styles.filtersTitle}>Свойства:</div>
							<div className={styles.filtersList}>
								{product.filters.map((filter: any, filterIndex: number) => (
									<div key={`filter${filterIndex}`} className={styles.filterItem}>
										<div className={styles.name}>{filter.title}</div>
										<div className={styles.values}>
											{filter.selected_values.map((value: any, valueIndex: number) => (
												<div key={`filter${filterIndex}-value${valueIndex}`} className={styles.value}>
													{value.value}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					<div className={styles.descriptionBlock}>
						<div className={styles.textBlock}>
							<h1 className={`pageTitle ${styles.pageTitle}`}>{product.title}</h1>
							<div className={styles.description}>{product.description || "Описание отсутствует."}</div>
						</div>

						<div className={styles.buttonBlock}>
							<div className={styles.column}>
								<div className={styles.price}>Цена: {product.price}₽</div>
								<div className={`button ${styles.button}`}>В корзину</div>
							</div>
						</div>
					</div>

					<div className={`${styles.buttonBlock} ${styles.mobile}`}>
						<div className={styles.column}>
							<div className={styles.price}>Цена: {product.price}₽</div>
							<div className={`button ${styles.button}`}>В корзину</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
