"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/loading/Loading";
import { BookingDepartmentLog } from "@/lib/types";
import styles from "@/app/admin/departments/local_components/styles.module.scss";

type BookingDepartmentLogsTableProps = {
	bookingDepartmentId: number;
	tableHeaders: any;
	queryParams: URLSearchParams;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
	adminSearch?: string;
};

export default function BookingDepartmentLogsTable({ bookingDepartmentId, tableHeaders, queryParams, onLogsUpdate, adminSearch }: BookingDepartmentLogsTableProps) {
	const router = useRouter();
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<BookingDepartmentLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [existingUsers, setExistingUsers] = useState<Map<number, { id: number; first_name: string; last_name: string; middle_name: string | null; phone: string; role: string; department?: { id: number; name: string } | null }>>(new Map());
	const [existingBookingDepartments, setExistingBookingDepartments] = useState<Set<number>>(new Set());

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

	const checkBookingDepartmentsExistence = useCallback(async (ids: number[]) => {
		if (ids.length === 0) return;
		try {
			const params = new URLSearchParams();
			params.set("bookingDepartmentIds", ids.join(","));
			const res = await fetch(`/api/booking-departments/check-existence?${params}`, { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setExistingBookingDepartments(new Set(data.existingBookingDepartmentIds || []));
			}
		} catch (e) {
			console.error("Ошибка проверки адресов:", e);
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
		return `${adminSnapshot.last_name || ""} ${adminSnapshot.first_name || ""}`.trim() || adminSnapshot.role || "—";
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

	// Карточка администратора: кликабельное ФИО, раскрывается с деталями и ссылкой на профиль
	const renderAdminCard = useCallback(
		(log: BookingDepartmentLog) => {
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

	// Ссылка на адрес или текст «удалён»
	const renderBookingDepartmentCell = useCallback(
		(log: BookingDepartmentLog) => {
			const deptId = log.bookingDepartmentId;
			if (!deptId) return "—";
			const exists = existingBookingDepartments.has(deptId);
			const snapshot = log.bookingDepartmentSnapshot;
			const name = snapshot && typeof snapshot === "object" && snapshot.name ? snapshot.name : `Адрес #${deptId}`;
			if (exists) {
				return (
					<a href={`/admin/booking-departments/${deptId}/edit`} className="departmentLink" onClick={(e) => { e.preventDefault(); router.push(`/admin/booking-departments/${deptId}/edit`); }}>
						{name}
					</a>
				);
			}
			return <span className="category">{name} (удалён)</span>;
		},
		[existingBookingDepartments, router]
	);

	// Блок результата: создание / редактирование / удаление
	const getResultBlock = useCallback(
		(log: BookingDepartmentLog): React.ReactNode => {
			const action = log.action;
			const key = (prefix: string) => `${prefix}_${log.id}`;
			const snapshotBefore = log.bookingDepartmentSnapshot && typeof log.bookingDepartmentSnapshot === "object" ? log.bookingDepartmentSnapshot : null;
			const snapshotAfter = snapshotBefore; // Для booking-departments используется один snapshot

			if (action === "create") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock create">
								<div className={`clickInfoBlock ${activeBlocks[key("create")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("create"))}>
									Создание адреса
								</div>
								<div className={`openingBlock ${activeBlocks[key("create")] ? "active" : ""}`}>
									{snapshotAfter && (
										<>
											<div className="infoField">
												<span className="title">ID:</span>
												<span className="value">{log.bookingDepartmentId}</span>
											</div>
											{snapshotAfter.name && (
												<div className="infoField">
													<span className="title">Название:</span>
													<span className="value">{snapshotAfter.name}</span>
												</div>
											)}
											{snapshotAfter.address && (
												<div className="infoField">
													<span className="title">Адрес:</span>
													<span className="value">{snapshotAfter.address}</span>
												</div>
											)}
											{snapshotAfter.phones && Array.isArray(snapshotAfter.phones) && snapshotAfter.phones.length > 0 && (
												<div className="infoField">
													<span className="title">Телефоны:</span>
													<span className="value">{snapshotAfter.phones.join(", ")}</span>
												</div>
											)}
											{snapshotAfter.emails && Array.isArray(snapshotAfter.emails) && snapshotAfter.emails.length > 0 && (
												<div className="infoField">
													<span className="title">Email:</span>
													<span className="value">{snapshotAfter.emails.join(", ")}</span>
												</div>
											)}
										</>
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

			if (action === "delete") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock remove">
								<div className={`clickInfoBlock ${activeBlocks[key("delete")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("delete"))}>
									Удаление адреса
								</div>
								<div className={`openingBlock ${activeBlocks[key("delete")] ? "active" : ""}`}>
									{snapshotBefore && (
										<>
											<div className="infoField">
												<span className="title">ID:</span>
												<span className="value">{log.bookingDepartmentId}</span>
											</div>
											{snapshotBefore.name && (
												<div className="infoField">
													<span className="title">Название:</span>
													<span className="value">{snapshotBefore.name ?? "—"}</span>
												</div>
											)}
											{snapshotBefore.address && (
												<div className="infoField">
													<span className="title">Адрес:</span>
													<span className="value">{snapshotBefore.address ?? "—"}</span>
												</div>
											)}
										</>
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

			if (action === "update") {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock update">
								<div className={`clickInfoBlock ${activeBlocks[key("update")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("update"))}>
									Редактирование адреса
								</div>
								<div className={`openingBlock ${activeBlocks[key("update")] ? "active" : ""}`}>
									{snapshotAfter && (
										<>
											<div className="infoField">
												<span className="title">ID:</span>
												<span className="value">{log.bookingDepartmentId}</span>
											</div>
											{snapshotAfter.name && (
												<div className="infoField">
													<span className="title">Название:</span>
													<span className="value">{snapshotAfter.name}</span>
												</div>
											)}
											{snapshotAfter.address && (
												<div className="infoField">
													<span className="title">Адрес:</span>
													<span className="value">{snapshotAfter.address}</span>
												</div>
											)}
											{snapshotAfter.phones && Array.isArray(snapshotAfter.phones) && snapshotAfter.phones.length > 0 && (
												<div className="infoField">
													<span className="title">Телефоны:</span>
													<span className="value">{snapshotAfter.phones.join(", ")}</span>
												</div>
											)}
											{snapshotAfter.emails && Array.isArray(snapshotAfter.emails) && snapshotAfter.emails.length > 0 && (
												<div className="infoField">
													<span className="title">Email:</span>
													<span className="value">{snapshotAfter.emails.join(", ")}</span>
												</div>
											)}
										</>
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

			return <span>{log.message || "—"}</span>;
		},
		[activeBlocks, toggleActiveBlock]
	);

	// Фильтруем логи на клиенте по adminSearch
	const filteredLogs = useMemo(() => {
		if (!adminSearch || adminSearch.trim() === "") {
			return localLogs;
		}

		const searchLower = adminSearch.toLowerCase().trim();
		return localLogs.filter((log) => {
			if (!log.adminSnapshot) return false;

			const admin = log.adminSnapshot;
			const adminName = getAdminName(admin).toLowerCase();
			const adminId = admin.id?.toString() || "";
			const adminRole = admin.role?.toLowerCase() || "";

			return adminName.includes(searchLower) || adminId.includes(searchLower) || adminRole.includes(searchLower);
		});
	}, [localLogs, adminSearch, getAdminName]);

	useEffect(() => {
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`/api/booking-departments/${bookingDepartmentId}/logs?${queryParams.toString()}`, { credentials: "include" });
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				const logs: BookingDepartmentLog[] = data.data || [];
				setLocalLogs(logs);
				setTotalPages(data.totalPages ?? 1);
				if (onLogsUpdate) onLogsUpdate(data.total ?? 0, data.totalPages ?? 1);

				const bookingDepartmentIdsToCheck: number[] = [...new Set(logs.map((l) => l.bookingDepartmentId).filter((id): id is number => typeof id === "number"))];
				await checkBookingDepartmentsExistence(bookingDepartmentIdsToCheck);

				const adminIdsToCheck = [...new Set(logs.map((l: BookingDepartmentLog) => {
					const admin = l.adminSnapshot;
					return admin && typeof admin === "object" && admin.id ? admin.id : null;
				}).filter(Boolean) as number[])];
				await checkUsersExistence(adminIdsToCheck);
			} catch (e) {
				console.error("Ошибка загрузки логов адресов:", e);
				setError(e instanceof Error ? e.message : "Ошибка загрузки");
			} finally {
				setLoading(false);
			}
		};
		fetchLogs();
	}, [queryParams.toString(), bookingDepartmentId, onLogsUpdate, checkBookingDepartmentsExistence, checkUsersExistence]);

	const colCount = 3;

	return (
		<div className="tableContent">
			<table className={styles.table}>
				<thead className={styles.tableHeader}>
					<tr>
						<th className={styles.tableHeaderCell}>{tableHeaders[0]?.label || "Дата и время"}</th>
						<th className={styles.tableHeaderCell}>{tableHeaders[1]?.label || "Действие"}</th>
						<th className={styles.tableHeaderCell}>{tableHeaders[2]?.label || "Сообщение"}</th>
						<th className={styles.tableHeaderCell}>{tableHeaders[3]?.label || "Кем выполнено"}</th>
					</tr>
				</thead>
				<tbody className={styles.tableBody}>
					{loading ? (
						<tr>
							<td colSpan={colCount + 1}>
								<Loading />
							</td>
						</tr>
					) : error ? (
						<tr>
							<td colSpan={colCount + 1} className={styles.emptyCell}>
								{error}
							</td>
						</tr>
					) : filteredLogs.length > 0 ? (
						filteredLogs.map((log) => (
							<tr key={log.id} className={styles.tableRow}>
								<td className={styles.tableCell}>
									<div className="dateCell">{formatDate(log.createdAt)}</div>
								</td>
								<td className={styles.tableCell}>{getResultBlock(log)}</td>
								<td className={styles.tableCell}>{log.message || "—"}</td>
								<td className={styles.tableCell}>
									{log.adminSnapshot ? renderAdminCard(log) : "—"}
								</td>
							</tr>
						))
					) : (
						<tr>
							<td colSpan={colCount + 1} className={styles.emptyCell}>
								Логов не найдено
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}
