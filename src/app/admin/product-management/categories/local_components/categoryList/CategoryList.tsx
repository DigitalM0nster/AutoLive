// src\app\admin\product-management\categories\local_components\categoryList\CategoryList.tsx
"use client";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import CategoryCard from "./CategoryCard";

export default function CategoryList({ initialCategories }: { initialCategories: { id: number; title: string }[] }) {
	const [items, setItems] = useState(initialCategories);

	useEffect(() => {
		setItems(initialCategories);
	}, [initialCategories]);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over) return;

		if (active.id !== over.id) {
			const oldIndex = items.findIndex((i) => i.id === active.id);
			const newIndex = items.findIndex((i) => i.id === over.id);
			const newItems = arrayMove(items, oldIndex, newIndex);
			setItems(newItems);

			fetch("/api/categories/reorder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: newItems.map((item) => item.id) }),
			});
		}
	};

	return (
		<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
				<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
					{items.map((cat) => (
						<CategoryCard key={cat.id} id={cat.id} title={cat.title} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}
