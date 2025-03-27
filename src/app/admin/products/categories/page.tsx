// src/app/admin/products/categories/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CategoryList from "./CategoryList";

export default async function CategoriesPage() {
	const categories = await prisma.category.findMany({
		orderBy: { order: "asc" },
	});

	return (
		<div className="px-6 py-10 max-w-7xl mx-auto">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-extrabold text-gray-900 mb-1">Категории товаров</h1>
					<p className="text-gray-500 text-sm">Редактируйте, удаляйте или добавляйте новые категории товаров.</p>
				</div>
				<Link href="/admin/products/categories/create" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow">
					+ Новая категория
				</Link>
			</div>

			<CategoryList initialCategories={categories.map((c) => ({ id: c.id, title: c.title }))} />
		</div>
	);
}
