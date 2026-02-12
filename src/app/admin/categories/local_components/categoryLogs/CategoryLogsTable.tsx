"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/ui/loading/Loading";

export type CategoryLog = {
	id: number;
	createdAt: string;
	entityId: number | null;
	actions: string[];
	message: string | null;
	admin: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		middle_name?: string | null;
		phone?: string | null;
		role: string;
		department?: { id: number; name: string } | null;
	} | null;
	targetCategory: { id: number; title: string; image?: string | null; order?: number | null } | null;
	snapshotBefore: any;
	snapshotAfter: any;
	adminSnapshot: any;
};

type CategoryLogsTableProps = {
	categoryId?: number;
	tableHeaders: React.ReactNode;
	queryParams: URLSearchParams;
	onLogsUpdate?: (totalCount: number, totalPages: number) => void;
};

export default function CategoryLogsTable({ categoryId, tableHeaders, queryParams, onLogsUpdate }: CategoryLogsTableProps) {
	const router = useRouter();
	const [activeBlocks, setActiveBlocks] = useState<Record<string, boolean>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localLogs, setLocalLogs] = useState<CategoryLog[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [existingCategories, setExistingCategories] = useState<Set<number>>(new Set());
	const [existingUsers, setExistingUsers] = useState<Map<number, { id: number; first_name: string; last_name: string; middle_name: string | null; phone: string; role: string; department?: { id: number; name: string } | null }>>(new Map());

	const toggleActiveBlock = useCallback((key: string | number) => {
		setActiveBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const checkCategoriesExistence = useCallback(async (ids: number[]) => {
		if (ids.length === 0) return;
		try {
			const params = new URLSearchParams();
			params.set("categoryIds", ids.join(","));
			const res = await fetch(`/api/categories/check-existence?${params}`, { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setExistingCategories(new Set(data.existingCategoryIds || []));
			}
		} catch (e) {
			console.error("Ошибка проверки категорий:", e);
		}
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

	const formatDate = useCallback((dateStr: string) => {
		if (!dateStr) return "—";
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return "—";
		return d.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}, []);

	const getAdminName = useCallback((admin: CategoryLog["admin"]) => {
		if (!admin) return "—";
		return `${admin.last_name || ""} ${admin.first_name || ""} ${admin.middle_name || ""}`.trim() || admin.role || "—";
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
		(log: CategoryLog) => {
			const admin = log.admin;
			if (!admin) return "—";
			const key = `admin_${log.id}_${admin.id}`;
			const userExists = existingUsers.has(admin.id);
			const actualUser = existingUsers.get(admin.id);
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
							<span className="value">{admin.id}</span>
						</div>
						<div className="infoField">
							<span className="title">Телефон:</span>
							<span className="value">{admin.phone || "—"}</span>
						</div>
						<div className="infoField">
							<span className="title">Роль:</span>
							<span className="value">{getRoleName(admin.role)}</span>
						</div>
						<div className="infoField">
							<span className="title">Отдел:</span>
							<span className="value">{admin.department?.name || "Без отдела"}</span>
						</div>
						{userExists ? (
							<div className="infoField">
								<span className="title maxContent">Профиль:</span>
								<span className="value">
									<a href={`/admin/users/${admin.id}`} className="itemLink" onClick={(e) => { e.preventDefault(); router.push(`/admin/users/${admin.id}`); }}>
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

	// Ссылка на категорию или текст «удалена»
	const renderCategoryCell = useCallback(
		(log: CategoryLog) => {
			const cat = log.targetCategory;
			if (!cat?.id) return "—";
			const exists = existingCategories.has(cat.id);
			const title = cat.title || "—";
			if (exists) {
				return (
					<a href={`/admin/categories/${cat.id}`} className="departmentLink" onClick={(e) => { e.preventDefault(); router.push(`/admin/categories/${cat.id}`); }}>
						{title}
					</a>
				);
			}
			return <span className="category">{title} (удалена)</span>;
		},
		[existingCategories, router]
	);

	// Блок результата: создание / редактирование / удаление
	const getResultBlock = useCallback(
		(log: CategoryLog): React.ReactNode => {
			const actions = log.actions || [];
			const key = (prefix: string) => `${prefix}_${log.id}`;

			if (actions.includes("create")) {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock create">
								<div className={`clickInfoBlock ${activeBlocks[key("create")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("create"))}>
									Создание категории
								</div>
								<div className={`openingBlock ${activeBlocks[key("create")] ? "active" : ""}`}>
									{log.snapshotAfter && (
										<div className="infoField">
											<span className="title">ID:</span>
											<span className="value">{log.snapshotAfter.id}</span>
										</div>
									)}
									{log.snapshotAfter?.title != null && (
										<div className="infoField">
											<span className="title">Название:</span>
											<span className="value">{log.snapshotAfter.title}</span>
										</div>
									)}
									{log.snapshotAfter?.order != null && (
										<div className="infoField">
											<span className="title">Порядок:</span>
											<span className="value">{log.snapshotAfter.order}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				);
			}

			if (actions.includes("delete")) {
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock remove">
								<div className={`clickInfoBlock ${activeBlocks[key("delete")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("delete"))}>
									Удаление категории
								</div>
								<div className={`openingBlock ${activeBlocks[key("delete")] ? "active" : ""}`}>
									{log.snapshotBefore && (
										<>
											<div className="infoField">
												<span className="title">ID:</span>
												<span className="value">{log.snapshotBefore.id}</span>
											</div>
											<div className="infoField">
												<span className="title">Название:</span>
												<span className="value">{log.snapshotBefore.title ?? "—"}</span>
											</div>
											{log.snapshotBefore.order != null && (
												<div className="infoField">
													<span className="title">Порядок:</span>
													<span className="value">{log.snapshotBefore.order}</span>
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

			if (actions.includes("update")) {
				const before = log.snapshotBefore;
				const after = log.snapshotAfter;
				return (
					<div className="tableListBlock">
						<div className="tableListItems">
							<div className="tableListItem fullInfoBlock update">
								<div className={`clickInfoBlock ${activeBlocks[key("update")] ? "active" : ""}`} onClick={() => toggleActiveBlock(key("update"))}>
									Редактирование категории
								</div>
								<div className={`openingBlock ${activeBlocks[key("update")] ? "active" : ""}`}>
									<div className="changesTable">
										<table>
											<thead>
												<tr>
													<th>Параметр</th>
													<th>Было</th>
													<th>Стало</th>
												</tr>
											</thead>
											<tbody>
												{(before?.title != null || after?.title != null) && (
													<tr>
														<td>Название</td>
														<td className="oldValue">{before?.title ?? "—"}</td>
														<td className="newValue">{after?.title ?? "—"}</td>
													</tr>
												)}
												{(before?.order != null || after?.order != null) && (
													<tr>
														<td>Порядок</td>
														<td className="oldValue">{before?.order ?? "—"}</td>
														<td className="newValue">{after?.order ?? "—"}</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
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

	// Мемоизируем строковое представление queryParams для использования в зависимостях useEffect
	const queryParamsString = useMemo(() => queryParams.toString(), [queryParams]);

	useEffect(() => {
		const baseUrl = categoryId ? `/api/categories/${categoryId}/logs` : "/api/categories/logs";
		const fetchLogs = async () => {
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(`${baseUrl}?${queryParamsString}`, { credentials: "include" });
				const data = await res.json();
				if (data.error) throw new Error(data.error);
				const logs = data.data || [];
				setLocalLogs(logs);
				setTotalPages(data.totalPages ?? 1);
				if (onLogsUpdate) onLogsUpdate(data.total ?? 0, data.totalPages ?? 1);

				const categoryIdsToCheck = [...new Set((logs as CategoryLog[]).map((l) => l.targetCategory?.id).filter(Boolean) as number[])];
				await checkCategoriesExistence(categoryIdsToCheck);

				const adminIdsToCheck = [...new Set((logs as CategoryLog[]).map((l) => l.admin?.id).filter(Boolean) as number[])];
				await checkUsersExistence(adminIdsToCheck);
			} catch (e) {
				console.error("Ошибка загрузки логов категорий:", e);
				setError(e instanceof Error ? e.message : "Ошибка загрузки");
			} finally {
				setLoading(false);
			}
		};
		fetchLogs();
	}, [queryParamsString, categoryId, onLogsUpdate, checkCategoriesExistence, checkUsersExistence]);

	const colCount = categoryId ? 3 : 4;

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
								{!categoryId && (
									<td>{renderCategoryCell(log)}</td>
								)}
								<td>
									{log.admin ? renderAdminCard(log) : "—"}
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
