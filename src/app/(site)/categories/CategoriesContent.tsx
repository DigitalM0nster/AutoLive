import Link from "next/link";
import styles from "./styles.module.scss";
import type { Category } from "@/lib/types";
import { getInternalApiBaseUrl } from "@/lib/internalApiBaseUrl";

async function loadCategoriesData(): Promise<Category[]> {
	const baseUrl = await getInternalApiBaseUrl();

	const categoriesRes = await fetch(`${baseUrl}/api/categories`, {
		next: { revalidate: 3600 },
	});

	if (!categoriesRes.ok) {
		console.error(`Ошибка API категорий: ${categoriesRes.status} ${categoriesRes.statusText}`);
		throw new Error(`Ошибка API категорий: ${categoriesRes.status}`);
	}

	const categoriesText = await categoriesRes.text();

	let categories: Category[];

	try {
		categories = JSON.parse(categoriesText);
	} catch (parseError) {
		console.error("Ошибка парсинга JSON:", parseError);
		throw new Error("Неверный формат ответа API");
	}

	if (!Array.isArray(categories)) {
		console.error("API категорий вернул не массив:", categories);
		throw new Error("Неверный формат данных категорий");
	}

	return categories;
}

function CategoryArrow() {
	return (
		<span className={styles.categoryArrow} aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
				<path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</span>
	);
}

function CategoriesList({ categories }: { categories: Category[] }) {
	if (categories.length === 0) {
		return (
			<div className="emptyState">
				<p>Категории пока не добавлены.</p>
				<p>Загляните позже или свяжитесь с магазином — поможем подобрать материалы.</p>
			</div>
		);
	}

	return (
		<div className={styles.categoryGrid}>
			{categories.map((category) => (
				<Link href={`/categories/${category.id}`} key={category.id} className={styles.categoryCard}>
					<div className={styles.categoryIcon}>
						{category.image ? <img src={category.image} alt="" aria-hidden="true" /> : <span className={styles.categoryIconFallback} aria-hidden="true" />}
					</div>
					<div className={styles.categoryBody}>
						<div className={styles.categoryBodyContent}>
							<h2 className={styles.categoryTitle}>{category.title}</h2>
							<p className={styles.categoryDesc}>Расходники и материалы для обслуживания</p>
						</div>
						<CategoryArrow />
					</div>
				</Link>
			))}
		</div>
	);
}

function ErrorMessage({ message }: { message: string }) {
	return <div className="emptyState">{message}</div>;
}

export default async function CategoriesContent() {
	try {
		const categories = await loadCategoriesData();
		return <CategoriesList categories={categories} />;
	} catch {
		return <ErrorMessage message="Не удалось загрузить категории. Попробуйте обновить страницу." />;
	}
}
