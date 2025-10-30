import styles from "./styles.module.scss";
import AddToCartButton from "./AddToCartButton";
import { prisma } from "@/lib/prisma";

// Функция для загрузки данных товара напрямую из базы данных
// Используем Prisma напрямую вместо HTTP-запроса к API
// Это намного быстрее, так как нет лишнего HTTP-круга через сеть
async function loadProductData(productId: string) {
	const id = parseInt(productId);

	if (isNaN(id)) {
		throw new Error("Некорректный ID товара");
	}

	// Прямой запрос к базе данных с теми же include, что были в API
	// Получаем товар со всеми связанными данными
	const product = await prisma.product.findUnique({
		where: { id },
		include: {
			department: { select: { id: true, name: true } },
			category: { select: { id: true, title: true } },
			productFilterValues: {
				include: {
					filterValue: {
						include: {
							filter: { select: { id: true, title: true, type: true } },
						},
					},
				},
			},
		},
	});

	if (!product) {
		throw new Error("Товар не найден");
	}

	// Преобразуем фильтры в нужный формат (такая же логика, как в API)
	// Группируем фильтры по названию для удобного отображения
	const filters = product.productFilterValues.map((pfv) => ({
		title: pfv.filterValue.filter.title,
		type: pfv.filterValue.filter.type,
		selected_values: [
			{
				value: pfv.filterValue.value,
			},
		],
	}));

	// Группируем фильтры с одинаковыми названиями
	const groupedFilters = filters.reduce((acc: any[], filter) => {
		const existingFilter = acc.find((f) => f.title === filter.title);
		if (existingFilter) {
			existingFilter.selected_values.push(...filter.selected_values);
		} else {
			acc.push(filter);
		}
		return acc;
	}, []);

	// Возвращаем товар в том же формате, что и API
	// Удаляем supplierPrice (закупочная цена, не должна показываться клиентам)
	const { supplierPrice, ...productWithoutSupplierPrice } = product;

	return {
		...productWithoutSupplierPrice,
		categoryTitle: product.category?.title || null,
		filters: groupedFilters,
	};
}

// Компонент для отображения контента страницы товара
export default async function ProductContent({ productId }: { productId: string }) {
	// Загружаем данные напрямую из базы данных
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
						<AddToCartButton product={product} />
					</div>
				</div>
			</div>

			<div className={`${styles.buttonBlock} ${styles.mobile}`}>
				<div className={styles.column}>
					<div className={styles.price}>Цена: {product.price}₽</div>
					<AddToCartButton product={product} />
				</div>
			</div>
		</div>
	);
}
