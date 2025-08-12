"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import DepartmentCategorySection from "../local_components/DepartmentCategorySection";
import DepartmentStaffSection from "../local_components/DepartmentStaffSection";
import { Category, Department, User } from "@/lib/types";
import { Check, X, Trash2 } from "lucide-react";
import styles from "../local_components/styles.module.scss";
import Loading from "@/components/ui/loading/Loading";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import ChangesDisplay, { ChangeItem } from "../local_components/ChangesDisplay";

interface DepartmentPageProps {
	departmentId?: string | number;
	initialDepartment?: Department | null;
	initialCategories?: Category[];
}

export default function DepartmentPage({ initialDepartment = null, initialCategories = [] }: DepartmentPageProps) {
	const router = useRouter();
	const { user } = useAuthStore();
	const params = useParams();
	const departmentId = params.departmentId as string;

	const [department, setDepartment] = useState<Department | null>(initialDepartment);
	const [loading, setLoading] = useState(true);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showConfirmChangesModal, setShowConfirmChangesModal] = useState(false);

	const [formName, setFormName] = useState("");
	const [isFormChanged, setIsFormChanged] = useState(false);

	const [originalName, setOriginalName] = useState("");

	// Состояние для категорий отдела
	const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
	const [originalCategories, setOriginalCategories] = useState<number[]>([]);
	const [isCategoriesChanged, setIsCategoriesChanged] = useState(false);
	const [categories, setCategories] = useState<any[]>([]);
	const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);

	// Состояние для сотрудников отдела
	const [originalAdmins, setOriginalAdmins] = useState<User[]>([]);
	const [originalManagers, setOriginalManagers] = useState<User[]>([]);
	const [currentAdmins, setCurrentAdmins] = useState<User[]>([]);
	const [currentManagers, setCurrentManagers] = useState<User[]>([]);
	const [availableUsers, setAvailableUsers] = useState<User[]>([]);
	const [isStaffChanged, setIsStaffChanged] = useState(false);

	// Проверка, может ли пользователь редактировать этот отдел
	const canEditDepartment = () => {
		if (!user) return false;

		// Для существующего департамента проверяем права доступа
		if (!department) return false;

		// Суперадмин может редактировать любой отдел
		if (user.role === "superadmin") return true;

		// Админ может редактировать только свой отдел
		if (user.role === "admin" && user.department?.id === Number(departmentId)) {
			return true;
		}

		return false;
	};

	// Проверка, может ли пользователь удалить этот отдел
	const canDeleteDepartment = () => {
		if (!user) return false;
		return user.role === "superadmin";
	};

	// Функция для удаления отдела
	const handleDeleteDepartment = () => {
		setShowDeleteModal(true);
	};

	// Функция для подтверждения удаления
	const confirmDelete = async () => {
		if (!departmentId) return;

		try {
			const res = await fetch(`/api/departments/${departmentId}`, {
				method: "DELETE",
			});

			if (res.ok) {
				const result = await res.json();
				showSuccessToast("Отдел успешно удален");

				// Показываем дополнительную информацию о том, что было удалено
				if (result.deletedProducts > 0 || result.deletedUsers > 0) {
					setTimeout(() => {
						alert(`Дополнительная информация:\nУдалено товаров: ${result.deletedProducts}\nПользователей освобождено от отдела: ${result.deletedUsers}`);
					}, 1000);
				}

				router.push("/admin/departments");
			} else {
				const error = await res.json();
				showErrorToast(`Ошибка: ${error.error}`);
			}
		} catch (error) {
			console.error("Ошибка при удалении отдела:", error);
			showErrorToast("Произошла ошибка при удалении отдела");
		}
	};

	useEffect(() => {
		const fetchDepartment = async () => {
			if (!departmentId) {
				// В режиме создания инициализируем пустой департамент
				setDepartment({
					id: 0,
					name: "",
					allowedCategories: [],
					users: [],
					products: [],
					orders: [],
				});
				setFormName("");
				setOriginalName("");
				setUncategorizedCount(0);
				setLoading(false);
				return;
			}

			try {
				const res = await fetch(`/api/departments/${departmentId}`, {
					credentials: "include",
				});
				if (!res.ok) throw new Error("Не удалось загрузить отдел");
				const data = await res.json();
				setDepartment(data);
				setFormName(data.name);
				setOriginalName(data.name);

				// Обрабатываем категории из единого ответа
				if (data.categories) {
					// Получаем все доступные категории для отображения
					const allCategoriesRes = await fetch("/api/categories", {
						credentials: "include",
					});
					if (allCategoriesRes.ok) {
						const allCategories = await allCategoriesRes.json();

						// Создаем массив всех категорий с флагом isAllowed
						const categoriesWithFlags = allCategories.map((cat: any) => ({
							...cat,
							isAllowed: data.categories.some((allowedCat: any) => allowedCat.id === cat.id),
							productCount: data.categories.find((allowedCat: any) => allowedCat.id === cat.id)?.productCount || 0,
						}));

						setCategories(categoriesWithFlags);
						setUncategorizedCount(data.uncategorizedCount || 0);
					}
				}

				// Обрабатываем сотрудников из единого ответа
				if (data.users) {
					const allUsers = data.users || [];
					const adminsList = allUsers.filter((user: any) => user.role === "admin");
					const managersList = allUsers.filter((user: any) => user.role === "manager");

					setOriginalAdmins(adminsList);
					setOriginalManagers(managersList);
					setCurrentAdmins(adminsList);
					setCurrentManagers(managersList);
				}
			} catch (err) {
				console.error("Ошибка загрузки отдела:", err);
				showErrorToast("Ошибка загрузки данных отдела");
			} finally {
				setLoading(false);
			}
		};

		fetchDepartment();
		loadAvailableUsers();
	}, [departmentId]);

	const isDirty = formName !== originalName;

	// Отслеживаем изменения в форме
	useEffect(() => {
		setIsFormChanged(isDirty);
	}, [isDirty, formName, originalName]);

	// Синхронизируем selectedCategories при изменении categories
	useEffect(() => {
		if (categories.length > 0) {
			const allowedIds = categories.filter((cat: any) => cat.isAllowed).map((cat: any) => cat.id);
			setSelectedCategories(allowedIds);
			setOriginalCategories(allowedIds);
		}
	}, [categories]);

	// Отслеживаем изменения в категориях
	useEffect(() => {
		const hasChanges = JSON.stringify(selectedCategories.sort()) !== JSON.stringify(originalCategories.sort());
		setIsCategoriesChanged(hasChanges);
	}, [selectedCategories, originalCategories]);

	// Отслеживаем изменения в сотрудниках
	useEffect(() => {
		const realChanges = hasStaffChanges();
		setIsStaffChanged(realChanges);
	}, [currentAdmins, currentManagers, originalAdmins, originalManagers]);

	// Обработчик изменения выбранных категорий
	const handleSelectedCategoriesChange = (categories: number[]) => {
		setSelectedCategories(categories);
	};

	// Функции для вычисления изменений сотрудников
	const getStaffChanges = () => {
		const addUsers: { userId: number; role: "admin" | "manager" }[] = [];
		const removeUsers: number[] = [];

		// Находим добавленных администраторов
		currentAdmins.forEach((admin) => {
			if (!originalAdmins.find((orig) => orig.id === admin.id)) {
				addUsers.push({ userId: admin.id, role: "admin" });
			}
		});

		// Находим добавленных менеджеров
		currentManagers.forEach((manager) => {
			if (!originalManagers.find((orig) => orig.id === manager.id)) {
				addUsers.push({ userId: manager.id, role: "manager" });
			}
		});

		// Находим удаленных администраторов
		originalAdmins.forEach((admin) => {
			if (!currentAdmins.find((curr) => curr.id === admin.id)) {
				removeUsers.push(admin.id);
			}
		});

		// Находим удаленных менеджеров
		originalManagers.forEach((manager) => {
			if (!currentManagers.find((curr) => curr.id === manager.id)) {
				removeUsers.push(manager.id);
			}
		});

		return { addUsers, removeUsers };
	};

	// Функция для проверки, есть ли реальные изменения в сотрудниках
	const hasStaffChanges = () => {
		const { addUsers, removeUsers } = getStaffChanges();
		return addUsers.length > 0 || removeUsers.length > 0;
	};

	// Обработчики изменений сотрудников
	const handleStaffChange = (changed: boolean) => {
		// Проверяем реальные изменения вместо просто флага
		const realChanges = hasStaffChanges();
		setIsStaffChanged(realChanges);
	};

	// Загрузка доступных пользователей
	const loadAvailableUsers = async () => {
		try {
			// Получаем пользователей без отдела (только менеджеры и админы)
			const res = await fetch("/api/users?withoutDepartment=true&role=admin&role=manager", {
				credentials: "include",
			});

			if (res.ok) {
				const data = await res.json();
				// API уже фильтрует по ролям, но дополнительно проверяем что у пользователей нет отдела
				const staffUsers = data.users?.filter((user: User) => !user.department) || [];
				setAvailableUsers(staffUsers);
			}
		} catch (error) {
			console.error("Ошибка загрузки доступных пользователей:", error);
		}
	};

	// Функция для сохранения всех изменений отдела
	// Обрабатывает изменения названия, категорий и сотрудников одним запросом к API
	// После успешного сохранения обновляет все локальные состояния актуальными данными
	const handleSave = async () => {
		if (!formName.trim()) {
			showErrorToast("Введите название отдела");
			return;
		}

		try {
			// Подготавливаем данные для отправки
			const requestBody: any = {
				name: formName,
				categoryIds: selectedCategories,
			};

			// Добавляем изменения сотрудников, если они есть
			const { addUsers, removeUsers } = getStaffChanges();
			if (addUsers.length > 0 || removeUsers.length > 0) {
				requestBody.addUsers = addUsers;
				requestBody.removeUsers = removeUsers;
			}

			// Отправляем все изменения одним запросом
			const method = "PATCH";
			const url = `/api/departments/${departmentId}`;

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
				credentials: "include",
			});

			if (res.ok) {
				const updated = await res.json();
				setDepartment(updated);
				setOriginalName(formName);
				setOriginalCategories(selectedCategories);

				// Обновляем оригинальные списки сотрудников
				setOriginalAdmins(currentAdmins);
				setOriginalManagers(currentManagers);

				// Обновляем состояние категорий после сохранения
				if (updated.categories) {
					// Получаем все доступные категории для отображения
					const allCategoriesRes = await fetch("/api/categories", {
						credentials: "include",
					});
					if (allCategoriesRes.ok) {
						const allCategories = await allCategoriesRes.json();

						// Создаем массив всех категорий с флагом isAllowed
						const categoriesWithFlags = allCategories.map((cat: any) => ({
							...cat,
							isAllowed: updated.categories.some((allowedCat: any) => allowedCat.id === cat.id),
							productCount: updated.categories.find((allowedCat: any) => allowedCat.id === cat.id)?.productCount || 0,
						}));

						setCategories(categoriesWithFlags);
						setUncategorizedCount(updated.uncategorizedCount || 0);
					}
				}

				// Сбрасываем флаги изменений
				setIsFormChanged(false);
				setIsCategoriesChanged(false);
				setIsStaffChanged(false);

				showSuccessToast("Изменения сохранены");
			} else {
				const { error } = await res.json();
				showErrorToast(error || "Ошибка при сохранении изменений");
				return;
			}
		} catch (err) {
			console.error(err);
			showErrorToast("Ошибка запроса при сохранении изменений");
			return;
		}

		// Закрываем модальное окно
		setShowConfirmChangesModal(false);
	};

	// Проверяем общие изменения (название, категории или сотрудники)
	const hasAnyChanges = isFormChanged || isCategoriesChanged || isStaffChanged;

	// Функция для получения детального описания изменений
	const getChangesDescription = () => {
		const changes: ChangeItem[] = [];

		if (isFormChanged && originalName !== formName) {
			changes.push({
				type: "name" as const,
				title: "Изменение названия отдела",
				description: `Название отдела будет изменено с "${originalName}" на "${formName}"`,
			});
		}

		if (isCategoriesChanged) {
			const addedCategories = selectedCategories.filter((id) => !originalCategories.includes(id));
			const removedCategories = originalCategories.filter((id) => !selectedCategories.includes(id));

			if (addedCategories.length > 0) {
				const addedNames = categories.filter((cat) => addedCategories.includes(cat.id)).map((cat) => cat.title);
				changes.push({
					type: "categories_added" as const,
					title: "Добавление категорий",
					description: `В отдел добавятся следующие категории:`,
					items: addedNames,
				});
			}

			if (removedCategories.length > 0) {
				const removedNames = categories.filter((cat) => removedCategories.includes(cat.id)).map((cat) => cat.title);
				changes.push({
					type: "categories_removed" as const,
					title: "Удаление категорий",
					description: `Из отдела удалятся следующие категории:`,
					items: removedNames,
				});
			}
		}

		if (isStaffChanged) {
			const { addUsers, removeUsers } = getStaffChanges();
			if (addUsers.length > 0) {
				// Получаем имена добавляемых сотрудников
				const addUserNames = addUsers.map((addUser: { userId: number; role: "admin" | "manager" }) => {
					const user = availableUsers.find((u) => u.id === addUser.userId);
					return user
						? `${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""} ${user.role === "manager" ? "(Менеджер)" : "(Администратор)"}`
						: `Сотрудник ${addUser.userId}`;
				});

				changes.push({
					type: "staff_added" as const,
					title: "Добавление сотрудников",
					description: `В отдел добавятся следующие сотрудники:`,
					items: addUserNames,
				});
			}

			if (removeUsers.length > 0) {
				// Получаем имена удаляемых сотрудников
				const removeUserNames = removeUsers.map((userId: number) => {
					const admin = originalAdmins.find((a) => a.id === userId);
					const manager = originalManagers.find((m) => m.id === userId);
					const user = admin || manager;
					return user
						? `${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""} ${user.role === "manager" ? "(Менеджер)" : "(Администратор)"}`
						: `Сотрудник ${userId}`;
				});

				changes.push({
					type: "staff_removed" as const,
					title: "Удаление сотрудников",
					description: `Из отдела удалятся следующие сотрудники:`,
					items: removeUserNames,
				});
			}
		}

		return changes;
	};

	// Функция для показа модального окна подтверждения
	const handleSaveClick = () => {
		if (hasAnyChanges) {
			setShowConfirmChangesModal(true);
		}
	};

	return (
		<>
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						<Link href={`/admin/departments/${departmentId}`} className={`tabButton active`}>
							Управление отделом
						</Link>
						<Link href={`/admin/departments/${departmentId}/logs`} className={`tabButton`}>
							История изменений отдела
						</Link>
					</div>

					{loading ? (
						<div className="tableContent">
							<Loading />
						</div>
					) : (
						<>
							<div className="tableContent">
								{/* Показываем предупреждение если пользователь не может редактировать отдел */}
								{!canEditDepartment() && user && (
									<div
										style={{
											backgroundColor: "#fef3c7",
											border: "1px solid #f59e0b",
											borderRadius: "8px",
											padding: "12px 16px",
											marginBottom: "16px",
											color: "#92400e",
											fontSize: "14px",
										}}
									>
										⚠️ У вас нет прав на редактирование этого отдела. Вы можете только просматривать информацию.
									</div>
								)}

								<div className={`${styles.titleRow}`}>
									<input
										type="text"
										value={formName}
										onChange={(e) => setFormName(e.target.value)}
										className="formInput"
										placeholder="Введите название отдела"
										disabled={!canEditDepartment()}
									/>
									{canDeleteDepartment() && departmentId && (
										<button onClick={handleDeleteDepartment} className={styles.deleteDepartmentButton} title="Удалить отдел">
											<Trash2 size={18} />
											Удалить отдел
										</button>
									)}
								</div>

								<div className={`sectionsContent ${styles.sectionsContent}`}>
									<DepartmentCategorySection
										departmentId={departmentId ? Number(departmentId) : undefined}
										onFormChange={setIsFormChanged}
										onSave={handleSave}
										selectedCategories={selectedCategories}
										onSelectedCategoriesChange={handleSelectedCategoriesChange}
										categories={categories}
										uncategorizedCount={uncategorizedCount}
										canEdit={canEditDepartment()}
									/>

									{/* Показываем секцию сотрудников */}
									<DepartmentStaffSection
										departmentId={departmentId ? Number(departmentId) : undefined}
										onFormChange={handleStaffChange}
										currentAdmins={currentAdmins}
										currentManagers={currentManagers}
										availableUsers={availableUsers}
										setCurrentAdmins={setCurrentAdmins}
										setCurrentManagers={setCurrentManagers}
										setAvailableUsers={setAvailableUsers}
										canEdit={canEditDepartment()}
									/>
								</div>
							</div>

							{canEditDepartment() && hasAnyChanges && (
								<div className="fixedButtonsBlock">
									<div className="buttonsContent">
										<button onClick={handleSaveClick} disabled={!hasAnyChanges} className={`acceptButton ${!hasAnyChanges ? "disabled" : ""}`}>
											<Check className="" />
											Сохранить
										</button>

										{hasAnyChanges && (
											<button
												onClick={() => {
													setFormName(originalName);
													setSelectedCategories(originalCategories);
													setCurrentAdmins(originalAdmins);
													setCurrentManagers(originalManagers);
													setIsFormChanged(false);
													setIsCategoriesChanged(false);
													setIsStaffChanged(false);

													// Восстанавливаем список доступных пользователей
													// Находим пользователей, которые были добавлены после загрузки
													const addedUserIds = [...currentAdmins.map((admin) => admin.id), ...currentManagers.map((manager) => manager.id)].filter(
														(id) => !originalAdmins.find((admin) => admin.id === id) && !originalManagers.find((manager) => manager.id === id)
													);

													// Добавляем их обратно в availableUsers
													const usersToRestore = [
														...currentAdmins.filter((admin) => addedUserIds.includes(admin.id)),
														...currentManagers.filter((manager) => addedUserIds.includes(manager.id)),
													];

													// Удаляем пользователей, которые были удалены после загрузки
													const removedUserIds = [...originalAdmins.map((admin) => admin.id), ...originalManagers.map((manager) => manager.id)].filter(
														(id) => !currentAdmins.find((admin) => admin.id === id) && !currentManagers.find((manager) => manager.id === id)
													);

													// Удаляем их из availableUsers
													const updatedAvailableUsers = availableUsers.filter((user) => !removedUserIds.includes(user.id)).concat(usersToRestore);

													setAvailableUsers(updatedAvailableUsers);
												}}
												className="cancelButton"
											>
												<X className="" />
												Отменить
											</button>
										)}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Модальное окно подтверждения изменений */}
			<ConfirmPopup
				open={showConfirmChangesModal}
				onCancel={() => setShowConfirmChangesModal(false)}
				onConfirm={handleSave}
				title="Подтверждение изменений"
				confirmText="Сохранить изменения"
				cancelText="Отмена"
			>
				<div>
					<p style={{ marginBottom: "16px", color: "#6b7280", fontSize: "14px" }}>
						Вы собираетесь сохранить следующие изменения в отделе <strong>"{department?.name}"</strong>:
					</p>
					<ChangesDisplay changes={getChangesDescription()} />
				</div>
			</ConfirmPopup>

			{/* Модальное окно подтверждения удаления */}
			<ConfirmPopup
				open={showDeleteModal}
				onCancel={() => setShowDeleteModal(false)}
				onConfirm={confirmDelete}
				title="Подтверждение удаления"
				message={`Вы действительно хотите удалить отдел "${department?.name}"?\n\n⚠️ Это действие нельзя отменить. При удалении отдела:\n• Все товары в этом отделе будут удалены\n• У пользователей будет убран отдел (они останутся в системе)\n• Все связи с категориями будут удалены`}
				confirmText="Удалить"
				cancelText="Отмена"
			/>
		</>
	);
}
