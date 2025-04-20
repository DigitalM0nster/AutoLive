// src/components/admin/products/DuplicateProductModal.tsx

"use client";

import React from "react";
import { useProductsStore } from "@/store/productsStore";
import { EditableProduct } from "@/lib/types";

export default function DuplicateProductModal() {
	// Получаем данные из стора
	const { duplicateInfo, categories, departments, clearDuplicateInfo, confirmDuplicateUpdate } = useProductsStore();

	// Если дубликатов нет — ничего не рендерим
	if (!duplicateInfo) return null;

	const { existing, pending } = duplicateInfo;
	// =============================
	// Утилиты отображения и сравнения
	// =============================

	const normalize = (v: any) => (v === null || v === undefined ? "" : String(v));
	const isDiff = (a: any, b: any) => normalize(a) !== normalize(b);

	const getCategoryTitle = (id: number | null) => categories.find((c) => c.id === id)?.title || "—";

	const getDepartmentName = (id: number | null) => departments.find((d) => d.id === id)?.name || "—";

	// Сравнение строк по символам: same | removed | added
	const diffChars = (oldStr: string, newStr: string) => {
		const diffs: { type: "same" | "added" | "removed"; value: string }[] = [];
		let i = 0,
			j = 0;

		while (i < oldStr.length || j < newStr.length) {
			const a = oldStr[i];
			const b = newStr[j];

			if (a === b) {
				diffs.push({ type: "same", value: a });
				i++;
				j++;
			} else {
				if (a) {
					diffs.push({ type: "removed", value: a });
					i++;
				}
				if (b) {
					diffs.push({ type: "added", value: b });
					j++;
				}
			}
		}

		return diffs;
	};

	// Подсветка удалённого текста (старое значение)
	const HighlightedOld = ({ oldText, newText }: { oldText: string; newText: string }) => {
		const diffs = diffChars(oldText, newText);
		return (
			<span className="whitespace-pre-wrap font-mono text-sm leading-relaxed break-words text-gray-800">
				{diffs.map((part, i) =>
					part.type === "removed" ? (
						<span key={i} className="bg-red-300">
							{part.value}
						</span>
					) : part.type === "same" ? (
						<span key={i}>{part.value}</span>
					) : null
				)}
			</span>
		);
	};

	// Подсветка добавленного текста (новое значение)
	const HighlightedNew = ({ oldText, newText }: { oldText: string; newText: string }) => {
		const diffs = diffChars(oldText, newText);
		return (
			<span className="whitespace-pre-wrap font-mono text-sm leading-relaxed break-words text-gray-800">
				{diffs.map((part, i) =>
					part.type === "added" ? (
						<span key={i} className="bg-emerald-400">
							{part.value}
						</span>
					) : part.type === "same" ? (
						<span key={i}>{part.value}</span>
					) : null
				)}
			</span>
		);
	};

	// Описание полей для сравнения
	const fields = [
		{ label: "Название", key: "title" },
		{ label: "Артикул", key: "sku" },
		{ label: "Бренд", key: "brand" },
		{
			label: "Закупочная цена",
			key: "supplierPrice",
			format: (v: any) => (v != null ? `${v} ₽` : "—"),
		},
		{
			label: "Цена",
			key: "price",
			format: (v: any) => (v != null ? `${v} ₽` : "—"),
		},
		{ label: "Описание", key: "description" },
		{
			label: "Категория",
			getValue: (p: EditableProduct) => getCategoryTitle(p.categoryId),
		},
		{
			label: "Отдел",
			getValue: (p: EditableProduct) => getDepartmentName(p.department?.id ?? p.departmentId ?? null),
		},
	];

	// Отображение изображения
	const renderImage = (url: string | null) =>
		url ? (
			<img src={url} alt="img" className="w-full max-w-[80px] aspect-square object-cover rounded shadow" />
		) : (
			<div className="text-xs text-gray-400 italic">Нет изображения</div>
		);

	return (
		<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-10 overflow-y-auto">
			<div className="relative bg-white rounded-xl shadow-2xl p-4 md:p-6 w-full max-w-5xl border border-gray-200">
				<h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800 text-center">Найден похожий товар</h2>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					{/* Существующий товар */}
					<div className="bg-gray-50 rounded-md p-4 border">
						<p className="font-medium text-gray-600 mb-2">Существующий товар</p>
						<div className="space-y-2">
							{fields.map(({ label, key, getValue, format }) => {
								const oldValue = getValue ? getValue(existing) : (existing as any)[key];
								const newValue = getValue ? getValue(pending) : (pending as any)[key];
								const isDifferent = isDiff(oldValue, newValue);
								const formatted = format ? format(oldValue) : oldValue || "—";
								return (
									<div key={label} className={`px-2 py-1 rounded ${isDifferent ? "bg-yellow-50" : ""}`}>
										<span className="text-gray-400">{label}:</span>{" "}
										{isDifferent ? (
											<HighlightedOld oldText={normalize(oldValue)} newText={normalize(newValue)} />
										) : (
											<span className="text-gray-800 font-medium">{formatted}</span>
										)}
									</div>
								);
							})}
							<div className="mt-2">
								<span className="text-gray-400">Изображение:</span>
								<div className="mt-1">{renderImage(existing.image ?? null)}</div>
							</div>
						</div>
					</div>

					{/* Новый товар */}
					<div className="bg-white rounded-md p-4 border">
						<p className="font-medium text-gray-600 mb-2">Новый товар</p>
						<div className="space-y-2">
							{fields.map(({ label, key, getValue, format }) => {
								const oldValue = getValue ? getValue(existing) : (existing as any)[key];
								const newValue = getValue ? getValue(pending) : (pending as any)[key];
								const isDifferent = isDiff(oldValue, newValue);
								const formatted = format ? format(newValue) : newValue || "—";
								return (
									<div key={label} className={`px-2 py-1 rounded ${isDifferent ? "bg-yellow-50" : ""}`}>
										<span className="text-gray-400">{label}:</span>{" "}
										{isDifferent ? (
											<HighlightedNew oldText={normalize(oldValue)} newText={normalize(newValue)} />
										) : (
											<span className="text-gray-800 font-medium">{formatted}</span>
										)}
									</div>
								);
							})}
							<div className="mt-2">
								<span className="text-gray-400">Изображение:</span>
								<div className="mt-1">{renderImage(pending.image ?? null)}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Кнопки */}
				<div className="hidden md:flex justify-end gap-3 mt-6">
					<button onClick={confirmDuplicateUpdate} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
						Обновить существующий товар
					</button>
					<button onClick={clearDuplicateInfo} className="px-5 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-800 transition">
						Отмена
					</button>
				</div>

				<div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-between gap-2 px-4 py-3 md:hidden">
					<button onClick={confirmDuplicateUpdate} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
						Обновить
					</button>
					<button onClick={clearDuplicateInfo} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-800 transition">
						Отмена
					</button>
				</div>
			</div>
		</div>
	);
}
