// src/app/admin/products/categories/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CategoryManager from "../local_components/categoryManager/CategoryManager"; // 👈 заменили импорт

type Props = {
	params: { id: string };
};

export default async function EditCategoryPage({ params }: Props) {
	const categoryId = Number(params.id);

	const category = await prisma.category.findUnique({
		where: { id: categoryId },
		include: {
			Filter: { include: { values: true } },
		},
	});

	if (!category) return notFound();

	return (
		<CategoryManager
			initialCategory={{
				id: category.id,
				title: category.title,
				image: category.image ?? undefined,
			}}
			initialFilters={category.Filter}
			isEdit={true}
		/>
	);
}
