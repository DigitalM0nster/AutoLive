"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

type SortableTableRowProps = {
	id: number;
	title: string;
	image?: string;
	filtersCount: number;
	onDeleteRequest: (category: any) => void;
	canDelete: boolean;
	canDrag: boolean; // Новый проп для определения возможности перетаскивания
};

export default function SortableTableRow({ id, title, image, filtersCount, onDeleteRequest, canDelete, canDrag }: SortableTableRowProps) {
	// Используем useSortable только если можно перетаскивать
	// Это оптимизация - не создаем лишние обработчики событий когда они не нужны
	const sortableProps = canDrag ? useSortable({ id }) : null;

	const { user } = useAuthStore();

	// Применяем стили только если можно перетаскивать
	// Стили включают transform для анимации перетаскивания и opacity для визуального эффекта
	const style =
		canDrag && sortableProps
			? {
					transform: CSS.Transform.toString(sortableProps.transform),
					transition: sortableProps.transition,
					opacity: sortableProps.isDragging ? 0.5 : 1,
			  }
			: {};

	// Получаем атрибуты и слушатели только если можно перетаскивать
	// Атрибуты включают data-* атрибуты для dnd-kit
	// Слушатели включают onMouseDown, onTouchStart и другие события для начала перетаскивания
	const dragAttributes = canDrag && sortableProps ? sortableProps.attributes : {};
	const dragListeners = canDrag && sortableProps ? sortableProps.listeners : {};
	const dragRef = canDrag && sortableProps ? sortableProps.setNodeRef : undefined;

	return (
		<tr ref={dragRef} style={style} className="tableRow verticalCenter">
			<td className={`tableCell dragCell ${canDrag ? "" : "disabled"}`} {...dragAttributes} {...dragListeners}>
				<div className="dragCellIcon">
					<GripVertical size={16} />
				</div>
			</td>
			<td className="tableCell idCell">{id}</td>
			<td className="tableCell imageCell">{image ? <img src={image} alt={title} className="image" /> : <div className="noImage">Нет изображения</div>}</td>
			<td className="tableCell">
				<Link href={`/admin/categories/${id}`} className="categoryLink">
					{title}
				</Link>
			</td>
			<td className="tableCell">{filtersCount}</td>
			{user?.role === "superadmin" ? (
				<td className="tableCell">
					<a href={`/admin/categories/${id}`} className={`button`}>
						Редактировать
					</a>
				</td>
			) : (
				<td className="tableCell">
					<a href={`/admin/categories/${id}`} className={`button`}>
						Подробнее
					</a>
				</td>
			)}
		</tr>
	);
}
