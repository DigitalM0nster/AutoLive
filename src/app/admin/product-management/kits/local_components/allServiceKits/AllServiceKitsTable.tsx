"use client";

import React, { useEffect, useState } from "react";
import styles from "../../../products/local_components/styles.module.scss";
import Pagination from "@/components/ui/pagination/Pagination";
import type { ServiceKit } from "@/lib/types";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import ScrollableTableWrapper from "@/components/ui/scrollableTableWrapper/ScrollableTableWrapper";

export default function AllServiceKitsTable() {
	const { user } = useAuthStore();
	const [kits, setKits] = useState<ServiceKit[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(0);

	// Состояние для удаления
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [kitToDelete, setKitToDelete] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const limit = 20;

	// Загружаем список комплектов ТО
	const fetchKits = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			const response = await fetch(`/api/service-kits?${params.toString()}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Ошибка при загрузке комплектов ТО");
			}

			setKits(data.kits || []);
			setTotal(data.total || 0);
			setTotalPages(data.totalPages || 0);
		} catch (error: any) {
			console.error("Ошибка при загрузке комплектов ТО:", error);
			showErrorToast(error.message || "Ошибка при загрузке комплектов ТО");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchKits();
	}, [page]);

	// Обработчик удаления комплекта
	const handleDeleteClick = (kitId: number) => {
		setKitToDelete(kitId);
		setShowDeleteConfirm(true);
	};

	const handleDeleteConfirm = async () => {
		if (!kitToDelete) return;

		setIsDeleting(true);
		try {
			const response = await fetch(`/api/service-kits/${kitToDelete}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Ошибка при удалении комплекта ТО");
			}

			showSuccessToast("Комплект ТО успешно удален");
			setShowDeleteConfirm(false);
			setKitToDelete(null);
			fetchKits(); // Перезагружаем список
		} catch (error: any) {
			console.error("Ошибка при удалении комплекта ТО:", error);
			showErrorToast(error.message || "Ошибка при удалении комплекта ТО");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDeleteCancel = () => {
		setShowDeleteConfirm(false);
		setKitToDelete(null);
	};

	// Форматирование цены
	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(price);
	};

	if (loading && kits.length === 0) {
		return (
			<div className="tableContent">
				<Loading />
			</div>
		);
	}

	return (
		<div className={`tableContent ${styles.tableContent}`}>
			{kits.length === 0 ? (
				<div className={styles.emptyState}>
					<p>Комплекты ТО не найдены</p>
					<Link href="/admin/product-management/kits/create" className="createButton">
						Создать первый комплект ТО
					</Link>
				</div>
			) : (
				<>
					<div className={styles.tableContainer}>
						<ScrollableTableWrapper>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>ID</th>
										<th>Название</th>
										<th>Описание</th>
										<th>Цена</th>
										<th>Количество товаров</th>
										<th>Действия</th>
									</tr>
								</thead>
								<tbody>
									{kits.map((kit) => (
										<tr key={kit.id}>
											<td>{kit.id}</td>
											<td>
												<Link href={`/admin/product-management/kits/${kit.id}`} className={styles.link}>
													{kit.title}
												</Link>
											</td>
											<td className={styles.descriptionCell}>
												{kit.description ? <div className={styles.descriptionPreview}>{kit.description}</div> : <span className={styles.noData}>—</span>}
											</td>
											<td>{formatPrice(kit.price || 0)}</td>
											<td>{kit.kitItems?.length || 0}</td>
											<td>
												<div className={styles.actions}>
													<Link href={`/admin/product-management/kits/${kit.id}`} className={styles.editButton}>
														Редактировать
													</Link>
													{user?.role === "superadmin" || user?.role === "admin" ? (
														<button onClick={() => handleDeleteClick(kit.id)} className={styles.deleteButton} disabled={isDeleting}>
															Удалить
														</button>
													) : null}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</ScrollableTableWrapper>
					</div>

					<Link href="/admin/product-management/kits/create" className="createButton">
						+ Создать комплект ТО
					</Link>

					{totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.productsPagination} />}
				</>
			)}

			<ConfirmPopup
				open={showDeleteConfirm}
				title="Подтверждение удаления"
				message="Вы уверены, что хотите удалить этот комплект ТО? Это действие нельзя отменить."
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
				confirmText="Удалить"
				cancelText="Отмена"
			/>
		</div>
	);
}
