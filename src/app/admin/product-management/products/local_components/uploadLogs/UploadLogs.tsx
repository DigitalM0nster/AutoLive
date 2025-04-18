"use client";

import { useEffect, useState } from "react";

type ImportLog = {
	id: number;
	createdAt: string;
	fileName: string;
	created: number;
	updated: number;
	skipped: number;
	deleted?: number;
	user: {
		first_name: string;
		last_name: string;
		role: string;
		department?: {
			name: string;
		};
	};
	message: string | null;
	markupSummary?: string;
	removedCategoriesCount?: number;
	localDuplicates?: string[];
	unknownCategoryTitles?: string[];
	imagePolicy?: "preserve" | "replace";
};

export default function UploadLogs() {
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
						<th className="border border-black/10 px-2 py-1">Пользователь</th>
						<th className="border border-black/10 px-2 py-1">Отдел</th>
						<th className="border border-black/10 px-2 py-1">Файл</th>
						<th className="border border-black/10 px-2 py-1">Создано</th>
						<th className="border border-black/10 px-2 py-1">Обновлено</th>
						<th className="border border-black/10 px-2 py-1">Пропущено</th>
						<th className="border border-black/10 px-2 py-1">Изображения</th>
						<th className="border border-black/10 px-2 py-1">Комментарий</th>
					</tr>
				</thead>
				<tbody>
					{logs.length > 0 ? (
						logs.map((log) => (
							<tr key={log.id}>
								<td className="border border-black/10 px-2 py-1">{new Date(log.createdAt).toLocaleString()}</td>
								<td className="border border-black/10 px-2 py-1">
									{log.user.first_name} {log.user.last_name} <span className="text-xs text-gray-500">({log.user.role})</span>
								</td>
								<td className="border border-black/10 px-2 py-1">{log.user.department?.name || "—"}</td>
								<td className="border border-black/10 px-2 py-1">{log.fileName}</td>
								<td className="border border-black/10 px-2 py-1 text-center">{log.created}</td>
								<td className="border border-black/10 px-2 py-1 text-center">{log.updated}</td>
								<td className="border border-black/10 px-2 py-1 text-center">{log.skipped}</td>
								<td className="border border-black/10 px-2 py-1 text-center">
									{log.imagePolicy === "preserve" ? "Сохранялись" : log.imagePolicy === "replace" ? "Заменялись" : "—"}
								</td>
								<td className="border border-black/10 px-2 py-1 text-gray-700 whitespace-pre-line">
									{log.message ? (
										<>
											<p>{log.message}</p>
											{log.localDuplicates?.length ? (
												<p className="text-xs text-red-600">
													Повторения: {log.localDuplicates.slice(0, 5).join(", ")}
													{log.localDuplicates.length > 5 ? "..." : ""}
												</p>
											) : null}
											{log.unknownCategoryTitles?.length ? (
												<p className="text-xs text-yellow-600">
													Неизвестные категории: {log.unknownCategoryTitles.slice(0, 5).join(", ")}
													{log.unknownCategoryTitles.length > 5 ? "..." : ""}
												</p>
											) : null}
											{log.markupSummary && <p className="text-xs text-gray-500">Наценка: {log.markupSummary}</p>}
										</>
									) : (
										<span className="text-gray-400 italic">—</span>
									)}
								</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan={9} className="text-center py-4 text-gray-500">
								Логи отсутствуют
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
