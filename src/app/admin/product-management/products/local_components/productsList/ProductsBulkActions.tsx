"use client";

import { useState } from "react";
import ConfirmModal from "@/components/ui/confirmModal/ConfirmModal";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";

type Props = {
	selectedProductIds: (number | string)[];
	setSelectedProductIds: (ids: (number | string)[]) => void;
	fetchProducts: () => void;
	buildFilterParams: () => URLSearchParams;
};

export default function ProductsBulkActions({ selectedProductIds, setSelectedProductIds, fetchProducts, buildFilterParams }: Props) {
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const handleToggleSelection = async () => {
		if (selectedProductIds.length > 0) {
			setSelectedProductIds([]);
			return;
		}

		try {
			const res = await fetch(`/api/products/filtered-products?${buildFilterParams().toString()}`);
			const data = await res.json();
			setSelectedProductIds(data.ids || []);
		} catch (err) {
			console.error("Ошибка при выборе всех товаров:", err);
		}
	};

	const handleDelete = async () => {
		try {
			const res = await fetch("/api/products/bulk-delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: selectedProductIds }),
			});
			if (res.ok) {
				showSuccessToast("Товары удалены");
				setSelectedProductIds([]);
				fetchProducts();
			} else {
				const error = await res.json();
				showErrorToast(error?.error || "Ошибка при удалении");
			}
		} catch (err) {
			console.error("Ошибка при удалении:", err);
			showErrorToast("Ошибка сети");
		} finally {
			setShowDeleteModal(false);
		}
	};

	const handleExport = async () => {
		try {
			const res = await fetch("/api/products/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: selectedProductIds }),
			});
			if (res.ok) {
				const blob = await res.blob();
				const url = window.URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = "products.xlsx";
				link.click();
				window.URL.revokeObjectURL(url);
			} else {
				console.error("Ошибка при экспорте");
			}
		} catch (err) {
			console.error("Ошибка при экспорте", err);
		}
	};

	return (
		<>
			<div className="mt-4 flex items-center gap-4">
				<button
					onClick={handleToggleSelection}
					className={`text-sm px-4 py-2 rounded ${
						selectedProductIds.length > 0 ? "bg-gray-300 text-gray-800 hover:bg-gray-400" : "bg-blue-500 text-white hover:bg-blue-600"
					}`}
				>
					{selectedProductIds.length > 0 ? "Снять выделение" : "Выделить все товары по фильтру"}
				</button>

				<span className="text-sm text-gray-600">Выбрано: {selectedProductIds.length}</span>

				{selectedProductIds.length > 0 && (
					<div className="flex gap-2 ml-4">
						<button onClick={() => setShowDeleteModal(true)} className="text-sm px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">
							Удалить выбранные товары
						</button>

						<button onClick={handleExport} className="text-sm px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">
							Экспорт в Excel
						</button>
					</div>
				)}
			</div>

			<ConfirmModal
				open={showDeleteModal}
				title="Удаление товаров"
				message={`Вы точно хотите удалить ${selectedProductIds.length} товар(а)?`}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={handleDelete}
			/>
		</>
	);
}
