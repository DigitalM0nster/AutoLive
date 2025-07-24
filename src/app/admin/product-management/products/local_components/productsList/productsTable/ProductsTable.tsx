// src/app/admin/product-management/products/local_components/productsList/productsTable/ProductsTable.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import ProductRow from "./productRow/ProductRow";
import TableSkeleton from "../../TableSkeleton";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import DuplicateProductModal from "./DuplicateProductModal";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";
import type { NewProduct } from "@/lib/types";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

export default function ProductsTable() {
	// 🔐 Авторизация
	const { role } = useAuthStore();
	const isManager = role === "manager";
	const canDelete = role === "admin" || role === "superadmin";

	// 🧠 Стор состояния продуктов
	const {
		products,
		fetchProducts,
		loading,
		page,
		total,
		limit,
		setPage,
		deleteProduct,
		deletableProductId,
		setDeletableProductId,
		departments,
		loadReferenceData,
		isAddingNewProduct,
		setIsAddingNewProduct,
		selectedProductIds,
		selectAllProductsPerPage,
		clearSelection,
		selectAllMatchingProducts,
		sortBy,
		sortOrder,
		setSorting,
	} = useProductsStore();

	// 📦 Локальные состояния
	const [activeModal, setActiveModal] = useState(false);
	const [exporting, setExporting] = useState(false);
	const headerCheckboxRef = useRef<HTMLInputElement>(null);

	// 🧾 Новый товар по умолчанию
	const emptyProduct: NewProduct = {
		departmentId: departments[0]?.id || 0,
		brand: "",
		sku: "",
		title: "",
		description: "",
		supplierPrice: null,
		price: 0,
		categoryId: null,
		image: null,
		filters: [],
	};

	// 📦 Получение справочников и данных
	useEffect(() => {
		loadReferenceData();
	}, [loadReferenceData]);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts, page]);

	// ☑️ Индикация промежуточного состояния чекбокса
	useEffect(() => {
		if (headerCheckboxRef.current) {
			headerCheckboxRef.current.indeterminate = selectedProductIds.length > 0 && selectedProductIds.length < products.length;
		}
	}, [selectedProductIds, products.length]);

	// 🧹 Модалка подтверждения удаления
	const openConfirmPopup = (id: number | null) => {
		setDeletableProductId(id);
		setActiveModal(true);
	};

	// 🧾 Сохранение нового товара
	const handleSaveNew = async (p: NewProduct) => {
		try {
			const res = await fetch("/api/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(p),
			});
			if (!res.ok) throw new Error();
			showSuccessToast("Товар добавлен");
			setIsAddingNewProduct(false);
			fetchProducts();
		} catch {
			showErrorToast("Ошибка при добавлении");
		}
	};

	// 📊 Сортировка колонок
	const handleSort = (field: string) => {
		setSorting(field);
		fetchProducts();
	};

	const getSortIcon = (field: string) => {
		if (sortBy !== field) return <ChevronsUpDown className="w-4 h-4 inline-block ml-1 text-gray-400" />;
		return sortOrder === "asc" ? <ChevronUp className="w-4 h-4 inline-block ml-1 text-blue-600" /> : <ChevronDown className="w-4 h-4 inline-block ml-1 text-blue-600" />;
	};

	// 📤 Экспорт товаров
	const handleExport = async () => {
		if (selectedProductIds.length === 0) return;
		setExporting(true);
		try {
			const res = await fetch("/api/products/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: selectedProductIds }),
			});
			if (!res.ok) throw new Error("Ошибка экспорта");

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "products.xlsx";
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			showSuccessToast("Экспорт выполнен");
		} catch {
			showErrorToast("Ошибка при экспорте");
		} finally {
			setExporting(false);
		}
	};

	// 🔢 Общее количество страниц
	const totalPages = Math.ceil(total / limit);

	return (
		<>
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-medium">Список товаров</h2>
				{!isAddingNewProduct && !isManager && (
					<button onClick={() => setIsAddingNewProduct(true)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
						+ Добавить товар
					</button>
				)}
			</div>

			{/* ТАБЛИЦА С ТОВАРАМИ */}
			<div className="overflow-x-auto shadow rounded-lg">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-200">
						<tr className="sticky top-0">
							<th
								className="px-3 py-2 w-8 text-center cursor-pointer"
								onClick={() => {
									if (selectedProductIds.length >= 1) {
										clearSelection();
									} else {
										selectAllProductsPerPage();
									}
								}}
							>
								<input
									ref={headerCheckboxRef}
									type="checkbox"
									checked={selectedProductIds.length >= products.length && products.length > 0}
									onChange={(e) => e.stopPropagation()}
									className="cursor-pointer h-4 w-4"
								/>
							</th>
							{role === "superadmin" && (
								<th className="px-4 py-2 w-24 text-xs cursor-pointer select-none" onClick={() => handleSort("departmentTitle")}>
									Отдел {getSortIcon("departmentTitle")}
								</th>
							)}

							<th className="px-4 py-2 w-24 text-xs cursor-pointer select-none" onClick={() => handleSort("brand")}>
								Бренд {getSortIcon("brand")}
							</th>
							<th className="px-4 py-2 w-24 text-xs cursor-pointer select-none" onClick={() => handleSort("sku")}>
								Артикул {getSortIcon("sku")}
							</th>
							<th className="px-4 py-2 w-32 text-xs cursor-pointer select-none" onClick={() => handleSort("title")}>
								Название {getSortIcon("title")}
							</th>
							<th className="px-4 py-2 w-48 text-xs">Описание</th>
							<th className="px-4 py-2 w-24 text-xs cursor-pointer select-none" onClick={() => handleSort("supplierPrice")}>
								Закуп. цена {getSortIcon("supplierPrice")}
							</th>
							<th className="px-4 py-2 w-24 text-xs cursor-pointer select-none" onClick={() => handleSort("price")}>
								Цена {getSortIcon("price")}
							</th>
							<th className="px-4 py-2 w-24 text-xs cursor-pointer select-none" onClick={() => handleSort("categoryTitle")}>
								Категория {getSortIcon("categoryTitle")}
							</th>
							<th className="px-4 py-2 w-20 text-xs text-center">Изобр.</th>
							{(role === "superadmin" || role === "admin") && <th className="px-4 py-2 w-20 text-center">Действия</th>}
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{isAddingNewProduct && <ProductRow key="__new" product={emptyProduct} isNew onSaveNew={handleSaveNew} onCancelNew={() => setIsAddingNewProduct(false)} />}
						{loading ? (
							<tr>
								<td colSpan={11}>
									<TableSkeleton />
								</td>
							</tr>
						) : products.length > 0 ? (
							products.map((p) => <ProductRow key={p.id} product={p} openConfirmPopup={openConfirmPopup} className="hover:bg-gray-50 transition-colors" />)
						) : (
							<tr>
								<td colSpan={11} className="text-center text-gray-400 py-6">
									Ничего не найдено
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* МАССОВЫЕ ДЕЙСТВИЯ С ТОВАРАМИ */}
			<button
				onClick={async () => {
					if (selectedProductIds.length >= 1) {
						clearSelection();
					} else {
						try {
							const filters = Object.fromEntries(
								new URLSearchParams(window.location.search) // используем query, если фильтры в URL
							);
							await selectAllMatchingProducts(filters);
						} catch (e) {}
					}
				}}
				className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm mt-2 pt-1.5 pb-1.5"
			>
				{selectedProductIds.length >= 1 ? "Снять выделенные товары" : "Выделить все товары подходящие по заданным фильтрам"}
			</button>
			{selectedProductIds.length > 0 && (
				<div className="flex items-center gap-2 ml-auto mt-2 flex-wrap">
					<span className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">
						Выбрано: <strong>{selectedProductIds.length}</strong> товар{selectedProductIds.length === 1 ? "" : selectedProductIds.length < 5 ? "а" : "ов"}
					</span>
					<button disabled={exporting} onClick={handleExport} className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm">
						{exporting ? "Подготовка..." : "Экспорт"}
					</button>
					{canDelete && (
						<button disabled={exporting} onClick={() => setActiveModal(true)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
							Удалить
						</button>
					)}
				</div>
			)}

			{/* ПАГИНАЦИЯ */}
			{totalPages > 1 && (
				<div className="flex justify-center items-center mt-6 space-x-1">
					{(() => {
						const pages: (number | "...")[] = [];
						const add = (p: number) => {
							if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
						};

						add(1);
						if (page > 3) pages.push("...");
						add(page - 1);
						add(page);
						add(page + 1);
						if (page < totalPages - 2) pages.push("...");
						add(totalPages);

						return pages.map((p, idx) =>
							p === "..." ? (
								<span key={`dots-${idx}`} className="px-2 text-gray-500 select-none">
									...
								</span>
							) : (
								<button
									key={`page-${p}`}
									onClick={() => setPage(p)}
									className={`px-3 py-1 border border-gray-300 rounded ${p === page ? "bg-blue-100 text-blue-600 font-semibold" : "bg-white hover:bg-gray-100"}`}
								>
									{p}
								</button>
							)
						);
					})()}
				</div>
			)}

			{/* МОДАЛКА ДЛЯ УДАЛЕНИЯ */}
			<ConfirmPopup
				title={selectedProductIds.length > 1 ? `Удаление товаров (${selectedProductIds.length}шт.)` : "Удаление товара"}
				message={selectedProductIds.length > 1 ? "Удалить выбранные товары?" : "Удалить выбранный товар?"}
				open={activeModal}
				onCancel={() => {
					setActiveModal(false);
					setDeletableProductId(null);
				}}
				onConfirm={async () => {
					if (deletableProductId !== null) {
						try {
							await deleteProduct(deletableProductId);
							showSuccessToast("Товар успешно удалён");
						} catch {
							showErrorToast("Не удалось удалить товар");
						}
					} else if (selectedProductIds.length > 0) {
						try {
							const res = await fetch("/api/products/bulk-delete", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ ids: selectedProductIds }),
							});
							if (!res.ok) throw new Error();
							showSuccessToast("Товары удалены");
							clearSelection();
							fetchProducts();
						} catch {
							showErrorToast("Ошибка при массовом удалении");
						}
					}
					setActiveModal(false);
					setDeletableProductId(null);
				}}
			/>

			{/* МОДАЛКА ДЛЯ ДУБЛИКАТОВ */}
			<DuplicateProductModal />
		</>
	);
}
