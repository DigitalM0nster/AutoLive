"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import styles from "../styles.module.scss";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import UserSelectionPopup from "./UserSelectionPopup";
import { User } from "@/lib/types";

interface DepartmentStaffSectionProps {
	departmentId?: number;
	onFormChange?: (changed: boolean) => void;
	currentAdmins?: User[];
	currentManagers?: User[];
	availableUsers?: User[];
	setCurrentAdmins?: (admins: User[]) => void;
	setCurrentManagers?: (managers: User[]) => void;
	setAvailableUsers?: (users: User[]) => void;
	// Добавляем пропс для проверки прав на редактирование
	canEdit?: boolean;
}

export default function DepartmentStaffSection({
	departmentId,
	onFormChange,
	currentAdmins = [],
	currentManagers = [],
	availableUsers = [],
	setCurrentAdmins,
	setCurrentManagers,
	setAvailableUsers,
	canEdit = true,
}: DepartmentStaffSectionProps) {
	const { user } = useAuthStore();
	const [loading, setLoading] = useState(false);

	// Состояния для модальных окон
	const [showAdminPopup, setShowAdminPopup] = useState(false);
	const [showManagerPopup, setShowManagerPopup] = useState(false);
	const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

	// Добавление пользователей в отдел (накапливаем изменения)
	const addUsersToDepartment = (userIds: number[], role: "admin" | "manager") => {
		// Если у пользователя нет прав на редактирование, не выполняем действие
		if (!canEdit) return;

		// Обновляем состояние в родительском компоненте
		const usersToAdd = availableUsers.filter((user) => userIds.includes(user.id));
		if (role === "admin") {
			const newAdmins = [...currentAdmins, ...usersToAdd];
			setCurrentAdmins?.(newAdmins);
		} else {
			const newManagers = [...currentManagers, ...usersToAdd];
			setCurrentManagers?.(newManagers);
		}

		// Удаляем добавленных пользователей из списка доступных
		const updatedAvailableUsers = availableUsers.filter((user) => !userIds.includes(user.id));
		// Обновляем список доступных пользователей в родительском компоненте
		// Для этого нужно добавить setAvailableUsers в props
		if (setAvailableUsers) {
			setAvailableUsers(updatedAvailableUsers);
		}

		// Уведомляем родительский компонент об изменениях
		onFormChange?.(true);
	};

	// Удаление пользователя из отдела (накапливаем изменения)
	const removeUserFromDepartment = (userId: number) => {
		// Если у пользователя нет прав на редактирование, не выполняем действие
		if (!canEdit) return;

		// Находим удаляемого пользователя
		const removedUser = currentAdmins.find((admin) => admin.id === userId) || currentManagers.find((manager) => manager.id === userId);

		// Обновляем состояние в родительском компоненте
		const newAdmins = currentAdmins.filter((admin) => admin.id !== userId);
		const newManagers = currentManagers.filter((manager) => manager.id !== userId);

		setCurrentAdmins?.(newAdmins);
		setCurrentManagers?.(newManagers);

		// Добавляем удаленного пользователя обратно в список доступных
		if (removedUser && setAvailableUsers) {
			setAvailableUsers([...availableUsers, removedUser]);
		}

		// Уведомляем родительский компонент об изменениях
		onFormChange?.(true);
	};

	// Обработчики для модальных окон
	const handleAddAdmins = () => {
		setSelectedUsers([]);
		setShowAdminPopup(true);
	};

	const handleAddManagers = () => {
		setSelectedUsers([]);
		setShowManagerPopup(true);
	};

	const handleSaveAdmins = () => {
		if (selectedUsers.length > 0) {
			addUsersToDepartment(selectedUsers, "admin");
		}
		setShowAdminPopup(false);
	};

	const handleSaveManagers = () => {
		if (selectedUsers.length > 0) {
			addUsersToDepartment(selectedUsers, "manager");
		}
		setShowManagerPopup(false);
	};

	// Функция для форматирования телефона в формат +7 (ххх) ххх-хх-хх
	const formatPhoneNumber = (phone: string): string => {
		// Убираем все нецифровые символы
		const digits = phone.replace(/\D/g, "");

		// Проверяем, что номер содержит 10 цифр (без кода страны)
		if (digits.length === 10) {
			// Форматируем: +7 (ччч) ччч-чч-чч
			return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
		}

		// Если номер не соответствует формату, возвращаем как есть
		return phone;
	};

	return (
		<div className={`block sectionBlock ${styles.sectionBlock}`}>
			<div className={`blockHeader ${styles.blockHeader}`}>
				<h2 className={`sectionTitle`}>
					<Users className={`${styles.icon} ${styles.usersIcon}`} />
					Сотрудники отдела
				</h2>
			</div>

			{loading ? (
				<div className="loadingBlock">Загрузка сотрудников...</div>
			) : (
				<div className={`columnList`}>
					{/* Секция администраторов */}
					<div className={`borderBlock staffBlock`}>
						<div className={`borderBlockHeader`}>
							<h3>Администраторы ({currentAdmins.length})</h3>
						</div>
						<div className="staffList">
							{currentAdmins.length > 0 ? (
								currentAdmins.map((admin) => (
									<div key={admin.id} className="userItem">
										<div className="userInfo">
											<span className="userName">
												<strong>
													{admin.last_name} {admin.first_name} {admin.middle_name}
												</strong>
												<span className="userPhone">{formatPhoneNumber(admin.phone)}</span>
											</span>
											<Link href={`/admin/users/${admin.id}`} className="userLink" target="_blank">
												Перейти в профиль <img src="/images/linkIcon.svg" alt="переход в профиль" />
											</Link>
										</div>
										{canEdit && (
											<button onClick={() => removeUserFromDepartment(admin.id)} className="button removeButton" title="Удалить из отдела">
												<Trash2 size={14} />
												Удалить
											</button>
										)}
									</div>
								))
							) : (
								<p className="emptyItem">Нет администраторов в отделе</p>
							)}
							{canEdit && (
								<div onClick={handleAddAdmins} className="button addButton">
									<UserPlus size={16} />
									Добавить
								</div>
							)}
						</div>
					</div>

					{/* Секция менеджеров */}
					<div className={`borderBlock staffBlock`}>
						<div className={`borderBlockHeader`}>
							<h3>Менеджеры ({currentManagers.length})</h3>
						</div>
						<div className="staffList">
							{currentManagers.length > 0 ? (
								currentManagers.map((manager) => (
									<div key={manager.id} className="userItem">
										<div className="userInfo">
											<span className="userName">
												<strong>
													{manager.last_name} {manager.first_name} {manager.middle_name}
												</strong>
												<span className="userPhone">{formatPhoneNumber(manager.phone)}</span>
											</span>
											<Link href={`/admin/users/${manager.id}`} className="userLink" target="_blank">
												Перейти в профиль <img src="/images/linkIcon.svg" alt="переход в профиль" />
											</Link>
										</div>
										{canEdit && (
											<button onClick={() => removeUserFromDepartment(manager.id)} className="button removeButton" title="Удалить из отдела">
												<Trash2 size={14} />
												Удалить
											</button>
										)}
									</div>
								))
							) : (
								<p className="emptyItem">Нет менеджеров в отделе</p>
							)}
							{canEdit && (
								<div onClick={handleAddManagers} className="button addButton">
									<UserPlus size={16} />
									Добавить
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Модальное окно выбора администраторов */}
			<UserSelectionPopup
				isOpen={showAdminPopup}
				onClose={() => setShowAdminPopup(false)}
				availableUsers={availableUsers}
				occupiedUsers={[]}
				selectedUsers={selectedUsers}
				setSelectedUsers={setSelectedUsers}
				onSave={handleSaveAdmins}
				title="Добавление администраторов"
				roleFilter="admin"
				currentDepartmentId={departmentId}
				currentAdmins={currentAdmins}
				currentManagers={currentManagers}
			/>

			{/* Модальное окно выбора менеджеров */}
			<UserSelectionPopup
				isOpen={showManagerPopup}
				onClose={() => setShowManagerPopup(false)}
				availableUsers={availableUsers}
				occupiedUsers={[]}
				selectedUsers={selectedUsers}
				setSelectedUsers={setSelectedUsers}
				onSave={handleSaveManagers}
				title="Добавление менеджеров"
				roleFilter="manager"
				currentDepartmentId={departmentId}
				currentAdmins={currentAdmins}
				currentManagers={currentManagers}
			/>
		</div>
	);
}
