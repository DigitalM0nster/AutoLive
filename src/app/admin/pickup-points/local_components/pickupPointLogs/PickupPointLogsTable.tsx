"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Loading from "@/components/ui/loading/Loading";
import DeletedBlockNotice from "@/components/ui/deletedBlockNotice/DeletedBlockNotice";
import { PickupPointLog } from "@/lib/types";
import styles from "@/app/admin/departments/local_components/styles.module.scss";

type Props = {
	pickupPointId: number;
	tableHeaders: React.ReactNode;
	queryParams: URLSearchParams;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
};

export default function PickupPointLogsTable({ pickupPointId, tableHeaders, queryParams, onLogsUpdate }: Props) {
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<PickupPointLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);

	const queryParamsString = useMemo(() => queryParams.toString(), [queryParams]);

	const toggleActiveBlock = useCallback((key: string | number) => {
		setActiveBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const formatDate = useCallback((dateStr: string | Date) => {
		if (!dateStr) return "—";
		const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
		if (isNaN(d.getTime())) return "—";
		return d.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}, []);

	const getAdminName = useCallback((adminSnapshot: any) => {
		if (!adminSnapshot || typeof adminSnapshot !== "object") return "—";
		return `${adminSnapshot.last_name || ""} ${adminSnapshot.first_name || ""}`.trim() || "—";
	}, []);

	const getResultBlock = useCallback(
		(log: PickupPointLog) => {
			const key = (prefix: string) => `${prefix}_${log.id}`;
			const snap = log.pickupPointSnapshot as any;

			if (log.action === "create") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock create">
								<div className={`clickInfoBlock ${activeBlocks[key("create")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("create"))}>
									Создание пункта выдачи
								</div>
								<div className={`openingBlock ${activeBlocks[key("create")] ? "active" : ""}`}>
									{snap && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{snap.name ?? "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Адрес:</span>
												<span className="value">{snap.address ?? "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (log.action === "delete") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock remove">
								<div className={`clickInfoBlock ${activeBlocks[key("delete")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("delete"))}>
									Удаление пункта выдачи
								</div>
								<div className={`openingBlock ${activeBlocks[key("delete")] ? "active" : ""}`}>
									<DeletedBlockNotice deletedAt={formatDate(log.createdAt)} deletedBy={getAdminName(log.adminSnapshot)} />
									{snap && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{snap.name ?? "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Адрес:</span>
												<span className="value">{snap.address ?? "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (log.action === "update") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock update">
								<div className={`clickInfoBlock ${activeBlocks[key("update")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("update"))}>
									Редактирование пункта выдачи
								</div>
								<div className={`openingBlock ${activeBlocks[key("update")] ? "active" : ""}`}>
									{log.message && <div className="infoField"><span className="value">{log.message}</span></div>}
									{snap && (
										<>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{snap.name ?? "—"}</span>
											</div>
											<div className="infoField">
												<span className="title">Адрес:</span>
												<span className="value">{snap.address ?? "—"}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			return <span>{log.message || log.action}</span>;
		},
		[activeBlocks, toggleActiveBlock, formatDate, getAdminName]
	);

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/pickup-points/${pickupPointId}/logs?${queryParamsString}`, { credentials: "include" });
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				setLocalLogs(data.data || []);
				setTotalPages(data.totalPages ?? 1);
				onLogsUpdate?.(data.total ?? 0, data.totalPages ?? 1);
			} catch (e) {
				console.error("Ошибка загрузки логов:", e);
				setError(e instanceof Error ? e.message : "Ошибка загрузки");
			} finally {
				setLoading(false);
			}
		};
		fetchLogs();
	}, [pickupPointId, queryParamsString, onLogsUpdate]);

	return (
		<div className="tableContent">
			<table className="table">
				<thead>{tableHeaders}</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={3}>
								<Loading />
							</td>
						</tr>
					) : error ? (
						<tr>
							<td colSpan={3} className="emptyCell">
								{error}
							</td>
						</tr>
					) : localLogs.length > 0 ? (
						localLogs.map((log) => (
							<tr key={log.id}>
								<td>
									<div className="dateCell">{formatDate(log.createdAt)}</div>
								</td>
								<td>{getAdminName(log.adminSnapshot)}</td>
								<td>{getResultBlock(log)}</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan={3} className="emptyCell">
								Логов не найдено
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
