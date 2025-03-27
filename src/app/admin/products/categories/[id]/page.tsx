// src/app/admin/categories/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CategoryEditForm from "./CategoryEditForm";
import CategoryFiltersManager from "./CategoryFilterManger";

type Props = {
	params: { id: string };
};

export default async function EditCategoryPage({ params }: Props) {
	const categoryId = Number(params.id);

	const category = await prisma.category.findUnique({
		where: { id: categoryId },
		include: {
			Filter: {
				include: { values: true },
			},
		},
	});

	if (!category) return notFound();

	// 🛠️ Приводим null → undefined
	const sanitizedCategory = {
		...category,
		description: category.description ?? undefined,
		image: category.image ?? undefined,
	};

	return (
		<div className="px-6 py-10 max-w-4xl mx-auto space-y-10">
			<div>
				<h1 className="text-3xl font-extrabold text-gray-900 mb-2">Редактировать категорию</h1>
				<p className="text-gray-500 text-sm">Измените данные категории и настройте фильтры, связанные с ней.</p>
			</div>

			<div className="bg-white p-6 rounded-xl shadow space-y-6 border">
				<CategoryEditForm category={sanitizedCategory} />
			</div>

			<div className="bg-white p-6 rounded-xl shadow space-y-6 border">
				<CategoryFiltersManager categoryId={category.id} initialFilters={category.Filter} />
			</div>
		</div>
	);
}
