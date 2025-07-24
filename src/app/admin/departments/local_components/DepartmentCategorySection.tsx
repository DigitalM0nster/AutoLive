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

	useEffect(() => {
		console.log(categoryCounts);
	}, [categoryCounts]);

	// состояние модалки
	const [modalOpen, setModalOpen] = useState(false);
	const [modalType, setModalType] = useState<"move" | null>(null);
	const [modalPayload, setModalPayload] = useState<{ sourceId: number; targetId?: number }>({ sourceId: 0 });

	// Состояния для "Без категории"
	const [emptyMoveTarget, setEmptyMoveTarget] = useState<number | null>(null);
	const [emptyMoveActive, setEmptyMoveActive] = useState(false);
	const [emptyModalType, setEmptyModalType] = useState<"move" | null>(null);
	const [emptyModalOpen, setEmptyModalOpen] = useState(false);

	// Состояния для перемещения в "Без категории"
	const [moveToEmptyActive, setMoveToEmptyActive] = useState<number | null>(null); // id категории, из которой переносим
	const [moveToEmptyModalOpen, setMoveToEmptyModalOpen] = useState(false);

	// Состояния для перемещения между категориями
	const [moveSource, setMoveSource] = useState<number | null>(null); // id исходной категории (или null для "Без категории")
	const [moveTarget, setMoveTarget] = useState<number | null>(null); // id целевой категории (или null для "Без категории")
	const [moveModalOpen, setMoveModalOpen] = useState(false);

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

	// вызывается по клику "Переместить" в ConfirmPopup
	const moveProductsConfirmed = async (sourceCategoryId: number, targetCategoryId: number) => {
		try {
			console.log("Отправляем запрос на перемещение:", { sourceCategoryId, targetCategoryId });
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
				console.error("Ошибка сервера:", error);
				showErrorToast(error || "Ошибка перемещения");
			}
		} catch {
			showErrorToast("Ошибка запроса");
		} finally {
			setModalOpen(false);
			setActiveMoveCategoryId(null);
		}
	};

	// Обработчик перемещения товаров без категории
	const moveEmptyCategoryConfirmed = async (targetCategoryId: number) => {
		try {
			console.log('Отправляем запрос на перемещение из "Без категории":', { sourceCategoryId: 0, targetCategoryId });
			const res = await fetch(`/api/departments/${department.id}/move-products-to-category`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ sourceCategoryId: 0, targetCategoryId }),
			});
			if (res.ok) {
				showSuccessToast("Товары перемещены");
				setCategoryCounts((prev) => ({
					...prev,
					0: 0,
					[targetCategoryId]: (prev[targetCategoryId] || 0) + (prev[0] || 0),
				}));
			} else {
				const { error } = await res.json();
				console.error("Ошибка сервера:", error);
				showErrorToast(error || "Ошибка перемещения");
			}
		} catch {
			showErrorToast("Ошибка запроса");
		} finally {
			setEmptyModalOpen(false);
			setEmptyMoveActive(false);
			setEmptyMoveTarget(null);
		}
	};

	// Обработчик перемещения товаров в "Без категории"
	const moveToEmptyCategoryConfirmed = async (sourceCategoryId: number) => {
		try {
			console.log('Отправляем запрос на перемещение в "Без категории":', { sourceCategoryId, targetCategoryId: 0 });
			const res = await fetch(`/api/departments/${department.id}/move-products-to-category`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ sourceCategoryId, targetCategoryId: 0 }),
			});
			if (res.ok) {
				showSuccessToast("Товары перемещены в 'Без категории'");
				setCategoryCounts((prev) => ({
					...prev,
					0: (prev[0] || 0) + (prev[sourceCategoryId] || 0),
					[sourceCategoryId]: 0,
				}));
			} else {
				const { error } = await res.json();
				console.error("Ошибка сервера:", error);
				showErrorToast(error || "Ошибка перемещения");
			}
		} catch {
			showErrorToast("Ошибка запроса");
		} finally {
			setMoveToEmptyModalOpen(false);
			setMoveToEmptyActive(null);
		}
	};

	// Обработчик перемещения товаров между категориями
	const moveCategoryConfirmed = async (sourceCategoryId: number | null, targetCategoryId: number | null) => {
		try {
			const sourceId = sourceCategoryId === null ? 0 : sourceCategoryId;
			const targetId = targetCategoryId === null ? 0 : targetCategoryId;
			console.log("Отправляем запрос на перемещение между категориями:", { sourceId, targetId });
			const res = await fetch(`/api/departments/${department.id}/move-products-to-category`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ sourceCategoryId: sourceId, targetCategoryId: targetId }),
			});
			if (res.ok) {
				showSuccessToast("Товары перемещены");
				setCategoryCounts((prev) => {
					const countFrom = prev[sourceId] || 0;
					const countTo = prev[targetId] || 0;
					return {
						...prev,
						[sourceId]: 0,
						[targetId]: countTo + countFrom,
					};
				});
			} else {
				const { error } = await res.json();
				showErrorToast(error || "Ошибка перемещения");
			}
		} catch {
			showErrorToast("Ошибка запроса");
		} finally {
			setMoveModalOpen(false);
			setMoveSource(null);
			setMoveTarget(null);
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
	const openModal = (type: "move", sourceId: number, targetId?: number) => {
		if (!isEditable) return; // Если нет прав на редактирование, не открываем модалку

		setModalType(type);
		setModalPayload({ sourceId, targetId });
		if (targetId === 0) {
			setMoveToEmptyActive(sourceId);
			setMoveToEmptyModalOpen(true);
		} else {
			setModalOpen(true);
		}
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
										<>
											<div className={`itemInfo ${styles.itemInfo}`}>{count} товаров</div>
											<div className={`moveButtonBlock ${styles.moveButtonBlock}`}>
												<CustomSelect
													options={[
														{ value: "0", label: "Без категории" },
														...categories
															.filter((c) => c.id !== category.id && formCategories.includes(c.id))
															.map((c) => ({ value: c.id.toString(), label: c.title })),
													]}
													value={selectedTargetCategories[category.id]?.toString() || ""}
													onChange={(value) => {
														setSelectedTargetCategories((prev) => ({
															...prev,
															[category.id]: value === "0" ? 0 : parseInt(value),
														}));
													}}
													placeholder="Выберите категорию"
												/>
												<button
													onClick={() => {
														const targetId = selectedTargetCategories[category.id];
														if (targetId !== undefined) {
															openModal("move", category.id, targetId === 0 ? 0 : targetId);
														}
													}}
													disabled={selectedTargetCategories[category.id] === undefined}
													className="button"
												>
													Переместить
												</button>
												<button onClick={() => setActiveMoveCategoryId(null)} className="button">
													Отмена
												</button>
											</div>
										</>
									) : (
										<>
											<div className={`itemInfo ${styles.itemInfo}`}>{count} товаров</div>
											<div className={`moveButtonBlock ${styles.moveButtonBlock}`}>
												<button onClick={() => setActiveMoveCategoryId(category.id)} className="button">
													Переместить
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
				<div className={`emptyItem ${styles.categoryItem} ${styles.emptyItem}`}>
					<div className={`itemTitleBlock ${styles.itemTitleBlock}`}>
						<div className={`itemTitle ${styles.itemTitle}`}>Без категории</div>
					</div>
					<div className={`itemInfoBlock ${styles.itemInfoBlock}`}>
						<div className={`itemInfo ${styles.itemInfo}`}>{categoryCounts[0] || 0} товаров</div>
						{isEditable && categoryCounts[0] > 0 && (
							<div className={styles.moveButtonBlock}>
								{emptyMoveActive ? (
									<div className={`moveButtonBlock ${styles.moveButtonBlock}`}>
										<CustomSelect
											options={categories.filter((c) => formCategories.includes(c.id)).map((c) => ({ value: c.id.toString(), label: c.title }))}
											value={emptyMoveTarget?.toString() || ""}
											onChange={(value) => setEmptyMoveTarget(parseInt(value))}
											placeholder="Выберите категорию"
										/>
										<button
											onClick={() => {
												if (emptyMoveTarget) {
													setEmptyModalType("move");
													setEmptyModalOpen(true);
												}
											}}
											disabled={!emptyMoveTarget}
											className="button"
										>
											Переместить
										</button>
										<button
											onClick={() => {
												setEmptyMoveActive(false);
												setEmptyMoveTarget(null);
											}}
											className="button"
										>
											Отмена
										</button>
									</div>
								) : (
									<button onClick={() => setEmptyMoveActive(true)} className="button">
										Переместить
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Модальное окно подтверждения */}
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
			{emptyModalOpen && emptyModalType === "move" && emptyMoveTarget && (
				<ConfirmPopup
					open={emptyModalOpen}
					title="Подтверждение перемещения"
					message={`Вы уверены, что хотите переместить все товары без категории в категорию "${categories.find((c) => c.id === emptyMoveTarget)?.title}"?`}
					onConfirm={() => moveEmptyCategoryConfirmed(emptyMoveTarget)}
					onCancel={() => setEmptyModalOpen(false)}
					confirmText="Переместить"
					confirmButtonClassName="blueButton"
				/>
			)}

			{/* Модальное окно подтверждения для перемещения в "Без категории" */}
			{moveToEmptyModalOpen && moveToEmptyActive && (
				<ConfirmPopup
					open={moveToEmptyModalOpen}
					title="Подтверждение перемещения"
					message={`Вы уверены, что хотите переместить все товары из категории "${categories.find((c) => c.id === moveToEmptyActive)?.title}" в 'Без категории'?`}
					onConfirm={() => moveToEmptyCategoryConfirmed(moveToEmptyActive)}
					onCancel={() => setMoveToEmptyModalOpen(false)}
					confirmText="Переместить"
					confirmButtonClassName="blueButton"
				/>
			)}

			{/* Модальное окно подтверждения для перемещения между категориями */}
			{moveModalOpen && (
				<div>
					<div style={{ marginBottom: 16 }}>
						<CustomSelect
							options={[
								{ value: "0", label: "Без категории" },
								...categories.filter((c) => formCategories.includes(c.id)).map((c) => ({ value: c.id.toString(), label: c.title })),
							]}
							value={moveTarget !== null ? moveTarget.toString() : ""}
							onChange={(value) => setMoveTarget(value === "0" ? null : parseInt(value))}
							placeholder="Выберите категорию"
						/>
					</div>
					<ConfirmPopup
						open={moveModalOpen}
						title="Подтверждение перемещения"
						message={
							moveSource === null
								? `Вы уверены, что хотите переместить все товары без категории в выбранную категорию?`
								: `Вы уверены, что хотите переместить все товары из категории "${categories.find((c) => c.id === moveSource)?.title}" в выбранную категорию?`
						}
						onConfirm={() => {
							if (moveTarget === null && moveSource === null) return;
							moveCategoryConfirmed(moveSource, moveTarget);
						}}
						onCancel={() => {
							setMoveModalOpen(false);
							setMoveSource(null);
							setMoveTarget(null);
						}}
						confirmText="Переместить"
						confirmButtonClassName="blueButton"
					/>
				</div>
			)}
		</div>
	);
}
