"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import styles from "./styles.module.scss";
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

	return (
		<div className={`block sectionBlock ${styles.sectionBlock}`}>
			<div className={`blockHeader ${styles.blockHeader}`}>
				<h2 className={`blockTitle ${styles.blockTitle}`}>
					<Users className={`${styles.icon} ${styles.usersIcon}`} />
					Сотрудники отдела
				</h2>
			</div>

			{loading ? (
				<div className="loadingBlock">Загрузка сотрудников...</div>
			) : (
				<div className={`columnList ${styles.columnList}`}>
					{/* Секция администраторов */}
					<div className={`borderBlock staffBlock ${styles.borderBlock} ${styles.staffBlock}`}>
						<div className={`borderBlockHeader ${styles.borderBlockHeader}`}>
							<h3>Администраторы ({currentAdmins.length})</h3>
							{canEdit && (
								<button onClick={handleAddAdmins} className="addButton" title="Добавить администратора">
									<UserPlus size={16} />
									Добавить
								</button>
							)}
						</div>
						<div className="usersList">
							{currentAdmins.length > 0 ? (
								currentAdmins.map((admin) => (
									<div key={admin.id} className="userItem">
										<div className="userInfo">
											<span className="userName">
												{admin.first_name} {admin.last_name}
											</span>
											<span className="userPhone">{admin.phone}</span>
										</div>
										<div className="userActions">
											<Link href={`/admin/users/${admin.id}`} className="userLink" target="_blank">
												Профиль
											</Link>
											{canEdit && (
												<button onClick={() => removeUserFromDepartment(admin.id)} className="removeButton" title="Удалить из отдела">
													<Trash2 size={14} />
												</button>
											)}
										</div>
									</div>
								))
							) : (
								<p className="emptyItem">Нет администраторов в отделе</p>
							)}
						</div>
					</div>

					{/* Секция менеджеров */}
					<div className={`borderBlock staffBlock ${styles.borderBlock} ${styles.staffBlock}`}>
						<div className={`borderBlockHeader ${styles.borderBlockHeader}`}>
							<h3>Менеджеры ({currentManagers.length})</h3>
							{canEdit && (
								<button onClick={handleAddManagers} className="addButton" title="Добавить менеджера">
									<UserPlus size={16} />
									Добавить
								</button>
							)}
						</div>
						<div className="usersList">
							{currentManagers.length > 0 ? (
								currentManagers.map((manager) => (
									<div key={manager.id} className="userItem">
										<div className="userInfo">
											<span className="userName">
												{manager.last_name} {manager.first_name} {manager.middle_name}
											</span>
											<span className="userPhone">{manager.phone}</span>
										</div>
										<div className="userActions">
											<Link href={`/admin/users/${manager.id}`} className="userLink" target="_blank">
												Профиль
											</Link>
											{canEdit && (
												<button onClick={() => removeUserFromDepartment(manager.id)} className="removeButton" title="Удалить из отдела">
													<Trash2 size={14} />
												</button>
											)}
										</div>
									</div>
								))
							) : (
								<p className="emptyItem">Нет менеджеров в отделе</p>
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
				title="Добавить администраторов"
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
				title="Добавить менеджеров"
				roleFilter="manager"
				currentDepartmentId={departmentId}
				currentAdmins={currentAdmins}
				currentManagers={currentManagers}
			/>
		</div>
	);
}
