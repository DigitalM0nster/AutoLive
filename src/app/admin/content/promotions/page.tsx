// src/app/admin/content/promotions/page.tsx
"use client";

import { Promotion } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import PromoCard from "./PromoCard";
import Loading from "@/components/ui/loading/Loading";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";

export default function PromotionsPage() {
	const [promos, setPromos] = useState<Promotion[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [promoToDelete, setPromoToDelete] = useState<Promotion | null>(null);

	const fetchPromos = async () => {
		setIsLoading(true);
		const res = await fetch("/api/promotions");
		const data = await res.json();

		const sorted = data.sort((a: Promotion, b: Promotion) => a.order - b.order);
		setPromos(sorted);
		setIsLoading(false);
	};

	// открывает модалку
	const openDeleteModal = (promo: Promotion) => {
		setPromoToDelete(promo);
		setIsModalOpen(true);
	};

	// вызывается при клике на “Удалить” в модалке
	const handleConfirmDelete = async () => {
		if (!promoToDelete) return;
		await fetch(`/api/promotions/${promoToDelete.id}`, { method: "DELETE" });
		setIsModalOpen(false);
		setPromoToDelete(null);
		await fetchPromos();
	};

	// отмена
	const handleCancelDelete = () => {
		setIsModalOpen(false);
		setPromoToDelete(null);
	};

	useEffect(() => {
		fetchPromos();
	}, []);

	const sensors = useSensors(useSensor(PointerSensor));

	const handleDragEnd = async (event: any) => {
		const { active, over } = event;
		if (active.id !== over?.id) {
			const oldIndex = promos.findIndex((p) => p.id === active.id);
			const newIndex = promos.findIndex((p) => p.id === over?.id);

			const newOrder = arrayMove(promos, oldIndex, newIndex);
			setPromos(newOrder);

			// 👇 Отправляем порядок на сервер
			const reordered = newOrder.map((item, index) => ({
				id: item.id,
				order: index,
			}));

			await fetch("/api/promotions/reorder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(reordered),
			});
		}
	};

	return (
		<div className="px-6 py-10 w-full max-w-7xl mx-auto mb-auto">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold">Акции</h1>
				<Link href="/admin/content/promotions/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
					Создать акцию
				</Link>
			</div>

			{isLoading ? (
				<Loading />
			) : promos.length === 0 ? (
				<p className="text-gray-600">Акций пока нет</p>
			) : (
				<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
					<SortableContext items={promos.map((promo) => promo.id)} strategy={verticalListSortingStrategy}>
						<div className="flex flex-col gap-4">
							{promos.map((promo) => (
								<PromoCard key={promo.id} promo={promo} onDelete={() => openDeleteModal(promo)} />
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}
			<ConfirmPopup
				open={isModalOpen}
				title="Удалить акцию?"
				message="Вы уверены, что хотите удалить эту акцию?"
				confirmText="Удалить"
				cancelText="Отмена"
				onConfirm={handleConfirmDelete}
				onCancel={handleCancelDelete}
			/>
		</div>
	);
}
