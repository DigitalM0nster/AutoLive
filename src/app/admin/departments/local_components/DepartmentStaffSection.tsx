"use client";

import { useState } from "react";
import { Users, UserPlus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import styles from "./styles.module.scss";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { useAuthStore } from "@/store/authStore";
import UserSelectionPopup from "./UserSelectionPopup";
import { User } from "@/lib/types";

export default function DepartmentStaffSection({ users, isEditable }: { users?: User[]; isEditable?: boolean }) {
	const { user: currentUser } = useAuthStore();
	const [departmentUsers, setDepartmentUsers] = useState<User[]>(users || []);
	const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
	const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
	const [availableUsers, setAvailableUsers] = useState<User[]>([]);
	const [occupiedUsers, setOccupiedUsers] = useState<User[]>([]);
	const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
	const [loading, setLoading] = useState(false);
	const [currentDepartmentId, setCurrentDepartmentId] = useState<number | undefined>(undefined);

	const admins = departmentUsers.filter((u) => u.role === "admin");
	const managers = departmentUsers.filter((u) => u.role === "manager");

	// Проверяем права на управление отделом с учетом параметра isEditable
	const canManageDepartment = isEditable !== false && (currentUser?.role === "superadmin" || currentUser?.role === "admin");
	const canAddAdmins = isEditable !== false && currentUser?.role === "superadmin"; // Только суперадмин может добавлять администраторов
	const canAddManagers = isEditable !== false && (currentUser?.role === "superadmin" || currentUser?.role === "admin"); // Суперадмин и админ могут добавлять менеджеров

	const openModal = async (role: string) => {
		if (!canManageDepartment) return;

		setLoading(true);
		try {
			// Получаем данные о доступных пользователях из API
			const departmentId = window.location.pathname.split("/").pop();
			const departmentIdNumber = departmentId ? parseInt(departmentId) : undefined;
			setCurrentDepartmentId(departmentIdNumber);

			const res = await fetch(`/api/departments/${departmentId}/users`, {
				credentials: "include",
			});

			if (!res.ok) throw new Error("Не удалось загрузить данные");

			const data = await res.json();
			setAvailableUsers(data.availableUsers || []);
			setOccupiedUsers(data.occupiedUsers || []);
			setSelectedUsers([]);

			if (role === "admin") {
				setIsAdminModalOpen(true);
			} else {
				setIsManagerModalOpen(true);
			}
		} catch (err) {
			console.error("Ошибка загрузки пользователей:", err);
			showErrorToast("Ошибка загрузки данных");
		} finally {
			setLoading(false);
		}
	};

	const handleSaveUsers = async () => {
		if (selectedUsers.length === 0) return;

		setLoading(true);
		try {
			const departmentId = window.location.pathname.split("/").pop();
			const res = await fetch(`/api/departments/${departmentId}/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userIds: selectedUsers }),
				credentials: "include",
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Не удалось добавить сотрудников");
			}

			const data = await res.json();
			setDepartmentUsers(data.users);
			setIsAdminModalOpen(false);
			setIsManagerModalOpen(false);
			showSuccessToast("Сотрудники успешно добавлены");
		} catch (err) {
			console.error("Ошибка добавления сотрудников:", err);
			showErrorToast(err instanceof Error ? err.message : "Ошибка добавления сотрудников");
		} finally {
			setLoading(false);
		}
	};

	const handleRemoveUser = async (userId: number) => {
		if (!confirm("Вы уверены, что хотите удалить сотрудника из отдела?")) return;

		setLoading(true);
		try {
			const departmentId = window.location.pathname.split("/").pop();
			const res = await fetch(`/api/departments/${departmentId}/users`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
				credentials: "include",
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Не удалось удалить сотрудника");
			}

			setDepartmentUsers(departmentUsers.filter((u) => u.id !== userId));
			showSuccessToast("Сотрудник удален из отдела");
		} catch (err) {
			console.error("Ошибка удаления сотрудника:", err);
			showErrorToast(err instanceof Error ? err.message : "Ошибка удаления сотрудника");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={`block sectionBlock ${styles.sectionBlock}`}>
			<div className={`blockHeader ${styles.blockHeader}`}>
				<h2 className={`blockTitle ${styles.blockTitle}`}>
					<Users className={`${styles.icon} ${styles.usersIcon}`} />
					Сотрудники отдела
				</h2>
			</div>

			<div className={`columnList ${styles.columnList}`}>
				<div className={`borderBlock staffBlock ${styles.borderBlock} ${styles.staffBlock}`}>
					<div className={`borderBlockHeader ${styles.borderBlockHeader}`}>
						<h3>Администраторы</h3>
					</div>
					<div className={`columnList ${styles.columnList}`}>
						{admins.length > 0 ? (
							admins.map((admin) => (
								<div key={admin.id} className={`staffItem listItem ${styles.staffItem}`}>
									<Link href={`/admin/users/${admin.id}`}>
										{admin.first_name} {admin.last_name}
										<span>({admin.phone})</span>
									</Link>
									{canAddAdmins && (
										<button onClick={() => handleRemoveUser(admin.id)} className={`removeButton ${styles.removeButton}`} title="Удалить из отдела">
											<Trash2 size={16} />
										</button>
									)}
								</div>
							))
						) : (
							<p className={`emptyItem ${styles.emptyItem}`}>Нет администраторов</p>
						)}
						{canAddAdmins && (
							<button onClick={() => openModal("admin")} disabled={loading} className={`addButton ${styles.addButton}`}>
								<UserPlus className={styles.addIcon} />
								Добавить администратора
							</button>
						)}
					</div>
				</div>

				<div className={`borderBlock staffBlock ${styles.borderBlock} ${styles.staffBlock}`}>
					<div className={`borderBlockHeader ${styles.borderBlockHeader}`}>
						<h3>Менеджеры</h3>
					</div>
					<div className={`columnList ${styles.columnList}`}>
						{managers.length > 0 ? (
							managers.map((manager) => (
								<div key={manager.id} className={`listItem ${styles.listItem}`}>
									<Link href={`/admin/users/${manager.id}`}>
										{manager.first_name} {manager.last_name}
										<span>({manager.phone})</span>
									</Link>
									{canAddManagers && (
										<button onClick={() => handleRemoveUser(manager.id)} className={`removeButton ${styles.removeButton}`} title="Удалить из отдела">
											<Trash2 size={16} />
										</button>
									)}
								</div>
							))
						) : (
							<p className={`emptyItem ${styles.emptyItem}`}>Нет менеджеров</p>
						)}
						{canAddManagers && (
							<button onClick={() => openModal("manager")} disabled={loading} className={`addButton ${styles.addButton}`}>
								<UserPlus className={styles.addIcon} />
								Добавить менеджера
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Модальное окно выбора администраторов */}
			<UserSelectionPopup
				isOpen={isAdminModalOpen}
				onClose={() => setIsAdminModalOpen(false)}
				availableUsers={availableUsers}
				occupiedUsers={occupiedUsers}
				selectedUsers={selectedUsers}
				setSelectedUsers={setSelectedUsers}
				onSave={handleSaveUsers}
				title="Добавление администраторов"
				roleFilter="admin"
				currentDepartmentId={currentDepartmentId}
			/>

			{/* Модальное окно выбора менеджеров */}
			<UserSelectionPopup
				isOpen={isManagerModalOpen}
				onClose={() => setIsManagerModalOpen(false)}
				availableUsers={availableUsers}
				occupiedUsers={occupiedUsers}
				selectedUsers={selectedUsers}
				setSelectedUsers={setSelectedUsers}
				onSave={handleSaveUsers}
				title="Добавление менеджеров"
				roleFilter="manager"
				currentDepartmentId={currentDepartmentId}
			/>
		</div>
	);
}
