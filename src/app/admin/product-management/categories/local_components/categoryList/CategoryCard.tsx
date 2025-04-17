"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings } from "lucide-react";
import Link from "next/link";

type Props = {
	id: number;
	title: string;
	onDeleteRequest: (id: number, title: string) => void;
};

export default function CategoryCard({ id, title, onDeleteRequest }: Props) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="group p-6 rounded-2xl border border-black/10 bg-white/80 backdrop-blur shadow-md hover:shadow-xl hover:-translate-y-1 hover:bg-white"
		>
			<div className="cursor-grab active:cursor-grabbing flex items-center gap-3 mb-4" {...attributes} {...listeners}>
				<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center shadow">
					<Settings className="w-5 h-5" />
				</div>

				<h3 className="text-xl font-semibold text-gray-800 transition">{title}</h3>
			</div>

			<div className="flex justify-between items-center text-sm">
				<Link href={`/admin/product-management/categories/${id}`} className="text-blue-600 hover:underline font-medium">
					Редактировать
				</Link>
				<button type="button" onClick={() => onDeleteRequest(id, title)} className="text-red-600 hover:underline font-medium">
					Удалить
				</button>
			</div>
		</div>
	);
}
