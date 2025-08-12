import { Check, X } from "lucide-react";
import styles from "./styles.module.scss";
import { User } from "@/lib/types";
import Link from "next/link";

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
	currentAdmins?: User[]; // Добавляем текущих администраторов
	currentManagers?: User[]; // Добавляем текущих менеджеров
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
	currentAdmins = [],
	currentManagers = [],
}: UserPopupProps) {
	if (!isOpen) return null;

	// Получаем ID всех сотрудников, которые уже в отделе
	const currentDepartmentUserIds = [...currentAdmins, ...currentManagers].map((user) => user.id);

	// Фильтруем пользователей: исключаем уже добавленных в отдел и фильтруем по роли
	const filteredAvailableUsers = availableUsers
		.filter((user) => !currentDepartmentUserIds.includes(user.id)) // Исключаем уже добавленных
		.filter((user) => (roleFilter ? user.role === roleFilter : true)); // Фильтруем по роли

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
		<div className={`popup ${styles.popup}`}>
			<div className="background" />
			<div className={`contentBlock `}>
				<div className={`popupHeader`}>
					<h2 className={`title `}>{title}</h2>
				</div>
				<div className={`popupBody`}>
					<div className={`columnList usersBlock`}>
						<div className={styles.columnItem}>
							{filteredAvailableUsers.length > 0 ? (
								<div className={`staffList`}>
									{filteredAvailableUsers.map((user) => (
										<div
											key={user.id}
											className={`userItem clickable ${selectedUsers.includes(user.id) ? "selected" : ""}`}
											onClick={() => toggleUser(user.id)}
										>
											<div className={`userInfo`}>
												<span className="userName">
													<strong>
														{user.last_name} {user.first_name} {user.middle_name}
													</strong>
													<span className="userPhone">{formatPhoneNumber(user.phone)}</span>
												</span>
												<Link href={`/admin/users/${user.id}`} className="userLink" target="_blank" onClick={(e) => e.stopPropagation()}>
													Перейти в профиль
													<img src="/images/linkIcon.svg" alt="переход в профиль" />
												</Link>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className={`emptyItem`}>Нет доступных сотрудников</p>
							)}
						</div>
					</div>
				</div>
				<div className={`popupFooter`}>
					<div className="buttonsBlock">
						<button onClick={onClose} className={`cancelButton redBorder`}>
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
