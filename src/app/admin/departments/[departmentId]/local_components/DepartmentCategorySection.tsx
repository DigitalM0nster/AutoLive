"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Tag, Trash2, ArrowRightLeft } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";
import ConfirmModal from "@/components/ui/confirmModal/ConfirmModal";

type CategoryType = { id: number; title: string };

type DepartmentData = {
	id: number;
	allowedCategories: { category: CategoryType }[];
};

export default function DepartmentCategorySection({
	categories,
	formCategories,
	setFormCategories,
	department,
}: {
	categories: CategoryType[];
	formCategories: number[];
	setFormCategories: Dispatch<SetStateAction<number[]>>;
	department: DepartmentData;
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

	// вызывается по клику “Удалить” в ConfirmModal
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

	// вызывается по клику “Переместить” в ConfirmModal
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

	return (
		<>
			<div className="mb-10 border border-gray-200 rounded-xl p-4 bg-white">
				<h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
					<Tag className="w-5 h-5 text-indigo-600" />
					Категории отдела
				</h2>

				<ul className="space-y-2">
					{categories.map((cat) => {
						const isChecked = formCategories.includes(cat.id);
						const count = categoryCounts[cat.id] ?? 0;
						const allowedCategories = department.allowedCategories.map((a) => a.category);
						const moveTargets = allowedCategories.filter((target) => target.id !== cat.id);

						const selectedTarget = selectedTargetCategories[cat.id];

						return (
							<li key={cat.id} className="flex justify-between items-start gap-6 bg-gray-50 px-4 py-3 rounded-lg border hover:bg-gray-100 transition">
								{/* Слева: чекбокс и название */}
								<div
									className="flex items-start gap-3 cursor-pointer"
									onClick={(e) => {
										if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("select")) return;
										if (isChecked) {
											setFormCategories((prev) => prev.filter((id) => id !== cat.id));
										} else {
											setFormCategories((prev) => [...prev, cat.id]);
										}
									}}
								>
									<div className="relative w-5 h-5 mt-1">
										<div
											className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
												isChecked ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-400"
											}`}
										>
											{isChecked && (
												<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											)}
										</div>
									</div>
									<div className="font-medium">{cat.title}</div>
								</div>

								{/* Справа: инфо и действия */}
								<div className="flex flex-col items-end gap-2 min-w-[220px]">
									{isChecked && <div className="text-sm text-gray-500">Товаров: {count}</div>}

									{isChecked && count > 0 && (
										<>
											<button
												onClick={() => setActiveMoveCategoryId(activeMoveCategoryId === cat.id ? null : cat.id)}
												className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
											>
												<ArrowRightLeft className="w-4 h-4" />
												Переместить товары в другую категорию
											</button>

											{activeMoveCategoryId === cat.id && (
												<div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
													<select
														className="text-sm border rounded px-2 py-1 w-full sm:w-auto"
														value={selectedTarget ?? ""}
														onChange={(e) =>
															setSelectedTargetCategories((prev) => ({
																...prev,
																[cat.id]: Number(e.target.value),
															}))
														}
													>
														<option value="">Выбрать категорию</option>
														{moveTargets.map((target) => (
															<option key={target.id} value={target.id}>
																{target.title}
															</option>
														))}
														<option value="0">Без категории</option>
													</select>

													<button
														onClick={() => {
															setModalType("move");
															setModalPayload({ sourceId: cat.id, targetId: selectedTargetCategories[cat.id] });
															setModalOpen(true);
														}}
														disabled={selectedTarget === undefined || selectedTarget === cat.id}
														className="text-sm px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
													>
														Переместить
													</button>
												</div>
											)}

											<button
												onClick={() => {
													setModalType("delete");
													setModalPayload({ sourceId: cat.id });
													setModalOpen(true);
												}}
												className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
											>
												<Trash2 className="w-4 h-4" />
												Удалить все товары из категории
											</button>
										</>
									)}
								</div>
							</li>
						);
					})}

					{/* Без категории */}
					{categoryCounts[0] > 0 && (
						<li className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border">
							<div>
								<strong>Без категории</strong>
								<span className="ml-2 text-sm text-gray-500">Товаров: {categoryCounts[0]}</span>
							</div>
						</li>
					)}
				</ul>
			</div>
			<ConfirmModal
				open={modalOpen}
				title={modalType === "delete" ? "Удалить все товары?" : "Переместить товары?"}
				message={
					modalType === "delete"
						? "Вы действительно хотите удалить все товары из этой категории?"
						: "Вы действительно хотите переместить все товары в выбранную категорию?"
				}
				confirmText={modalType === "delete" ? "Удалить" : "Переместить"}
				cancelText="Отмена"
				onConfirm={() => {
					if (modalType === "delete") {
						deleteByCategoryConfirmed(modalPayload.sourceId);
					} else if (modalType === "move" && modalPayload.targetId !== undefined) {
						moveProductsConfirmed(modalPayload.sourceId, modalPayload.targetId);
					}
				}}
				onCancel={() => setModalOpen(false)}
				confirmButtonClassName={modalType === "move" ? "bg-indigo-600 text-white hover:bg-indigo-700" : undefined}
			/>
		</>
	);
}
