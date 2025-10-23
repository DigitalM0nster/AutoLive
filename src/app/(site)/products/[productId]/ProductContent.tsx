import styles from "./styles.module.scss";

// Функция для загрузки данных товара
// Вынесена отдельно для лучшей читаемости и тестируемости
async function loadProductData(productId: string) {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

	const res = await fetch(`${baseUrl}/api/products/${productId}/public`, {
		cache: "no-store",
	});

	if (!res.ok) {
		throw new Error(`Ошибка загрузки товара: ${res.status}`);
	}

	const { product } = await res.json();

	if (!product) {
		throw new Error("Товар не найден");
	}

	return product;
}

// Компонент для отображения контента страницы товара
// Вынесен в отдельный компонент для работы с Suspense
export default async function ProductContent({ productId }: { productId: string }) {
	// Загружаем данные
	const product = await loadProductData(productId);

	// Рендерим контент
	return (
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
	);
}
