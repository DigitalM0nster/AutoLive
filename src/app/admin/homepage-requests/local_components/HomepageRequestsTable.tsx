"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import Pagination from "@/components/ui/pagination/Pagination";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";

type PayloadRow = {
	key: string;
	partType: string;
	placeholder: string;
	value?: string;
	fileUrl?: string;
	originalName?: string;
};

type Row = {
	id: number;
	createdAt: string;
	status: "new" | "processed";
	payload: unknown;
};

function getStatusMeta(status: Row["status"]) {
	if (status === "new") {
		return { text: "Новая", className: "statusCreated" };
	}

	return { text: "Обработана", className: "statusCompleted" };
}

function phoneFromPayload(payload: unknown): string {
	if (!Array.isArray(payload)) return "—";
	const phone = (payload as PayloadRow[]).find((p) => p.partType === "phone" && p.value);
	return phone?.value || "—";
}

export default function HomepageRequestsTable() {
	const [rows, setRows] = useState<Row[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [statusFilter, setStatusFilter] = useState<"all" | "new" | "processed">("all");
	const limit = 20;

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(limit) });
			if (statusFilter !== "all") params.set("status", statusFilter);
			const res = await fetch(`/api/homepage-requests?${params}`, { credentials: "include" });
			const data = await res.json();
			if (!res.ok) {
				showErrorToast(data.error || "Не удалось загрузить заявки");
				setRows([]);
				setTotal(0);
				return;
			}
			setRows(data.requests || []);
			setTotal(data.total || 0);
		} catch {
			showErrorToast("Ошибка сети");
			setRows([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [page, statusFilter]);

	useEffect(() => {
		load();
	}, [load]);

	const markProcessed = async (id: number) => {
		try {
			const res = await fetch(`/api/homepage-requests/${id}`, {
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "processed" }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				showErrorToast(data.error || "Не удалось обновить");
				return;
			}
			showSuccessToast("Отмечено как обработанная");
			load();
		} catch {
			showErrorToast("Ошибка сети");
		}
	};

	const totalPages = Math.max(1, Math.ceil(total / limit));

	return (
		<div className="tableContent">
			<div className="searchFilterHeader">
				<label className="row wrap">
					<span>Статус:</span>
					<select
						value={statusFilter}
						onChange={(e) => {
							setStatusFilter(e.target.value as "all" | "new" | "processed");
							setPage(1);
						}}
					>
						<option value="all">Все</option>
						<option value="new">Новые</option>
						<option value="processed">Обработанные</option>
					</select>
				</label>
			</div>

			{loading ? (
				<Loading />
			) : (
				<div className="tableContainer">
					<table className="table">
						<thead>
							<tr>
								<th>ID</th>
								<th>Дата</th>
								<th>Телефон</th>
								<th>Статус</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={5}>Нет заявок</td>
								</tr>
							) : (
								rows.map((r) => {
									const statusMeta = getStatusMeta(r.status);
									return (
										<tr key={r.id}>
											<td>{r.id}</td>
											<td>{new Date(r.createdAt).toLocaleString("ru-RU")}</td>
											<td>{phoneFromPayload(r.payload)}</td>
											<td>
												<span className={`orderStatusBadge ${statusMeta.className}`}>{statusMeta.text}</span>
											</td>
											<td>
												<div className="row wrap">
													<Link href={`/admin/homepage-requests/${r.id}`} className="itemLink">
														Открыть
													</Link>
													{r.status === "new" && (
														<button type="button" className="logoutButton" onClick={() => markProcessed(r.id)}>
															Обработана
														</button>
													)}
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}

			{totalPages > 1 && (
				<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
			)}
		</div>
	);
}
