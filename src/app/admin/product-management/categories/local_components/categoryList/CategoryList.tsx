"use client";

import React, { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import type { DragEndEvent } from "@dnd-kit/core";
import CategoryCard from "./CategoryCard";
import ConfirmModal from "@/components/ui/confirmModal/ConfirmModal";

export default function CategoryList({ initialCategories }: { initialCategories: { id: number; title: string }[] }) {
	const router = useRouter();
	const [items, setItems] = useState(initialCategories);
	const [modalOpen, setModalOpen] = useState(false);
	const [toDelete, setToDelete] = useState<{ id: number; title: string } | null>(null);

	useEffect(() => {
		setItems(initialCategories);
	}, [initialCategories]);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = items.findIndex((i) => i.id === active.id);
		const newIndex = items.findIndex((i) => i.id === over.id);
		const newItems = arrayMove(items, oldIndex, newIndex);

		setItems(newItems);
		fetch("/api/categories/reorder", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids: newItems.map((item) => item.id) }),
		});
	};

	const openConfirm = (id: number, title: string) => {
		setToDelete({ id, title });
		setModalOpen(true);
	};

	const closeConfirm = () => {
		setModalOpen(false);
		setToDelete(null);
	};

	const confirmDelete = async () => {
		if (!toDelete) return;

		try {
			const res = await fetch(`/api/categories/${toDelete.id}`, {
				method: "DELETE",
			});
			if (res.ok) {
				router.refresh();
			} else {
				alert("Ошибка при удалении категории");
			}
		} catch (err) {
			console.error("Ошибка удаления:", err);
			alert("Произошла ошибка при удалении категории");
		} finally {
			closeConfirm();
		}
	};

	return (
		<>
			<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
					<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
						{items.map((cat) => (
							<CategoryCard key={cat.id} id={cat.id} title={cat.title} onDeleteRequest={openConfirm} />
						))}
					</div>
				</SortableContext>
			</DndContext>

			<ConfirmModal
				open={modalOpen}
				title={`Удалить категорию "${toDelete?.title}"?`}
				message={`Вы уверены, что хотите безвозвратно удалить категорию "${toDelete?.title}"?`}
				confirmText="Удалить"
				cancelText="Отмена"
				onConfirm={confirmDelete}
				onCancel={closeConfirm}
			/>
		</>
	);
}
