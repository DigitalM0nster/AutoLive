"use client";

import { useEffect, useState } from "react";
import BulkDeletedProductsTable from "./BulkDeletedProductsTable";
import ProductLogDetails from "./ProductLogDetails";

type Department = { name: string };
type User = {
	first_name: string;
	last_name: string;
	role: string;
	department?: Department;
};

type UnifiedLog = {
	id: number;
	createdAt: string;
	type: "import" | "product" | "bulk";
	message: string | null;
	user: User;
	department?: Department;
	action: string;
	details: any;
};

export default function ProductsLogs() {
	const [logs, setLogs] = useState<UnifiedLog[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLogs = async () => {
			try {
				const res = await fetch("/api/logs/products-actions");
				const data = await res.json();
				const filteredLogs = data.filter((log: UnifiedLog) => {
					if (log.type === "product" && log.action === "bulk" && !log.message) return false;
					return true;
				});
				setLogs(filteredLogs);
			} catch (error) {
				console.error("Ошибка при получении логов:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, []);

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

	const renderActionBadge = (type: UnifiedLog["type"], action: string) => {
		const colors = {
			import: "bg-blue-100 text-blue-700",
			product: "bg-yellow-100 text-yellow-700",
			bulk: "bg-red-100 text-red-700",
		};
		return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type]}`}>{action}</span>;
	};

	const renderLogDetails = (log: UnifiedLog) => {
		const { type, message, details } = log;

		if (type === "import") {
			return (
				<>
					<p>
						<strong>Файл:</strong> {details.fileName}
					</p>
					<p>
						Создано: {details.created} / Обновлено: {details.updated} / Пропущено: {details.skipped}
					</p>
					{details.imagePolicy && <p>Изображения: {details.imagePolicy === "replace" ? "Заменялись" : "Сохранялись"}</p>}
					{details.markupSummary && <p className="text-xs text-gray-500">Наценка: {details.markupSummary}</p>}
					{message && <p className="text-sm mt-1">{message}</p>}
				</>
			);
		}

		if (type === "product" && ["Создание", "Редактирование", "Удаление"].includes(log.action)) {
			return <ProductLogDetails action={log.action as "Создание" | "Редактирование" | "Удаление"} details={log.details} message={log.message} />;
		}

		if (type === "bulk") {
			const { count, snapshots = [] } = details;
			return (
				<div className="space-y-2">
					<p>
						Удалено товаров: <strong>{count}</strong>
					</p>
					{snapshots.length > 0 && <BulkDeletedProductsTable snapshots={snapshots} />}
					{message && <p className="text-sm mt-1">{message}</p>}
				</div>
			);
		}

		return <span className="text-gray-400 italic">—</span>;
	};

	if (loading) return <p className="text-sm text-gray-500">Загрузка логов...</p>;

	return (
		<div className="mt-8">
			<h3 className="text-lg font-bold mb-4">История действий над товарами</h3>
			<table className="w-full table-auto text-sm border border-black/10 border-collapse">
				<thead className="bg-gray-100">
					<tr>
						<th className="border px-2 py-1">Дата</th>
						<th className="border px-2 py-1">Пользователь</th>
						<th className="border px-2 py-1">Отдел</th>
						<th className="border px-2 py-1">Действие</th>
						<th className="border px-2 py-1">Детали</th>
					</tr>
				</thead>
				<tbody>
					{logs.map((log) => (
						<tr key={`${log.type}-${log.id}`}>
							<td className="border px-2 py-1">{new Date(log.createdAt).toLocaleString()}</td>
							<td className="border px-2 py-1">
								{log.user.first_name} {log.user.last_name} <span className="text-xs text-gray-500">({log.user.role})</span>
							</td>
							<td className="border px-2 py-1">{log.department?.name || "—"}</td>
							<td className="border px-2 py-1">{renderActionBadge(log.type, log.action)}</td>
							<td className="border px-2 py-1 text-gray-700 whitespace-pre-line">{renderLogDetails(log)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
