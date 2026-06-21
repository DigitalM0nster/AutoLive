import Link from "next/link";
import styles from "./styles.module.scss";
import CategoryPageClient from "./CategoryPageClient";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

async function loadCategoryData(categoryId: string) {
	const id = parseInt(categoryId);

	if (isNaN(id)) {
		throw new Error("Некорректный ID категории");
	}

	const [category, filters] = await Promise.all([
		prisma.category.findUnique({
			where: { id },
			include: {
				products: {
					include: {
						productFilterValues: {
							include: {
								filterValue: {
									include: { filter: true },
								},
							},
						},
					},
				},
			},
		}),
		prisma.filter.findMany({
			where: { categoryId: id },
			include: {
				values: {
					orderBy: { value: "asc" },
				},
			},
			orderBy: { id: "asc" },
		}),
	]);

	if (!category) {
		throw new Error("Категория не найдена");
	}

	if (category.visibleOnSite === false) {
		notFound();
	}

	const sanitizedProducts = category.products.map((product) => {
		const { supplierPrice, productFilterValues, ...rest } = product;

		const productFilters = productFilterValues.map((pfv) => ({
			filterId: pfv.filterValue.filterId,
			valueId: pfv.filterValueId,
			value: pfv.filterValue.value,
			filter: pfv.filterValue.filter,
		}));

		return {
			...rest,
			filters: productFilters,
		};
	});

	const formattedFilters = filters.map((filter) => ({
		id: filter.id,
		title: filter.title,
		type: filter.type,
		unit: filter.unit,
		values: filter.values.map((value) => ({
			id: value.id,
			value: value.value,
		})),
	}));

	return {
		category: {
			...category,
			products: sanitizedProducts,
			filters: formattedFilters,
		},
	};
}

function pluralPositions(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod100 >= 11 && mod100 <= 14) return "позиций";
	if (mod10 === 1) return "позиция";
	if (mod10 >= 2 && mod10 <= 4) return "позиции";
	return "позиций";
}

export default async function CategoryContent({ categoryId }: { categoryId: string }) {
	try {
		const categoryData = await loadCategoryData(categoryId);
		const clientSafeCategoryData = JSON.parse(JSON.stringify(categoryData));
		const productCount = categoryData.category.products?.length ?? 0;

		return (
			<>
				<Link href="/categories" className={styles.backLink}>
					Материалы для ТО
				</Link>

				<header className={styles.pageHeader}>
					{categoryData.category.image ? (
						<div className={styles.categoryHeroIcon}>
							<img src={categoryData.category.image} alt="" aria-hidden="true" />
						</div>
					) : null}

					<div className={styles.pageHeaderText}>
						<h1 className={`pageTitle ${styles.pageTitle}`}>{categoryData.category.title}</h1>
						<p className={`pageLead ${styles.pageLead}`}>
							{productCount > 0 ?
								<>
									<span className={styles.productCount}>{productCount.toLocaleString("ru-RU")}</span> {pluralPositions(productCount)} в категории —
									используйте фильтры и сортировку, чтобы быстро найти нужный материал.
								</>
							:	"В этой категории пока нет позиций. Загляните позже или выберите другую категорию."}
						</p>
					</div>
				</header>

				<CategoryPageClient categoryData={clientSafeCategoryData} />
			</>
		);
	} catch (error) {
		console.error("Ошибка при загрузке данных категории:", error);

		return (
			<>
				<Link href="/categories" className={styles.backLink}>
					Материалы для ТО
				</Link>
				<h1 className={`pageTitle ${styles.pageTitle}`}>Ошибка загрузки</h1>
				<div className={styles.errorState}>
					<p>Произошла ошибка при загрузке данных категории. Пожалуйста, попробуйте позже.</p>
				</div>
			</>
		);
	}
}
