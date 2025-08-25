import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CategoryPageClient from "../local_components/CategoryPageClient";
import { Category, CategoryFilter } from "@/lib/types";

type PageParams = {
	params: Promise<{
		id: string;
	}>;
};

export default async function CategoryPage({ params }: PageParams) {
	const { id } = await params;

	// Получаем данные категории
	const category = await prisma.category.findUnique({
		where: { id: Number(id) },
		include: {
			Filter: {
				include: {
					values: true,
				},
			},
		},
	});

	if (!category) {
		return notFound();
	}

	// Получаем все фильтры для выбора
	const allFilters = await prisma.filter.findMany({
		orderBy: { title: "asc" },
		include: {
			values: true,
		},
	});

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

	return <CategoryPageClient initialData={initialData} />;
}
