"use client";

import React, { useEffect, useState } from "react";
import styles from "@/app/admin/departments/local_components/styles.module.scss";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import { ActiveFilter, PickupPoint } from "@/lib/types";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import ScrollableTableWrapper from "@/components/ui/scrollableTableWrapper/ScrollableTableWrapper";

export default function AllPickupPointsTable() {
	const [points, setPoints] = useState<PickupPoint[]>([]);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [pointToDelete, setPointToDelete] = useState<PickupPoint | null>(null);
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState<"id" | "name" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
	const { role } = useAuthStore();

	const canManage = () => role === "superadmin" || role === "admin";

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/pickup-points", { credentials: "include" });
				if (!res.ok) throw new Error("Ошибка загрузки");
				const data = await res.json();
				setPoints(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error(e);
				showErrorToast("Ошибка загрузки пунктов выдачи");
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const resetFilters = () => {
		setSortBy(null);
		setSortOrder(null);
		setSearch("");
	};

	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];
		if (sortBy) {
			filters.push({
				key: "sort",
				label: "Сортировка",
				value: `${sortBy === "name" ? "Название" : "ID"} ${sortOrder === "asc" ? "↑" : "↓"}`,
			});
		}
		return filters;
	};

	const sortData = (data: PickupPoint[]) => {
		if (!sortBy || !sortOrder) return data;
		return [...data].sort((a, b) => {
			let aVal: any = a[sortBy];
			let bVal: any = b[sortBy];
			if (typeof aVal === "string" && typeof bVal === "string") {
				return sortOrder === "asc" ? aVal.localeCompare(bVal, "ru") : bVal.localeCompare(aVal, "ru");
			}
			return sortOrder === "asc" ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
		});
	};

	const filterData = (data: PickupPoint[]) => {
		if (!search) return data;
		const s = search.toLowerCase();
		return data.filter(
			(p) =>
				(p.name && p.name.toLowerCase().includes(s)) ||
				(p.address && p.address.toLowerCase().includes(s)) ||
				(p.phones && p.phones.some((ph) => ph.toLowerCase().includes(s))) ||
				(p.emails && p.emails.some((e) => e.toLowerCase().includes(s)))
		);
	};

	const confirmDelete = async () => {
		if (!pointToDelete) return;
		try {
			const res = await fetch(`/api/pickup-points/${pointToDelete.id}`, { method: "DELETE", credentials: "include" });
			if (res.ok) {
				setPoints((prev) => prev.filter((p) => p.id !== pointToDelete.id));
				setShowDeleteModal(false);
				setPointToDelete(null);
				showSuccessToast("Пункт выдачи удалён");
			} else {
				const err = await res.json();
				showErrorToast(err.error || "Не удалось удалить");
			}
		} catch {
			showErrorToast("Ошибка при удалении");
		}
	};

	const processed = sortData(filterData(points));

	return (
		<>
			<div className={`tableContent ${styles.tableContent}`}>
				<FiltersBlock
					activeFilters={getActiveFilters()}
					onResetFilters={resetFilters}
					searchValue={search}
					onSearchChange={setSearch}
					searchPlaceholder="Поиск по названию, адресу, телефонам, почтам..."
					showSearch={true}
				/>
				<div className={styles.tableContainer}>
					<ScrollableTableWrapper>
						<table className={styles.table}>
							<thead className={styles.tableHeader}>
								<tr>
									<th
										className={`${styles.tableHeaderCell} idCell sortableHeader ${sortBy === "id" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
										onClick={() => {
											if (sortBy !== "id") {
												setSortBy("id");
												setSortOrder("asc");
											} else if (sortOrder === "asc") setSortOrder("desc");
											else {
												setSortBy(null);
												setSortOrder(null);
											}
										}}
									>
										ID
									</th>
									<th
										className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
										onClick={() => {
											if (sortBy !== "name") {
												setSortBy("name");
												setSortOrder("asc");
											} else if (sortOrder === "asc") setSortOrder("desc");
											else {
												setSortBy(null);
												setSortOrder(null);
											}
										}}
									>
										Название
									</th>
									<th className={styles.tableHeaderCell}>Адрес</th>
									<th className={styles.tableHeaderCell}>Телефон</th>
									<th className={styles.tableHeaderCell}>Почты</th>
									{canManage() && <th className={styles.tableHeaderCell}>Действия</th>}
								</tr>
							</thead>
							<tbody className={styles.tableBody}>
								{loading ? (
									<tr>
										<td colSpan={canManage() ? 6 : 5} className={styles.loadingCell}>
											<Loading />
										</td>
									</tr>
								) : processed.length === 0 ? (
									<tr>
										<td colSpan={canManage() ? 6 : 5} className={styles.emptyCell}>
											{search ? "Пункты не найдены" : "Нет пунктов выдачи"}
										</td>
									</tr>
								) : (
									processed.map((p) => (
										<tr key={p.id} className={styles.tableRow}>
											<td className={`${styles.tableCell} idCell`}>{p.id}</td>
											<td className={styles.tableCell}>
												<Link href={`/admin/pickup-points/${p.id}/edit`} className={styles.departmentLink}>
													{p.name || "—"}
												</Link>
											</td>
											<td className={styles.tableCell}>{p.address}</td>
											<td className={styles.tableCell}>
												{p.phones?.length ? (
													<div className="column" style={{ gap: 4 }}>
														{p.phones.map((ph, i) => (
															<span key={i}>{ph}</span>
														))}
													</div>
												) : (
													"—"
												)}
											</td>
											<td className={styles.tableCell}>
												{p.emails?.length ? (
													<div className="column" style={{ gap: 4 }}>
														{p.emails.map((em, i) => (
															<span key={i}>{em}</span>
														))}
													</div>
												) : (
													"—"
												)}
											</td>
											{canManage() && (
												<td className={styles.tableCell}>
													<div className="rowBlock" style={{ gap: 10 }}>
														<button className="button" style={{ padding: "5px 15px", fontSize: "12px" }} onClick={() => router.push(`/admin/pickup-points/${p.id}/edit`)}>
															Редактировать
														</button>
														<button className="removeButton" onClick={() => { setPointToDelete(p); setShowDeleteModal(true); }}>
															Удалить
														</button>
													</div>
												</td>
											)}
										</tr>
									))
								)}
							</tbody>
						</table>
					</ScrollableTableWrapper>
					{canManage() && (
						<Link href="/admin/pickup-points/create" className="createButton">
							+ Создать пункт выдачи
						</Link>
					)}
				</div>
			</div>
			<ConfirmPopup open={showDeleteModal} title="Подтверждение удаления" confirmText="Удалить" cancelText="Отмена" onConfirm={confirmDelete} onCancel={() => { setShowDeleteModal(false); setPointToDelete(null); }}>
				<div>
					<p>
						Удалить пункт выдачи <strong>&ldquo;{pointToDelete?.name || pointToDelete?.address}&rdquo;</strong>?
					</p>
					<p className={styles.warningText}>Это действие нельзя отменить.</p>
				</div>
			</ConfirmPopup>
		</>
	);
}
