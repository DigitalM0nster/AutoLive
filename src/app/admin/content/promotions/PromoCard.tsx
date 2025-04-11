// src/components/admin/promotions/PromoCard.tsx
"use client";

import Link from "next/link";
import { Promotion } from "@/lib/types";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
	promo: Promotion;
	onDelete: () => void;
};

export default function PromoCard({ promo, onDelete }: Props) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promo.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} className="flex gap-4 items-center bg-white rounded-xl shadow hover:shadow-md border border-black/10 px-4 py-3">
			{/* Перетаскиватель */}
			<div {...listeners} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing" title="Перетащить">
				<GripVertical size={18} />
			</div>

			{/* Изображение */}
			{promo.image && <img src={promo.image} alt={promo.title} className="w-28 h-20 object-cover rounded-lg border" />}

			{/* Контент */}
			<div className="flex-1">
				<h3 className="text-lg font-semibold">{promo.title}</h3>
				<p className="text-sm text-gray-600 line-clamp-2">{promo.description}</p>
				{promo.buttonText && promo.buttonLink && (
					<a href={promo.buttonLink} target="_blank" className="text-blue-600 text-sm underline hover:text-blue-800">
						{promo.buttonText}
					</a>
				)}
			</div>

			{/* Действия */}
			<div className="flex flex-col gap-2 items-end">
				<Link href={`/admin/content/promotions/${promo.id}`} className="text-blue-600 hover:underline text-sm">
					Редактировать
				</Link>
				<button onClick={onDelete} className="text-red-600 hover:underline text-sm">
					Удалить
				</button>
			</div>
		</div>
	);
}
