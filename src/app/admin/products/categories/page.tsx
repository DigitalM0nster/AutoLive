// src/app/admin/products/categories/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";

export default async function CategoriesPage() {
	const categories = await prisma.category.findMany({
		orderBy: { title: "asc" },
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

			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{categories.map((cat) => (
					<div
						key={cat.id}
						className="group p-6 rounded-2xl border bg-white/80 backdrop-blur shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white"
					>
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center shadow">
								<Settings className="w-5 h-5" />
							</div>
							<h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">{cat.title}</h3>
						</div>

						<div className="flex justify-between items-center text-sm">
							<Link href={`/admin/products/categories/${cat.id}`} className="text-blue-600 hover:underline font-medium">
								Редактировать
							</Link>
							<form action={`/api/categories/${cat.id}/delete`} method="POST">
								<button type="submit" className="text-red-600 hover:underline font-medium">
									Удалить
								</button>
							</form>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
