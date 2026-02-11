import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CategoryPageClient from "../local_components/CategoryPageClient";
import { Category, CategoryFilter } from "@/lib/types";
import { withDbRetry } from "@/lib/utils";

type PageParams = {
	params: Promise<{
		id: string;
	}>;
};

export default async function CategoryPage({ params }: PageParams) {
	const { id } = await params;

	// Получаем данные категории и все фильтры в withDbRetry — при обрыве соединения (Neon) запрос повторяется
	const [category, allFilters] = await withDbRetry(async () => {
		const cat = await prisma.category.findUnique({
			where: { id: Number(id) },
			include: {
				Filter: {
					include: {
						values: true,
					},
				},
			},
		});
		const filters = await prisma.filter.findMany({
			orderBy: { title: "asc" },
			include: {
				values: true,
			},
		});
		return [cat, filters] as const;
	});

	if (!category) {
		return notFound();
	}

	// Подготавливаем данные для клиентского компонента
	const categoryData: Category = {
		id: category.id,
		title: category.title,
		image: category.image || "",
		order: category.order || 0,
		filters:
			category.Filter?.map((filter) => ({
				id: filter.id,
				title: filter.title,
				type: filter.type as any, // Временно используем any, пока не обновим схему Prisma
				unit: filter.unit || undefined, // Добавляем единицу измерения
				description: undefined,
				required: false,
				values:
					filter.values?.map((value) => ({
						id: value.id,
						value: value.value,
						description: undefined,
					})) || [],
			})) || [],
	};

	const initialData = {
		category: categoryData,
		filters: categoryData.filters, // Передаем только фильтры, которые уже привязаны к категории
	};

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/categories/${id}`} className="tabButton active">
						Редактирование категории
					</Link>
					<Link href={`/admin/categories/${id}/logs`} className="tabButton">
						История изменений
					</Link>
				</div>
				<div className="tableContent">
					<CategoryPageClient initialData={initialData} />
				</div>
			</div>
		</div>
	);
}
