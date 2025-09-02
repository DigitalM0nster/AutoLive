"use client";

import { useEffect, useState } from "react";
import ProductLogDetails from "./ProductLogDetails";
import BulkOrImportDetails from "./BulkOrImportDetails";
import { User } from "@/lib/types";
import { Department } from "@prisma/client";

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
					// исключаем пустые bulk product-логи
					if (log.type === "product" && log.action === "bulk" && !log.message) return false;

					// исключаем product-логи, если они были частью импорта
					if (log.type === "product" && log.message?.startsWith("Импорт:")) return false;

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
			console.log(details);
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
			{/* Я НЕ ХОЧУ ЧТОБЫ ЭТО СКРОЛЛИЛОСЬ!!! */}
			<div className="overflow-hidden shadow rounded-lg">
				<table className="min-w-full max-w-10 divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-200">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Дата</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Пользователь</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Отдел</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Действие</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Детали</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200 text-xs">
						{logs.map((log) => (
							<tr key={`${log.type}-${log.id}`} className="hover:bg-gray-50">
								<td className="px-4 py-2 text-gray-700 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
								<td className="px-4 py-2 text-gray-700 whitespace-nowrap">
									{log.user.first_name} {log.user.last_name} <span className="text-xs text-gray-500">({log.user.role})</span>
								</td>
								<td className="px-4 py-2 text-gray-700 whitespace-nowrap">{log.department?.name || "—"}</td>
								<td className="px-4 py-2">{renderActionBadge(log.type, log.action)}</td>
								<td className="px-4 py-2 text-gray-700">
									<div className="max-w-full overflow-x-auto">
										<div className="inline-block min-w-full max-w-5xl align-top">{renderLogDetails(log)}</div>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
