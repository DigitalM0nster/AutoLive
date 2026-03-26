"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
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

export default function HomepageRequestDetail({ id }: { id: number }) {
	const [row, setRow] = useState<Row | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/homepage-requests/${id}`, { credentials: "include" });
				const data = await res.json();
				if (cancelled) return;
				if (!res.ok) {
					showErrorToast(data.error || "Не найдено");
					setRow(null);
					return;
				}
				setRow(data);
			} catch {
				if (!cancelled) {
					showErrorToast("Ошибка сети");
					setRow(null);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id]);

	const markProcessed = async () => {
		try {
			const res = await fetch(`/api/homepage-requests/${id}`, {
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "processed" }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				showErrorToast(data.error || "Ошибка");
				return;
			}
			showSuccessToast("Сохранено");
			const r = await fetch(`/api/homepage-requests/${id}`, { credentials: "include" });
			const d = await r.json();
			if (r.ok) setRow(d);
		} catch {
			showErrorToast("Ошибка сети");
		}
	};

	if (loading) return <Loading />;
	if (!row) return <p>Заявка не найдена.</p>;

	const payload = Array.isArray(row.payload) ? (row.payload as PayloadRow[]) : [];
	const statusMeta = getStatusMeta(row.status);

	return (
		<div className="tableContent">
			<div className="row wrap">
				<Link href="/admin/homepage-requests" className="itemLink">
					← К списку
				</Link>
			</div>
			<div className="infoField">
				<span className="title">ID:</span>
				<span className="value">{row.id}</span>
			</div>
			<div className="infoField">
				<span className="title">Создана:</span>
				<span className="value">{new Date(row.createdAt).toLocaleString("ru-RU")}</span>
			</div>
			<div className="infoField">
				<span className="title">Статус:</span>
				<span className={`orderStatusBadge ${statusMeta.className}`}>{statusMeta.text}</span>
			</div>
			{row.status === "new" && (
				<div className="row wrap">
					<button type="button" className="logoutButton" onClick={markProcessed}>
						Отметить обработанной
					</button>
				</div>
			)}
			<h3 className="cardTitle">Данные формы</h3>
			<ul>
				{payload.map((p) => (
					<li key={p.key}>
						<strong>{p.placeholder || p.key}:</strong>{" "}
						{p.partType === "file" && p.fileUrl ? (
							<a href={p.fileUrl} className="itemLink" target="_blank" rel="noopener noreferrer">
								{p.originalName || "Файл"}
							</a>
						) : (
							<span>{p.value || "—"}</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
