import { Check, X } from "lucide-react";
import styles from "./styles.module.scss";
import { User } from "@/lib/types";

type UserPopupProps = {
	isOpen: boolean;
	onClose: () => void;
	availableUsers: User[];
	occupiedUsers: User[]; // Оставляем для совместимости, но не будем использовать
	selectedUsers: number[];
	setSelectedUsers: (ids: number[]) => void;
	onSave: () => void;
	title: string;
	roleFilter?: string;
	currentDepartmentId?: number;
};

export default function UserSelectionPopup({
	isOpen,
	onClose,
	availableUsers,
	occupiedUsers,
	selectedUsers,
	setSelectedUsers,
	onSave,
	title,
	roleFilter,
	currentDepartmentId,
}: UserPopupProps) {
	if (!isOpen) return null;

	// Фильтруем пользователей по роли, если указан фильтр
	const filteredAvailableUsers = roleFilter ? availableUsers.filter((user) => user.role === roleFilter) : availableUsers;

	const toggleUser = (userId: number, event?: React.MouseEvent) => {
		// Предотвращаем всплытие события, если оно передано
		if (event) {
			event.stopPropagation();
		}

		if (selectedUsers.includes(userId)) {
			setSelectedUsers(selectedUsers.filter((id) => id !== userId));
		} else {
			setSelectedUsers([...selectedUsers, userId]);
		}
	};

	// Функция для отображения названия роли
	const getRoleName = (role: string) => {
		return role === "admin" ? "Администратор" : "Менеджер";
	};

	return (
		<div className={`popup ${styles.popup}`}>
			<div className="background" />
			<div className={`contentBlock ${styles.contentBlock}`}>
				<div className={`popupHeader ${styles.popupHeader}`}>
					<h2 className={`title ${styles.title}`}>{title}</h2>
				</div>
				<div className={`popupBody ${styles.popupBody}`}>
					<div className={`columnList usersBlock ${styles.usersBlock} ${styles.columnList}`}>
						<div className={styles.columnItem}>
							{filteredAvailableUsers.length > 0 ? (
								<div className={`usersList ${styles.usersList}`}>
									{filteredAvailableUsers.map((user) => (
										<div
											key={user.id}
											className={`borderBlock userCard ${styles.userCard} ${selectedUsers.includes(user.id) ? styles.selected : ""}`}
											onClick={() => toggleUser(user.id)}
										>
											<div className={styles.userButton} onClick={(e) => toggleUser(user.id, e)}>
												<div className={styles.circle}></div>
											</div>
											<div className={`userInfo ${styles.userInfo}`}>
												<div className={styles.userTop}>
													<div className={`userRole ${styles.userRole}`}>{getRoleName(user.role)}</div>
												</div>
												<div className={styles.userBottom}>
													<div className={`userName ${styles.userName}`}>
														{user.first_name} {user.last_name}
													</div>
													<a
														className={`borderBlock ${styles.userLink} ${styles.borderBlock}`}
														href={`/admin/users/${user.id}`}
														target="_blank"
														onClick={(e) => e.stopPropagation()}
													>
														Перейти в профиль пользователя <img src="/images/linkIcon.svg" alt="переход в профиль" />
													</a>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className={`emptyItem ${styles.emptyItem}`}>Нет доступных сотрудников</p>
							)}
						</div>
					</div>
				</div>
				<div className={`popupFooter ${styles.popupFooter}`}>
					<div className="buttonsBlock">
						<button onClick={onClose} className={`cancelButton ${styles.removeButton} redBorder`}>
							Отмена
						</button>
						<button onClick={onSave} disabled={selectedUsers.length === 0} className={`${selectedUsers.length === 0 ? "disabled" : ""}`}>
							Добавить выбранных сотрудников
						</button>
					</div>
				</div>
				<div className="closeIcon" onClick={onClose}>
					<div className="line" />
					<div className="line" />
				</div>
			</div>
		</div>
	);
}
