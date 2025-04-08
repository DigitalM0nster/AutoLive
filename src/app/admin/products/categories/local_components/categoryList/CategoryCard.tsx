// src\app\admin\products\categories\local_components\categoryList\CategoryCard.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
	id: number;
	title: string;
};

export default function CategoryCard({ id, title }: Props) {
	const router = useRouter();
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const handleDelete = async () => {
		const confirmed = confirm(`Точно хотите удалить категорию "${title}"?`);
		if (!confirmed) return;

		try {
			const res = await fetch(`/api/categories/${id}`, {
				method: "DELETE",
			});

			if (res.ok) {
				router.refresh(); // 🔄 Обновляем список категорий
			} else {
				alert("Ошибка при удалении категории");
			}
		} catch (err) {
			console.error("Ошибка удаления:", err);
			alert("Произошла ошибка при удалении категории");
		}
	};

	return (
		<div ref={setNodeRef} style={style} className="group p-6 rounded-2xl border bg-white/80 backdrop-blur shadow-md hover:shadow-xl hover:-translate-y-1 hover:bg-white">
			{/* Только эта область перетаскивается */}
			<div className="cursor-grab active:cursor-grabbing flex items-center gap-3 mb-4" {...attributes} {...listeners}>
				<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center shadow">
					<Settings className="w-5 h-5" />
				</div>

				<h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">{title}</h3>
			</div>

			<div className="flex justify-between items-center text-sm">
				<Link href={`/admin/products/categories/${id}`} className="text-blue-600 hover:underline font-medium">
					Редактировать
				</Link>
				<button type="button" onClick={handleDelete} className="text-red-600 hover:underline font-medium">
					Удалить
				</button>
			</div>
		</div>
	);
}
