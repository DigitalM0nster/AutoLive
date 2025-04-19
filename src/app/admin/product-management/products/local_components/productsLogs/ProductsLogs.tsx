"use client";

import { useEffect, useState } from "react";
import BulkDeletedProductsTable from "./BulkDeletedProductsTable";
import ProductLogDetails from "./ProductLogDetails";
import BulkOrImportDetails from "./BulkOrImportDetails";

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
				const resJson = await res.json();

				const filteredLogs = resJson.data.filter((log: UnifiedLog) => {
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

		if (type === "product") {
			return <ProductLogDetails action={log.action as "Создание" | "Редактирование" | "Удаление"} details={details} message={message} />;
		}

		if (type === "bulk") {
			return <BulkOrImportDetails type="bulk" count={details.count} snapshots={details.snapshots} message={message} />;
		}

		if (type === "import") {
			return (
				<BulkOrImportDetails
					type="import"
					count={details.created + details.updated + (details.skipped || 0)}
					snapshots={details.snapshots || []}
					message={message}
					filename={details.fileName}
					imagePolicy={details.imagePolicy}
					created={details.created}
					updated={details.updated}
					skipped={details.skipped}
					markupSummary={details.markupSummary}
				/>
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
