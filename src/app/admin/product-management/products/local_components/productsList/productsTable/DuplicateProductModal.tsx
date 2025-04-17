// src/components/admin/products/DuplicateProductModal.tsx

import React from "react";
import { Category, EditableProduct } from "@/lib/types";

type Props = {
	existing: EditableProduct;
	pending: EditableProduct;
	categories: Category[];
	departments: { id: number; name: string }[];
	onEditArticle: () => void;
	onUpdateExisting: () => void;
};

export default function DuplicateProductModal({ existing, pending, categories, departments, onEditArticle, onUpdateExisting }: Props) {
	const getCategoryTitle = (id: number | null) => categories.find((c) => c.id === id)?.title || "—";
	const getDepartmentName = (id: number | null) => departments.find((d) => d.id === id)?.name || "—";

	const normalize = (v: any) => (v === null || v === undefined ? "" : v);
	const isDiff = (a: any, b: any) => normalize(a) !== normalize(b);

	const fields = [
		{ label: "Название", key: "title" },
		{ label: "Артикул", key: "sku" },
		{ label: "Бренд", key: "brand" },
		{ label: "Цена", key: "price", format: (v: any) => `${v} ₽` },
		{ label: "Описание", key: "description" },
		{
			label: "Категория",
			getValue: (p: EditableProduct) => getCategoryTitle(p.categoryId),
		},
		{
			label: "Отдел",
			getValue: (p: EditableProduct) => getDepartmentName(p.department?.id || null),
		},
	];

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
					<div className="bg-gray-50 rounded-md p-4 border">
						<p className="font-medium text-gray-600 mb-2">Существующий товар</p>
						<div className="space-y-2">
							{fields.map(({ label, key, getValue, format }) => {
								const oldValue = getValue ? getValue(existing) : (existing as any)[key];
								const newValue = getValue ? getValue(pending) : (pending as any)[key];
								const isDifferent = isDiff(oldValue, newValue);
								const formatted = format ? format(oldValue) : oldValue || "—";

								return (
									<div key={label} className={`px-2 py-1 rounded ${isDifferent ? "bg-amber-50 border border-amber-200" : ""}`}>
										<span className="text-gray-400">{label}:</span> <span className="text-gray-800 font-medium">{formatted}</span>
									</div>
								);
							})}
							<div className="mt-2">
								<span className="text-gray-400">Изображение:</span> <div className="mt-1">{renderImage(existing.image ?? null)}</div>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-md p-4 border">
						<p className="font-medium text-gray-600 mb-2">Новый товар</p>
						<div className="space-y-2">
							{fields.map(({ label, key, getValue, format }) => {
								const oldValue = getValue ? getValue(existing) : (existing as any)[key];
								const newValue = getValue ? getValue(pending) : (pending as any)[key];
								const isDifferent = isDiff(oldValue, newValue);
								const formatted = format ? format(newValue) : newValue || "—";

								return (
									<div key={label} className={`px-2 py-1 rounded ${isDifferent ? "bg-amber-50 border border-amber-200" : ""}`}>
										<span className="text-gray-400">{label}:</span> <span className="text-gray-800 font-medium">{formatted}</span>
									</div>
								);
							})}
							<div className="mt-2">
								<span className="text-gray-400">Изображение:</span> <div className="mt-1">{renderImage(pending.image ?? null)}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Фиксированное меню на мобилке */}
				<div className="hidden md:flex justify-end gap-3 mt-6">
					<button onClick={onUpdateExisting} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
						Обновить существующий товар
					</button>
					<button onClick={onEditArticle} className="px-5 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-800 transition">
						Отмена
					</button>
				</div>

				{/* Мобильная панель */}
				<div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-between gap-2 px-4 py-3 md:hidden">
					<button onClick={onUpdateExisting} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
						Обновить
					</button>
					<button onClick={onEditArticle} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-800 transition">
						Отмена
					</button>
				</div>
			</div>
		</div>
	);
}
