"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ImportLog {
	id: number;
	fileName: string;
	totalRows: number;
	processedRows: number;
	successRows: number;
	errorRows: number;
	status: string;
	createdAt: string;
	completedAt: string;
	errorMessage?: string;
	user?: any;
	department?: any;
	settings?: {
		imagePolicy?: string;
		markupSummary?: string;
	};
	stats: {
		created: number;
		updated: number;
		skipped: number;
		total: number;
	};
}

export default function ImportLogPage() {
	const params = useParams();
	const importLogId = params.importLogId as string;

	const [importLog, setImportLog] = useState<ImportLog | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!importLogId) return;

		const fetchImportLog = async () => {
			try {
				setLoading(true);
				const response = await fetch(`/api/products/logs/${importLogId}`);

				if (!response.ok) {
					throw new Error("Не удалось загрузить лог импорта");
				}

				const data = await response.json();
				setImportLog(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Произошла ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchImportLog();
	}, [importLogId]);

	if (loading) {
		return (
			<div className="screenContent">
				<div className="borderBlock">
					<h1 className="borderBlockHeader">Загрузка лога импорта...</h1>
					<p>Пожалуйста, подождите...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="screenContent">
				<div className="borderBlock">
					<h1 className="borderBlockHeader">Ошибка</h1>
					<p style={{ color: "var(--red-color)" }}>{error}</p>
				</div>
			</div>
		);
	}

	if (!importLog) {
		return (
			<div className="screenContent">
				<div className="borderBlock">
					<h1 className="borderBlockHeader">Лог импорта не найден</h1>
					<p>Лог импорта с ID {importLogId} не найден.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="borderBlock">
				<h1 className="borderBlockHeader">Лог импорта #{importLog.id}</h1>

				<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
					<div>
						<strong>Файл:</strong> {importLog.fileName}
					</div>

					<div>
						<strong>Статус:</strong>
						<span
							style={{
								color: importLog.status === "completed" ? "var(--green-color)" : "var(--orange-color)",
							}}
						>
							{importLog.status === "completed" ? "Завершено" : importLog.status}
						</span>
					</div>

					<div>
						<strong>Всего строк:</strong> {importLog.totalRows}
					</div>

					<div>
						<strong>Обработано:</strong> {importLog.processedRows}
					</div>

					<div>
						<strong>Успешно:</strong>
						<span style={{ color: "var(--green-color)" }}>{importLog.successRows}</span>
					</div>

					<div>
						<strong>Ошибок:</strong>
						<span style={{ color: "var(--red-color)" }}>{importLog.errorRows}</span>
					</div>

					<div>
						<strong>Создано:</strong>
						<span style={{ color: "var(--green-color)" }}>{importLog.stats.created}</span>
					</div>

					<div>
						<strong>Обновлено:</strong>
						<span style={{ color: "var(--blue-color)" }}>{importLog.stats.updated}</span>
					</div>

					<div>
						<strong>Пропущено:</strong>
						<span style={{ color: "var(--orange-color)" }}>{importLog.stats.skipped}</span>
					</div>

					<div>
						<strong>Создан:</strong> {new Date(importLog.createdAt).toLocaleString("ru-RU")}
					</div>

					{importLog.completedAt && (
						<div>
							<strong>Завершен:</strong> {new Date(importLog.completedAt).toLocaleString("ru-RU")}
						</div>
					)}

					{importLog.errorMessage && (
						<div>
							<strong>Сообщение об ошибке:</strong>
							<div
								style={{
									color: "var(--red-color)",
									backgroundColor: "var(--light-grey-color)",
									padding: "8px",
									borderRadius: "4px",
									marginTop: "4px",
								}}
							>
								{importLog.errorMessage}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
