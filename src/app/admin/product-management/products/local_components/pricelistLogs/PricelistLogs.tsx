// src/app/admin/products/items/local_components/importLogs/ImportLogs.tsx

"use client";

import { useEffect, useState } from "react";

type ImportLog = {
	id: number;
	createdAt: string;
	fileName: string;
	created: number;
	updated: number;
	message: string | null; // 👈 добавлено поле
	user: {
		first_name: string;
		last_name: string;
		role: string;
	};
};

export default function PricelistLogs() {
	const [logs, setLogs] = useState<ImportLog[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLogs = async () => {
			try {
				const res = await fetch("/api/logs/imports");
				const data = await res.json();
				setLogs(data);
			} catch (error) {
				console.error("Ошибка при получении логов импорта:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchLogs();
	}, []);

	if (loading) {
		return <p className="text-sm text-gray-500">Загрузка логов...</p>;
	}

	return (
		<div className="mt-8">
			<h3 className="text-lg font-bold mb-2">История загрузок</h3>
			<table className="w-full table-auto text-sm border border-black/10 border-collapse">
				<thead className="bg-gray-100">
					<tr>
						<th className="border border-black/10 px-2 py-1">Дата</th>
						<th className="border border-black/10 px-2 py-1">Админ</th>
						<th className="border border-black/10 px-2 py-1">Файл</th>
						<th className="border border-black/10 px-2 py-1">Создано</th>
						<th className="border border-black/10 px-2 py-1">Обновлено</th>
						<th className="border border-black/10 px-2 py-1">Комментарий</th>
					</tr>
				</thead>
				<tbody>
					{logs.length > 0 ? (
						logs.map((log) => (
							<tr key={log.id}>
								<td className="border border-black/10 px-2 py-1">{new Date(log.createdAt).toLocaleString()}</td>
								<td className="border border-black/10 px-2 py-1">
									{log.user.first_name} {log.user.last_name}
								</td>
								<td className="border border-black/10 px-2 py-1">{log.fileName}</td>
								<td className="border border-black/10 px-2 py-1 text-center">{log.created}</td>
								<td className="border border-black/10 px-2 py-1 text-center">{log.updated}</td>
								<td className="border border-black/10 px-2 py-1 text-gray-700">{log.message ? log.message : <span className="text-gray-400 italic">—</span>}</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan={6} className="text-center py-4 text-gray-500">
								Логи отсутствуют
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
