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
	if (value === null || value === undefined) return "—";
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
		];

		return (
			<details className="text-sm text-gray-800 whitespace-pre-wrap">
				<summary className="cursor-pointer text-blue-600 hover:underline font-medium">Товар отредактирован — подробности</summary>
				<div className="mt-2 border border-gray-200 rounded-md overflow-hidden shadow-sm max-w-3xl">
					<table className="table-auto w-full text-sm">
						<thead className="bg-gray-100 border-b">
							<tr>
								<th className="text-left py-2 px-3 text-gray-500 font-semibold w-48">Поле</th>
								<th className="text-left py-2 px-3 text-gray-500 font-semibold">Было</th>
								<th className="text-left py-2 px-3 text-gray-500 font-semibold">Стало</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const isChanged = changedKeys.has(row.key);
								return (
									<tr key={row.key} className="border-t hover:bg-gray-50 transition-colors">
										<td className="py-1.5 px-3 text-gray-600">{row.label}</td>
										<td className={`py-1.5 px-3 break-words max-w-[300px] ${isChanged ? "text-red-600" : "text-gray-500"}`}>{formatValue(row.before)}</td>
										<td className={`py-1.5 px-3 break-words max-w-[300px] ${isChanged ? "text-green-700 font-medium" : "text-gray-900"}`}>
											{formatValue(row.after)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</details>
		);
	}

	if (action === "Создание" && details?.after) {
		const after = details.after;
		const rows: Row[] = [
			{ label: "ID", value: after.id },
			{ label: "Название", value: after.title },
			{ label: "Артикул", value: after.sku },
			{ label: "Бренд", value: after.brand },
			{ label: "Цена", value: after.price },
			{ label: "Закупочная цена", value: after.supplierPrice },
			{ label: "Отдел", value: after.department?.name || "—" },
			{ label: "Категория", value: after.category?.title || "—" },
			{ label: "Описание", value: after.description || "—" },
		];

		return (
			<details className="text-sm text-gray-800 whitespace-pre-wrap">
				<summary className="cursor-pointer text-green-600 hover:underline font-medium">Создан товар — подробности</summary>
				<div className="mt-2 border border-gray-200 rounded-md overflow-hidden shadow-sm max-w-3xl">
					<table className="table-auto w-full text-sm">
						<tbody>
							{rows.map((row, index) => (
								<tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
									<td className="py-2 px-3 text-gray-500 font-medium w-48">{row.label}</td>
									<td className="py-2 px-3 text-gray-900 break-words max-w-[400px]">{formatValue(row.value)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		);
	}

	if (action === "Удаление" && details?.before) {
		const before = details.before;
		const rows: Row[] = [
			{ label: "ID", value: before.id },
			{ label: "Название", value: before.title },
			{ label: "Артикул", value: before.sku },
			{ label: "Бренд", value: before.brand },
			{ label: "Цена", value: before.price },
			{ label: "Закупочная цена", value: before.supplierPrice },
			{ label: "Отдел", value: before.department?.name ?? "—" },
			{ label: "Категория", value: before.category?.title ?? "—" },
			{ label: "Описание", value: before.description || "—" },
		];

		return (
			<details className="text-sm text-gray-800 whitespace-pre-wrap">
				<summary className="cursor-pointer text-red-600 hover:underline font-medium">Удалён товар — подробности</summary>
				<div className="mt-2 border border-gray-200 rounded-md overflow-hidden shadow-sm max-w-3xl">
					<table className="table-auto w-full text-sm">
						<tbody>
							{rows.map((row, index) => (
								<tr key={index} className="border-t hover:bg-gray-50 transition-colors">
									<td className="py-2 px-3 text-gray-500 font-medium w-48">{row.label}</td>
									<td
										className={`py-2 px-3 break-words max-w-[400px] ${
											["ID", "Артикул", "Бренд"].includes(row.label) ? "font-mono text-sm text-blue-900" : "text-gray-900"
										}`}
									>
										{formatValue(row.value)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		);
	}

	return message || <span className="text-gray-400 italic">—</span>;
};

export default ProductLogDetails;
