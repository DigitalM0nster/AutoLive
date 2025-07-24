"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Tags, Trash2, ArrowRightLeft } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import styles from "./styles.module.scss";
import { Department, Category } from "@/lib/types";

export default function DepartmentCategorySection({
	categories,
	formCategories,
	setFormCategories,
	department,
	isEditable = true, // По умолчанию редактируемый
}: {
	categories: Category[];
	formCategories: number[];
	setFormCategories: Dispatch<SetStateAction<number[]>>;
	department: Department;
	isEditable?: boolean;
}) {
	const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>({});
	const [selectedTargetCategories, setSelectedTargetCategories] = useState<Record<number, number>>({});
	const [activeMoveCategoryId, setActiveMoveCategoryId] = useState<number | null>(null);

	// состояние модалки
	const [modalOpen, setModalOpen] = useState(false);
	const [modalType, setModalType] = useState<"delete" | "move" | null>(null);
	const [modalPayload, setModalPayload] = useState<{ sourceId: number; targetId?: number }>({ sourceId: 0 });

	useEffect(() => {
		if (!department?.id) return;
		const fetchCounts = async () => {
			try {
				const res = await fetch(`/api/departments/${department.id}/products-by-category`, { credentials: "include" });
				const data = await res.json();
				setCategoryCounts(data);
			} catch (err) {
				console.error("Ошибка получения количества товаров:", err);
			}
		};
		fetchCounts();
	}, [department?.id]);

	// вызывается по клику "Удалить" в ConfirmPopup
	const deleteByCategoryConfirmed = async (categoryId: number) => {
		try {
			const res = await fetch(`/api/departments/${department.id}/delete-products-by-category`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ categoryId }),
			});
			if (res.ok) {
				showSuccessToast("Удалено");
				setCategoryCounts((prev) => ({ ...prev, [categoryId]: 0 }));
			} else {
				const { error } = await res.json();
				showErrorToast(error || "Ошибка удаления");
			}
		} catch {
			+showErrorToast("Ошибка запроса");
		} finally {
			setModalOpen(false);
		}
	};

	// вызывается по клику "Переместить" в ConfirmPopup
	const moveProductsConfirmed = async (sourceCategoryId: number, targetCategoryId: number) => {
		try {
			const res = await fetch(`/api/departments/${department.id}/move-products-to-category`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ sourceCategoryId, targetCategoryId }),
			});
			if (res.ok) {
				showSuccessToast("Товары перемещены");
				setCategoryCounts((prev) => ({
					...prev,
					[sourceCategoryId]: 0,
					[targetCategoryId]: (prev[targetCategoryId] || 0) + (prev[sourceCategoryId] || 0),
				}));
			} else {
				const { error } = await res.json();
				showErrorToast(error || "Ошибка перемещения");
			}
		} catch {
			showErrorToast("Ошибка запроса");
		} finally {
			setModalOpen(false);
			setActiveMoveCategoryId(null);
		}
	};

	// Функция для добавления/удаления категории
	const toggleCategory = (categoryId: number) => {
		if (!isEditable) return; // Если нет прав на редактирование, не делаем ничего

		if (formCategories.includes(categoryId)) {
			setFormCategories(formCategories.filter((id) => id !== categoryId));
		} else {
			setFormCategories([...formCategories, categoryId]);
		}
	};

	// Обработчик для открытия модального окна
	const openModal = (type: "delete" | "move", sourceId: number, targetId?: number) => {
		if (!isEditable) return; // Если нет прав на редактирование, не открываем модалку

		setModalType(type);
		setModalPayload({ sourceId, targetId });
		setModalOpen(true);
	};

	return (
		<div className={`block sectionBlock ${styles.sectionBlock}`}>
			<h2 className={`blockTitle ${styles.blockTitle}`}>
				<Tags className={`${styles.icon}`} />
				Категории отдела
			</h2>

			<div className={`columnList ${styles.columnList}`}>
				{/* Список категорий */}
				{categories.map((category) => {
					const isSelected = formCategories.includes(category.id);
					const count = categoryCounts[category.id] || 0;

					return (
						<div key={category.id} className={`borderBlock categoryItem ${styles.borderBlock} ${styles.categoryItem}`}>
							<div className={`itemTitleBlock ${styles.itemTitleBlock}`} onClick={() => toggleCategory(category.id)}>
								<div className={`icon ${styles.icon} ${isSelected ? styles.active : ""}`}>
									<div className={`line ${styles.line}`}></div>
									<div className={`line ${styles.line}`}></div>
								</div>
								<div className={`itemTitle ${styles.itemTitle}`}>{category.title}</div>
							</div>
							<div className={`itemInfoBlock ${styles.itemInfoBlock}`}>
								{count > 0 && isEditable ? (
									activeMoveCategoryId === category.id ? (
										<div className={`moveButtonBlock ${styles.moveButtonBlock}`}>
											<CustomSelect
												options={categories
													.filter((c) => c.id !== category.id && formCategories.includes(c.id))
													.map((c) => ({ value: c.id.toString(), label: c.title }))}
												value={selectedTargetCategories[category.id]?.toString() || ""}
												onChange={(value) => {
													setSelectedTargetCategories((prev) => ({
														...prev,
														[category.id]: parseInt(value),
													}));
												}}
												placeholder="Выберите категорию"
											/>
											<button
												onClick={() => {
													const targetId = selectedTargetCategories[category.id];
													if (targetId) {
														openModal("move", category.id, targetId);
													}
												}}
												disabled={!selectedTargetCategories[category.id]}
												className="button"
											>
												Переместить
											</button>
											<button onClick={() => setActiveMoveCategoryId(null)} className="button">
												Отмена
											</button>
										</div>
									) : (
										<>
											<div className={`itemInfo ${styles.itemInfo}`}>{count} товаров</div>
											<div className={`moveButtonBlock ${styles.moveButtonBlock}`}>
												<button onClick={() => setActiveMoveCategoryId(category.id)} className="button">
													<ArrowRightLeft size={16} />
													Переместить
												</button>
												<button onClick={() => openModal("delete", category.id)} className="button redButton">
													<Trash2 size={16} />
													Удалить
												</button>
											</div>
										</>
									)
								) : (
									<div className={`itemInfo ${styles.itemInfo}`}>{count} товаров</div>
								)}
							</div>
						</div>
					);
				})}

				{/* Товары без категории */}
				<div className={`emptyItem ${styles.categoryItem}`}>
					<div className={`itemTitleBlock ${styles.itemTitleBlock}`}>
						<div className={`itemTitle ${styles.itemTitle}`}>Без категории</div>
					</div>
					<div className={`itemInfoBlock ${styles.itemInfoBlock}`}>
						<div className={`itemInfo ${styles.itemInfo}`}>{categoryCounts[0]} товаров</div>
					</div>
				</div>
			</div>

			{/* Модальное окно подтверждения */}
			{modalOpen && modalType === "delete" && (
				<ConfirmPopup
					open={modalOpen}
					title="Подтверждение удаления"
					message={`Вы уверены, что хотите удалить все товары из категории "${categories.find((c) => c.id === modalPayload.sourceId)?.title}"?`}
					onConfirm={() => deleteByCategoryConfirmed(modalPayload.sourceId)}
					onCancel={() => setModalOpen(false)}
					confirmText="Удалить"
					confirmButtonClassName="logoutButton"
				/>
			)}

			{modalOpen && modalType === "move" && modalPayload.targetId && (
				<ConfirmPopup
					open={modalOpen}
					title="Подтверждение перемещения"
					message={`Вы уверены, что хотите переместить все товары из категории "${categories.find((c) => c.id === modalPayload.sourceId)?.title}" в категорию "${
						categories.find((c) => c.id === modalPayload.targetId)?.title
					}"?`}
					onConfirm={() => moveProductsConfirmed(modalPayload.sourceId, modalPayload.targetId!)}
					onCancel={() => setModalOpen(false)}
					confirmText="Переместить"
					confirmButtonClassName="blueButton"
				/>
			)}
		</div>
	);
}
