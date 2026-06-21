import Link from "next/link";
import styles from "./styles.module.scss";
import ProductPurchaseActions from "./local_components/ProductPurchaseActions";
import ProductSupportNote from "./local_components/ProductSupportNote";
import { prisma } from "@/lib/prisma";

type ProductFilter = {
	title: string;
	type: string;
	selected_values: { value: string }[];
};

function formatPrice(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function normalizeBrand(brand?: string | null): string | null {
	const value = brand?.trim();
	if (!value || value.toLowerCase() === "unknown") return null;
	return value;
}

function formatDescription(description?: string | null): string | null {
	const clean = description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
	return clean || null;
}

async function loadProductData(productId: string) {
	const id = parseInt(productId);

	if (isNaN(id)) {
		throw new Error("Некорректный ID товара");
	}

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

	const filters = product.productFilterValues.map((pfv) => ({
		title: pfv.filterValue.filter.title,
		type: pfv.filterValue.filter.type,
		selected_values: [{ value: pfv.filterValue.value }],
	}));

	const groupedFilters = filters.reduce<ProductFilter[]>((acc, filter) => {
		const existingFilter = acc.find((item) => item.title === filter.title);
		if (existingFilter) {
			existingFilter.selected_values.push(...filter.selected_values);
		} else {
			acc.push(filter);
		}
		return acc;
	}, []);

	const { supplierPrice, ...productWithoutSupplierPrice } = product;

	return {
		...productWithoutSupplierPrice,
		categoryTitle: product.category?.title || null,
		filters: groupedFilters,
	};
}

export default async function ProductContent({ productId }: { productId: string }) {
	const product = await loadProductData(productId);
	const brand = normalizeBrand(product.brand);
	const description = formatDescription(product.description);
	const hasSpecs = product.filters.length > 0;

	return (
		<article className={styles.productPage}>
			<div className={styles.productSheet}>
				<div className={styles.productTop}>
					<div className={styles.media}>
						{product.image ?
							<img src={product.image} alt={product.title} />
						:	<span className={styles.mediaPlaceholder} aria-hidden="true" />}
					</div>

					<div className={styles.summary}>
						<div className={styles.summaryHead}>
							{product.category ?
								<Link href={`/categories/${product.category.id}`} className={styles.categoryLink}>
									{product.category.title}
								</Link>
							:	null}

							<h1 className={`pageTitle ${styles.productTitle}`}>{product.title}</h1>

							{(product.sku || brand) ?
								<dl className={styles.factsList}>
									{product.sku ?
										<>
											<dt>Артикул</dt>
											<dd>{product.sku}</dd>
										</>
									:	null}
									{brand ?
										<>
											<dt>Бренд</dt>
											<dd>{brand}</dd>
										</>
									:	null}
								</dl>
							:	null}
						</div>

						<div className={styles.summaryFoot}>
							<div className={styles.priceWrap}>
								<span className={styles.priceLabel}>Цена</span>
								<span className={styles.priceValue}>{formatPrice(product.price)}</span>
							</div>

							<ProductPurchaseActions product={product} />

							<ProductSupportNote productTitle={product.title} />
						</div>
					</div>
				</div>

				{(description || hasSpecs) ?
					<div className={styles.productDetails}>
						{description ?
							<section className={styles.detailSection} aria-labelledby="product-description-title">
								<h2 id="product-description-title" className={styles.detailTitle}>
									Описание
								</h2>
								<p className={styles.detailText}>{description}</p>
							</section>
						:	null}

						{hasSpecs ?
							<section className={styles.detailSection} aria-labelledby="product-specs-title">
								<h2 id="product-specs-title" className={styles.detailTitle}>
									Характеристики
								</h2>
								<table className={styles.specsTable}>
									<tbody>
										{product.filters.map((filter, filterIndex) => (
											<tr key={`filter-${filterIndex}`}>
												<th scope="row">{filter.title}</th>
												<td>{filter.selected_values.map((value) => value.value).join(", ")}</td>
											</tr>
										))}
									</tbody>
								</table>
							</section>
						:	null}
					</div>
				:	<p className={styles.emptyNote}>
						Подробное описание и характеристики скоро появятся. Если нужна консультация —{" "}
						<Link href="/contacts">напишите нам</Link>.
					</p>
				}
			</div>
		</article>
	);
}
