"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import DepartmentCategorySection from "./DepartmentCategorySection";
import DepartmentStaffSection from "./DepartmentStaffSection";
import { Category, Department, User, Product } from "@/lib/types";
import { Check, X, Trash2 } from "lucide-react";
import styles from "./styles.module.scss";
import Link from "next/link";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import ChangesDisplay, { ChangeItem } from "./ChangesDisplay";

interface DepartmentPageClientProps {
	initialData?: {
		department: Department;
		categories: Category[];
		departmentCategories: Category[];
		availableUsers: User[];
	};
	isCreateMode?: boolean;
}

export default function DepartmentPageClient({ initialData, isCreateMode = false }: DepartmentPageClientProps) {
	const router = useRouter();
	const { user } = useAuthStore();

	// Если это режим создания, используем пустые значения
	const defaultDepartment: Department = {
		id: 0,
		name: "",
		allowedCategories: [],
		users: [],
		products: [],
		orders: [],
	};

	const [department, setDepartment] = useState<Department | null>(isCreateMode ? defaultDepartment : initialData?.department || null);
	const [loading, setLoading] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showConfirmChangesModal, setShowConfirmChangesModal] = useState(false);

	const [formName, setFormName] = useState(isCreateMode ? "" : initialData?.department?.name || "");
	const [isFormChanged, setIsFormChanged] = useState(false);

	const [originalName, setOriginalName] = useState(isCreateMode ? "" : initialData?.department?.name || "");

	// Состояние для категорий отдела
	const [selectedCategories, setSelectedCategories] = useState<number[]>(isCreateMode ? [] : initialData?.departmentCategories?.map((cat) => cat.id) || []);
	const [originalCategories, setOriginalCategories] = useState<number[]>(isCreateMode ? [] : initialData?.departmentCategories?.map((cat) => cat.id) || []);
	const [isCategoriesChanged, setIsCategoriesChanged] = useState(false);
	const [isStaffChanged, setIsStaffChanged] = useState(false);
	const [categories, setCategories] = useState<any[]>(isCreateMode ? [] : initialData?.categories || []);
	const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);

	// Состояние для сотрудников отдела
	const [originalAdmins, setOriginalAdmins] = useState<User[]>(isCreateMode ? [] : initialData?.department?.users?.filter((u) => u.role === "admin") || []);
	const [originalManagers, setOriginalManagers] = useState<User[]>(isCreateMode ? [] : initialData?.department?.users?.filter((u) => u.role === "manager") || []);
	const [currentAdmins, setCurrentAdmins] = useState<User[]>(isCreateMode ? [] : initialData?.department?.users?.filter((u) => u.role === "admin") || []);
	const [currentManagers, setCurrentManagers] = useState<User[]>(isCreateMode ? [] : initialData?.department?.users?.filter((u) => u.role === "manager") || []);
	const [availableUsers, setAvailableUsers] = useState<User[]>(isCreateMode ? [] : initialData?.availableUsers || []);

	// Проверка, может ли пользователь редактировать этот отдел
	const canEditDepartment = () => {
		if (!user) return false;

		// В режиме создания проверяем права на создание
		if (isCreateMode) {
			return user.role === "superadmin" || user.role === "admin";
		}

		// Суперадмин может редактировать любой отдел
		if (user.role === "superadmin") return true;

		// Админ может редактировать только свой отдел
		if (user.role === "admin" && user.department?.id === department?.id) {
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
		if (!department?.id) return;

		try {
			const res = await fetch(`/api/departments/${department.id}`, {
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

	// Отслеживаем изменения в форме
	useEffect(() => {
		const isDirty = formName !== originalName;
		setIsFormChanged(isDirty);
	}, [formName, originalName]);

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

	// Загружаем данные для создания отдела
	useEffect(() => {
		if (isCreateMode) {
			const loadDataForCreation = async () => {
				try {
					// Загружаем все категории
					const categoriesRes = await fetch("/api/categories");
					if (categoriesRes.ok) {
						const categoriesData = await categoriesRes.json();
						setCategories(categoriesData);
					}

					// Загружаем доступных пользователей (без отдела)
					const usersRes = await fetch("/api/users?departmentId=null");
					if (usersRes.ok) {
						const usersData = await usersRes.json();
						setAvailableUsers(usersData.data || []);
					}
				} catch (error) {
					console.error("Ошибка загрузки данных для создания отдела:", error);
				}
			};

			loadDataForCreation();
		}
	}, [isCreateMode]);

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

	// Функция для сохранения всех изменений отдела
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

			let res;

			if (isCreateMode) {
				// Создание нового отдела
				res = await fetch(`/api/departments`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(requestBody),
					credentials: "include",
				});
			} else {
				// Обновление существующего отдела
				res = await fetch(`/api/departments/${department?.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(requestBody),
					credentials: "include",
				});
			}

			if (res.ok) {
				const updated = await res.json();

				if (isCreateMode) {
					// После создания перенаправляем на страницу отдела
					showSuccessToast("Отдел успешно создан");
					router.push(`/admin/departments/${updated.id}`);
					return;
				} else {
					// Обновление существующего отдела
					setDepartment(updated);
					setOriginalName(formName);
					setOriginalCategories(selectedCategories);

					// Обновляем оригинальные списки сотрудников
					setOriginalAdmins(currentAdmins);
					setOriginalManagers(currentManagers);

					// Сбрасываем флаги изменений
					setIsFormChanged(false);
					setIsCategoriesChanged(false);
					setIsStaffChanged(false);

					showSuccessToast("Изменения сохранены");
				}
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
	const hasAnyChanges = isCreateMode
		? formName.trim() !== "" || selectedCategories.length > 0 || currentAdmins.length > 0 || currentManagers.length > 0
		: isFormChanged || isCategoriesChanged || isStaffChanged;

	// Функция для получения детального описания изменений
	const getChangesDescription = () => {
		const changes: ChangeItem[] = [];

		if (isCreateMode) {
			// Для режима создания показываем что будет создано
			if (formName.trim() !== "") {
				changes.push({
					type: "name" as const,
					title: "Создание отдела",
					description: `Будет создан отдел с названием "${formName}"`,
				});
			}

			if (selectedCategories.length > 0) {
				const categoryNames = categories.filter((cat) => selectedCategories.includes(cat.id)).map((cat) => cat.title);
				changes.push({
					type: "categories_added" as const,
					title: "Категории отдела",
					description: `В отдел будут добавлены следующие категории:`,
					items: categoryNames,
				});
			}

			if (currentAdmins.length > 0 || currentManagers.length > 0) {
				const adminNames = currentAdmins.map((admin) => `${admin.last_name || ""} ${admin.first_name || ""} ${admin.middle_name || ""} (Администратор)`);
				const managerNames = currentManagers.map((manager) => `${manager.last_name || ""} ${manager.first_name || ""} ${manager.middle_name || ""} (Менеджер)`);

				if (adminNames.length > 0) {
					changes.push({
						type: "staff_added" as const,
						title: "Администраторы отдела",
						description: `В отдел будут добавлены следующие администраторы:`,
						items: adminNames,
					});
				}

				if (managerNames.length > 0) {
					changes.push({
						type: "staff_added" as const,
						title: "Менеджеры отдела",
						description: `В отдел будут добавлены следующие менеджеры:`,
						items: managerNames,
					});
				}
			}

			return changes;
		}

		// Для режима редактирования показываем изменения
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
						? `${user.last_name || ""} ${user.first_name || ""} ${user.middle_name || ""} ${addUser.role === "manager" ? "(Менеджер)" : "(Администратор)"}`
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

	if (!department) {
		return <div className="text-center">Отдел не найден</div>;
	}

	return (
		<>
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						{isCreateMode ? (
							<div className={`tabButton active`}>Создание нового отдела</div>
						) : (
							<>
								<Link href={`/admin/departments/${department.id}`} className={`tabButton active`}>
									Управление отделом
								</Link>
								<Link href={`/admin/departments/${department.id}/logs`} className={`tabButton`}>
									История изменений отдела
								</Link>
							</>
						)}
					</div>

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

						<div className={`titleBlock`}>
							<input
								type="text"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								className="formInput titleInput"
								placeholder="Введите название отдела"
								disabled={!canEditDepartment()}
							/>
							{canDeleteDepartment() && department.id && (
								<button onClick={handleDeleteDepartment} className={`button cancelButton`}>
									<Trash2 size={18} />
									Удалить отдел
								</button>
							)}
						</div>

						<div className={`sectionsContent ${styles.sectionsContent}`}>
							<DepartmentCategorySection
								departmentId={department.id}
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
								departmentId={department.id}
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
								<button onClick={handleSaveClick} className="acceptButton">
									<Check className="" />
									{isCreateMode ? "Создать отдел" : "Сохранить"}
								</button>

								{hasAnyChanges && (
									<button
										onClick={() => {
											if (isCreateMode) {
												// В режиме создания сбрасываем форму
												setFormName("");
												setSelectedCategories([]);
												setCurrentAdmins([]);
												setCurrentManagers([]);
											} else {
												// В режиме редактирования возвращаем к исходным значениям
												setFormName(originalName);
												setSelectedCategories(originalCategories);
												setCurrentAdmins(originalAdmins);
												setCurrentManagers(originalManagers);
												setIsFormChanged(false);
												setIsCategoriesChanged(false);
												setIsStaffChanged(false);
											}
										}}
										className="cancelButton"
									>
										<X className="" />
										{isCreateMode ? "Очистить" : "Отменить"}
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Модальное окно подтверждения изменений */}
			<ConfirmPopup
				open={showConfirmChangesModal}
				onCancel={() => setShowConfirmChangesModal(false)}
				onConfirm={handleSave}
				title={isCreateMode ? "Подтверждение создания отдела" : "Подтверждение изменений"}
				confirmText={isCreateMode ? "Создать отдел" : "Сохранить изменения"}
				cancelText="Отмена"
			>
				<div>
					<p>
						{isCreateMode
							? "Вы собираетесь создать новый отдел со следующими параметрами:"
							: `Вы собираетесь сохранить следующие изменения в отделе <strong>${department?.name}</strong>:`}
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
