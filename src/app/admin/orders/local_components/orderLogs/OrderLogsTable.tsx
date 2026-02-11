"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/loading/Loading";
import { OrderLog } from "@/lib/types";

type OrderLogsTableProps = {
	orderId?: number;
	tableHeaders: React.ReactNode;
	queryParams: URLSearchParams;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
};

export default function OrderLogsTable({ orderId, tableHeaders, queryParams, onLogsUpdate }: OrderLogsTableProps) {
	const router = useRouter();
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<OrderLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [existingUsers, setExistingUsers] = useState<Map<number, { id: number; first_name: string; last_name: string; middle_name: string | null; phone: string; role: string; department?: { id: number; name: string } | null }>>(new Map());

	const toggleActiveBlock = useCallback((key: string | number) => {
		setActiveBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const checkUsersExistence = useCallback(async (userIds: number[]) => {
		if (userIds.length === 0) return;
		try {
			const params = new URLSearchParams();
			params.set("userIds", userIds.join(","));
			const res = await fetch(`/api/users/check-existence?${params}`, { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				const users = data.existingUsers || {};
				setExistingUsers(new Map(Object.entries(users).map(([id, u]: [string, any]) => [parseInt(id, 10), u])));
			}
		} catch (e) {
			console.error("Ошибка проверки пользователей:", e);
		}
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
		return `${adminSnapshot.last_name || ""} ${adminSnapshot.first_name || ""} ${adminSnapshot.middle_name || ""}`.trim() || adminSnapshot.role || "—";
	}, []);

	const getRoleName = useCallback((role: string) => {
		switch (role) {
			case "superadmin":
				return "Суперадмин";
			case "admin":
				return "Администратор";
			case "manager":
				return "Менеджер";
			case "client":
				return "Пользователь";
			default:
				return role;
		}
	}, []);

	const getActionText = useCallback((action: string) => {
		switch (action) {
			case "create":
				return "Создание";
			case "update":
				return "Обновление";
			case "assign":
				return "Назначение";
			case "status_change":
				return "Изменение статуса";
			case "cancel":
				return "Отмена";
			case "unassign":
				return "Снятие назначения";
			default:
				return action || "—";
		}
	}, []);

	// Карточка администратора
	const renderAdminCard = useCallback(
		(log: OrderLog) => {
			const admin = log.adminSnapshot;
			if (!admin || typeof admin !== "object") return "—";
			const adminId = admin.id;
			if (!adminId) return getAdminName(admin);
			const key = `admin_${log.id}_${adminId}`;
			const userExists = existingUsers.has(adminId);
			const actualUser = existingUsers.get(adminId);
			return (
				<div className="fullInfoBlock">
					<div
						className={`clickInfoBlock ${activeBlocks[key] ? "active" : ""}`}
						onClick={() => toggleActiveBlock(key)}
					>
						{getAdminName(admin)}
					</div>
					<div className={`openingBlock ${activeBlocks[key] ? "active" : ""}`}>
						<div className="infoField">
							<span className="title">ID:</span>
							<span className="value">{adminId}</span>
						</div>
						<div className="infoField">
							<span className="title">Телефон:</span>
							<span className="value">{admin.phone || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Роль:</span>
							<span className="value">{getRoleName(admin.role || "")}</span>
						</div>
						<div className="infoField">
							<span className="title">Отдел:</span>
							<span className="value">{admin.department?.name || "Без отдела"}</span>
						</div>
						{userExists ? (
							<div className="infoField">
								<span className="title maxContent">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${adminId}`} className="itemLink" onClick={(e) => { e.preventDefault(); router.push(`/admin/users/${adminId}`); }}>
										{actualUser?.last_name || ""} {actualUser?.first_name || ""} {actualUser?.middle_name || ""}
									</a>
								</span>
							</div>
						) : (
							<div className="infoField">
								<span className="title">Статус:</span>
								<span className="value deletedItemStatus">Пользователь удалён</span>
							</div>
						)}
					</div>
				</div>
			);
		},
		[activeBlocks, toggleActiveBlock, getAdminName, getRoleName, existingUsers, router]
	);

	// Блок результата: разные типы действий
	const getResultBlock = useCallback(
		(log: OrderLog): React.ReactNode => {
			const action = log.action;
			const key = (prefix: string) => `${prefix}_${log.id}`;
			const snapshot = log.orderSnapshot;

			if (action === "create") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock create">
								<div className={`clickInfoBlock ${activeBlocks[key("create")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("create"))}>
									Создание заказа
								</div>
								<div className={`openingBlock ${activeBlocks[key("create")] ? "active" : ""}`}>
									{snapshot && (
										<>
											<div className="infoField">
												<span className="title">ID заказа:</span>
												<span className="value">{log.orderId}</span>
											</div>
											{snapshot.status && (
												<div className="infoField">
													<span className="title">Статус:</span>
													<span className="value">{snapshot.status}</span>
												</div>
											)}
											{log.message && (
												<div className="infoField">
													<span className="title">Сообщение:</span>
													<span className="value">{log.message}</span>
												</div>
											)}
										</>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (action === "assign" || action === "unassign") {
				const isAssign = action === "assign";
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className={`tableListItem fullInfoBlock ${isAssign ? "create" : "remove"}`}>
								<div className={`clickInfoBlock ${activeBlocks[key(action)] ? "active" : ""}`} onClick={() => toggleActiveBlock(key(action))}>
									{isAssign ? "Назначение менеджера" : "Снятие назначения"}
								</div>
								<div className={`openingBlock ${activeBlocks[key(action)] ? "active" : ""}`}>
									{log.managerSnapshot && (
										<div className="infoField">
											<span className="title">Менеджер:</span>
											<span className="value">
												{log.managerSnapshot.last_name || ""} {log.managerSnapshot.first_name || ""} {log.managerSnapshot.middle_name || ""}
											</span>
										</div>
									)}
									{log.message && (
										<div className="infoField">
											<span className="title">Сообщение:</span>
											<span className="value">{log.message}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (action === "status_change") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock update">
								<div className={`clickInfoBlock ${activeBlocks[key("status")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("status"))}>
									Изменение статуса заказа
								</div>
								<div className={`openingBlock ${activeBlocks[key("status")] ? "active" : ""}`}>
									{log.message && (
										<div className="infoField">
											<span className="title">Сообщение:</span>
											<span className="value">{log.message}</span>
										</div>
									)}
									{snapshot && snapshot.status && (
										<div className="infoField">
											<span className="title">Новый статус:</span>
											<span className="value">{snapshot.status}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (action === "update") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock update">
								<div className={`clickInfoBlock ${activeBlocks[key("update")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("update"))}>
									Обновление заказа
								</div>
								<div className={`openingBlock ${activeBlocks[key("update")] ? "active" : ""}`}>
									{log.message && (
										<div className="infoField">
											<span className="title">Сообщение:</span>
											<span className="value">{log.message}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (action === "cancel") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock remove">
								<div className={`clickInfoBlock ${activeBlocks[key("cancel")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("cancel"))}>
									Отмена заказа
								</div>
								<div className={`openingBlock ${activeBlocks[key("cancel")] ? "active" : ""}`}>
									{log.message && (
										<div className="infoField">
											<span className="title">Сообщение:</span>
											<span className="value">{log.message}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			return <span>{log.message || getActionText(action)}</span>;
		},
		[activeBlocks, toggleActiveBlock, getActionText]
	);

	useEffect(() => {
		const baseUrl = orderId ? `/api/orders/${orderId}/logs` : "/api/orders/logs";
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`${baseUrl}?${queryParams.toString()}`, { credentials: "include" });
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				const logs = data.data || [];
				setLocalLogs(logs);
				setTotalPages(data.totalPages ?? 1);
				if (onLogsUpdate) onLogsUpdate(data.total ?? 0, data.totalPages ?? 1);

				const adminIdsToCheck = [...new Set(logs.map((l: OrderLog) => {
					const admin = l.adminSnapshot;
					return admin && typeof admin === "object" && admin.id ? admin.id : null;
				}).filter(Boolean) as number[])];
				await checkUsersExistence(adminIdsToCheck);
			} catch (e) {
				console.error("Ошибка загрузки логов заказов:", e);
				setError(e instanceof Error ? e.message : "Ошибка загрузки");
			} finally {
				setLoading(false);
			}
		};
		fetchLogs();
	}, [queryParams.toString(), orderId, onLogsUpdate, checkUsersExistence]);

	const colCount = orderId ? 3 : 4;

	return (
		<div className="tableContent">
			<table className="table">
				<thead>{tableHeaders}</thead>
				<tbody>
					{loading ? (
						<tr>
							<td colSpan={colCount}>
								<Loading />
							</td>
						</tr>
					) : error ? (
						<tr>
							<td colSpan={colCount} className="emptyCell">
								{error}
							</td>
						</tr>
					) : localLogs.length > 0 ? (
						localLogs.map((log) => (
							<tr key={log.id}>
								<td>
									<div className="dateCell">{formatDate(log.createdAt)}</div>
								</td>
								{!orderId && (
									<td>
										<a href={`/admin/orders/${log.orderId}`} className="departmentLink" onClick={(e) => { e.preventDefault(); router.push(`/admin/orders/${log.orderId}`); }}>
											Заказ #{log.orderId}
										</a>
									</td>
								)}
								<td>
									{log.adminSnapshot ? renderAdminCard(log) : "—"}
								</td>
								<td>{getResultBlock(log)}</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan={colCount} className="emptyCell">
								Логов не найдено
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
