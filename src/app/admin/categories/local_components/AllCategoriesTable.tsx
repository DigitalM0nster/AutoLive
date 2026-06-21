"use client";

import React, { useEffect, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import styles from "./styles.module.scss";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import Loading from "@/components/ui/loading/Loading";
import SortableTableRow from "./SortableTableRow";

type Category = {
	id: number;
	title: string;
	image?: string;
	filtersCount: number;
	order: number;
	visibleOnSite?: boolean;
};

function categoriesLabel(count: number) {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return "категория";
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "категории";
	return "категорий";
}

export default function AllCategoriesTable() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
	const [search, setSearch] = useState("");

	const { role } = useAuthStore();

	const canDeleteCategories = () => role === "superadmin";
	const canUseDragAndDrop = !search.trim();

	useEffect(() => {
		const fetchCategories = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/categories", { credentials: "include" });
				const data = await res.json();
				const categoriesWithOrder = Array.isArray(data) ?
					data.map((cat: Category) => ({
						...cat,
						order: cat.order || 0,
					}))
				:	[];
				setCategories(categoriesWithOrder);
			} catch (e) {
				console.error("Ошибка загрузки категорий:", e);
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	const resetFilters = () => {
		setSearch("");
	};

	const filterAndOrderCategories = (data: Category[]) => {
		const filtered = search.trim() ?
			data.filter((cat) => cat.title.toLowerCase().includes(search.trim().toLowerCase()))
		:	data;

		return [...filtered].sort((a, b) => a.order - b.order);
	};

	const confirmDelete = async () => {
		if (!categoryToDelete) return;

		try {
			const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
				method: "DELETE",
			});

			if (res.ok) {
				const result = await res.json();
				setCategories(categories.filter((cat) => cat.id !== categoryToDelete.id));
				setShowDeleteModal(false);
				setCategoryToDelete(null);

				let message = "Категория успешно удалена";
				if (result.deletedProducts > 0 || result.deletedDepartments > 0) {
					message += `\nУдалено товаров: ${result.deletedProducts}\nОтделов освобождено от категории: ${result.deletedDepartments}`;
				}
				showSuccessToast(message);
			} else {
				const error = await res.json();
				showErrorToast(`Ошибка: ${error.error}`);
			}
		} catch (error) {
			console.error("Ошибка при удалении категории:", error);
			showErrorToast("Произошла ошибка при удалении категории");
		}
	};

type CategoryDeleteTarget = Pick<Category, "id" | "title" | "image" | "filtersCount" | "visibleOnSite">;

	const requestDelete = (category: CategoryDeleteTarget) => {
		const full = categories.find((item) => item.id === category.id) ?? null;
		setCategoryToDelete(full ?? ({ ...category, order: 0 } as Category));
		setShowDeleteModal(true);
	};

	const cancelDelete = () => {
		setShowDeleteModal(false);
		setCategoryToDelete(null);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = categories.findIndex((cat) => cat.id === active.id);
		const newIndex = categories.findIndex((cat) => cat.id === over.id);
		const newCategories = arrayMove(categories, oldIndex, newIndex);

		setCategories(newCategories);

		try {
			const res = await fetch("/api/categories/reorder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ids: newCategories.map((cat) => cat.id),
					orders: newCategories.map((cat, index) => ({ id: cat.id, order: index + 1 })),
				}),
			});

			if (res.ok) {
				setCategories((prevCategories) =>
					prevCategories.map((cat) => {
						const newOrder = newCategories.find((newCat) => newCat.id === cat.id);
						return newOrder ? { ...cat, order: newOrder.order } : cat;
					}),
				);
				showSuccessToast("Порядок категорий успешно обновлен");
			} else {
				showErrorToast("Ошибка при обновлении порядка категорий");
			}
		} catch (error) {
			console.error("Ошибка при обновлении порядка категорий:", error);
			showErrorToast("Произошла ошибка при обновлении порядка категорий");
		}
	};

	const processedCategories = filterAndOrderCategories(categories);

	const listToolbar = (
		<div className={styles.listToolbar}>
			<div className={styles.listToolbarMain}>
				{!loading ?
					<span className={styles.listCount}>
						{processedCategories.length} {categoriesLabel(processedCategories.length)}
					</span>
				:	null}
				{canUseDragAndDrop && !loading && processedCategories.length > 0 ?
					<span className={styles.dragHint}>Перетаскивайте строки для изменения порядка</span>
				:	null}
			</div>

			{canDeleteCategories() ?
				<Link href="/admin/categories/create" className={styles.createLink}>
					+ Создать
				</Link>
			:	null}
		</div>
	);

	const listBody =
		loading ?
			<div className={styles.listState}>
				<Loading />
			</div>
		: processedCategories.length === 0 ?
			<div className={styles.listState}>{search ? "Категории не найдены" : "Нет категорий"}</div>
		:	<div className={styles.categoriesList}>
				{processedCategories.map((cat) => (
					<SortableTableRow
						key={cat.id}
						id={cat.id}
						title={cat.title}
						image={cat.image}
						filtersCount={cat.filtersCount}
						visibleOnSite={cat.visibleOnSite !== false}
						onDeleteRequest={requestDelete}
						canDelete={canDeleteCategories()}
						canDrag={canUseDragAndDrop}
					/>
				))}
			</div>;

	const categoriesPanel = (
		<div className={styles.categoriesPanel}>
			<div className={styles.categoriesListCard}>
				{listToolbar}
				{listBody}
			</div>
		</div>
	);

	return (
		<>
			<div className={`tableContent ${styles.tableContent}`}>
				<FiltersBlock
					activeFilters={[]}
					onResetFilters={resetFilters}
					searchValue={search}
					onSearchChange={setSearch}
					searchPlaceholder="Поиск по названию категории..."
					showSearch={true}
				/>

				{canUseDragAndDrop ?
					<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
						<SortableContext items={processedCategories.map((cat) => cat.id)} strategy={verticalListSortingStrategy}>
							{categoriesPanel}
						</SortableContext>
					</DndContext>
				:	categoriesPanel}
			</div>

			<ConfirmPopup open={showDeleteModal} title="Подтверждение удаления" confirmText="Удалить" cancelText="Отмена" onConfirm={confirmDelete} onCancel={cancelDelete}>
				<div>
					<p>
						Вы действительно хотите удалить категорию <strong>&ldquo;{categoryToDelete?.title}&rdquo;</strong>?
					</p>
					<p className={styles.warningText}>⚠️ Это действие нельзя отменить. При удалении категории:</p>
					<ul className={styles.warningList}>
						<li>Все товары в этой категории будут удалены</li>
						<li>У отделов будет убрана эта категория (они останутся в системе)</li>
						<li>Все связи с фильтрами будут удалены</li>
					</ul>
				</div>
			</ConfirmPopup>
		</>
	);
}
