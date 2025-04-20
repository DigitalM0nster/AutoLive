// src/app/admin/product-management/products/local_components/productsLogs/ProductLogDetails.tsx

"use client";
import { FC } from "react";

type LogType = {
	action: "Создание" | "Редактирование" | "Удаление";
	details: any;
	message: string | null;
};

type Row = {
	key?: string;
	label: string;
	before?: any;
	after?: any;
	value?: any;
};

const formatValue = (value: any, lastKey?: string): string => {
	if (lastKey === "image" && typeof value === "string" && value.trim() !== "") {
		return `<a href="${value}" target="_blank" class="text-blue-600 underline">Открыть</a>`;
	}
	if (value === null || value === undefined || value === "") return "—";
	if (typeof value === "number" && ["price", "supplierPrice"].includes(lastKey || "")) {
		return value.toLocaleString("ru-RU", { style: "currency", currency: "RUB" });
	}
	if (typeof value === "object") {
		if ("name" in value) return value.name;
		if ("title" in value) return value.title;
		if (Object.keys(value).length === 0) return "—";
		return JSON.stringify(value);
	}
	if (typeof value === "boolean") return value ? "Да" : "Нет";
	return String(value);
};

const renderCell = (value: any, key?: string, extraClass = "") => {
	const raw = formatValue(value, key);
	return <td className={`px-3 py-2 break-words max-w-[400px] ${extraClass}`} dangerouslySetInnerHTML={{ __html: raw }} />;
};

const ProductLogDetails: FC<LogType> = ({ action, details, message }) => {
	if (action === "Редактирование" && details?.after) {
		const after = details.after;
		const before = details.before || {};
		const changedKeys = new Set((details.diff || []).map((d: any) => d.key));

		const rows: Row[] = [
			{ key: "id", label: "ID", before: before.id, after: after.id },
			{ key: "title", label: "Название", before: before.title, after: after.title },
			{ key: "sku", label: "Артикул", before: before.sku, after: after.sku },
			{ key: "brand", label: "Бренд", before: before.brand, after: after.brand },
			{ key: "price", label: "Цена", before: before.price, after: after.price },
			{ key: "supplierPrice", label: "Закупочная цена", before: before.supplierPrice, after: after.supplierPrice },
			{ key: "department", label: "Отдел", before: before.department?.name ?? "—", after: after.department?.name ?? "—" },
			{ key: "category", label: "Категория", before: before.category?.title ?? "—", after: after.category?.title ?? "—" },
			{ key: "description", label: "Описание", before: before.description, after: after.description },
			{ key: "image", label: "Изображение", before: before.image, after: after.image },
		];

		return (
			<details className="text-sm text-gray-800 whitespace-pre-wrap">
				<summary className="cursor-pointer text-blue-600 hover:underline font-medium">Товар отредактирован — подробности</summary>
				<div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow max-w-3xl">
					<table className="min-w-full text-xs divide-y divide-gray-200">
						<thead className="bg-gray-100 text-gray-600">
							<tr>
								<th className="px-3 py-2 text-left font-medium w-48">Поле</th>
								<th className="px-3 py-2 text-left font-medium">Было</th>
								<th className="px-3 py-2 text-left font-medium">Стало</th>
							</tr>
						</thead>
						<tbody className="bg-white">
							{rows.map((row) => {
								const isChanged = changedKeys.has(row.key);
								return (
									<tr key={row.key} className="hover:bg-gray-50 transition-colors">
										<td className="px-3 py-2 text-gray-500 font-medium">{row.label}</td>
										{renderCell(row.before, row.key, isChanged ? "text-red-600" : "text-gray-500")}
										{renderCell(row.after, row.key, isChanged ? "text-green-700 font-medium" : "text-gray-900")}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</details>
		);
	}

	const baseTable = (rows: Row[], color: string, summaryText: string) => (
		<details className="text-sm text-gray-800 whitespace-pre-wrap">
			<summary className={`cursor-pointer ${color} hover:underline font-medium`}>{summaryText}</summary>
			<div className="mt-2 border border-gray-200 rounded-lg overflow-hidden shadow max-w-3xl">
				<table className="min-w-full text-xs divide-y divide-gray-200">
					<tbody className="bg-white">
						{rows.map((row, index) => (
							<tr key={index} className="hover:bg-gray-50 transition-colors">
								<td className="px-3 py-2 text-gray-500 font-medium w-48">{row.label}</td>
								{renderCell(row.value, row.key)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</details>
	);

	if (action === "Создание" && details?.after) {
		const after = details.after;
		const rows: Row[] = [
			{ key: "id", label: "ID", value: after.id },
			{ key: "title", label: "Название", value: after.title },
			{ key: "sku", label: "Артикул", value: after.sku },
			{ key: "brand", label: "Бренд", value: after.brand },
			{ key: "price", label: "Цена", value: after.price },
			{ key: "supplierPrice", label: "Закупочная цена", value: after.supplierPrice },
			{ key: "department", label: "Отдел", value: after.department?.name },
			{ key: "category", label: "Категория", value: after.category?.title },
			{ key: "description", label: "Описание", value: after.description },
			{ key: "image", label: "Изображение", value: after.image },
		];

		return baseTable(rows, "text-green-600", "Создан товар — подробности");
	}

	if (action === "Удаление" && details?.before) {
		const before = details.before;
		const rows: Row[] = [
			{ key: "id", label: "ID", value: before.id },
			{ key: "title", label: "Название", value: before.title },
			{ key: "sku", label: "Артикул", value: before.sku },
			{ key: "brand", label: "Бренд", value: before.brand },
			{ key: "price", label: "Цена", value: before.price },
			{ key: "supplierPrice", label: "Закупочная цена", value: before.supplierPrice },
			{ key: "department", label: "Отдел", value: before.department?.name },
			{ key: "category", label: "Категория", value: before.category?.title },
			{ key: "description", label: "Описание", value: before.description },
			{ key: "image", label: "Изображение", value: before.image },
		];

		return baseTable(rows, "text-red-600", "Удалён товар — подробности");
	}

	return message || <span className="text-gray-400 italic">—</span>;
};

export default ProductLogDetails;
