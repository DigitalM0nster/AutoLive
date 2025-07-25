"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import Image from "next/image";
import styles from "./styles.module.scss";
import { User, Department } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import UsersLogs from "./UsersLogs";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";

type UserPageProps = {
	userId?: string | number; // Если не указан, значит создаем нового пользователя
	isCreating?: boolean;
};

export default function UserPage({ userId, isCreating = false }: UserPageProps) {
	const { user } = useAuthStore();
	const router = useRouter();
	const [userData, setUserData] = useState<User | null>(null);
	const [loading, setLoading] = useState(!isCreating); // Не показываем загрузку при создании
	const [error, setError] = useState<string | null>(null);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false); // Состояние для отслеживания изменений
	const [activeTab, setActiveTab] = useState<"profile" | "logs">("profile"); // Добавляем состояние для активной вкладки
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Состояние для подтверждения удаления
	const [isDeleting, setIsDeleting] = useState(false); // Состояние для процесса удаления
	const [initialFormData, setInitialFormData] = useState({
		// Сохраняем начальные данные формы для сравнения
		first_name: "",
		last_name: "",
		middle_name: "",
		phone: isCreating ? "" : undefined,
		role: isCreating ? "client" : "",
		status: isCreating ? "unverified" : "",
		departmentId: "",
	});

	// Состояние для формы редактирования/создания
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		middle_name: "",
		phone: isCreating ? "" : undefined, // Телефон только при создании
		role: isCreating ? "client" : "", // По умолчанию роль "пользователь" при создании
		status: isCreating ? "unverified" : "", // По умолчанию статус "не подтверждён" при создании
		departmentId: "",
	});

	// Удалены все состояния, функции и разметка, связанные с аватаркой пользователя по требованию. Оставлена только логика для остальных полей пользователя.

	// Проверка прав доступа при создании
	useEffect(() => {
		if (isCreating && user?.role !== "superadmin" && user?.role !== "admin") {
			showErrorToast("У вас нет прав для создания пользователей");
			router.push("/admin/users");
		}
	}, [isCreating, user, router]);

	// Загрузка данных пользователя
	useEffect(() => {
		const fetchUserData = async () => {
			if (isCreating) return; // Не загружаем данные если создаем нового пользователя

			try {
				setLoading(true);
				const response = await fetch(`/api/users/${userId}`);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Ошибка при загрузке данных пользователя");
				}

				const data = await response.json();
				setUserData(data);
				setFormData({
					first_name: data.first_name || "",
					last_name: data.last_name || "",
					middle_name: data.middle_name || "",
					phone: undefined, // Телефон нельзя редактировать
					role: data.role || "",
					status: data.status || "",
					departmentId: data.department?.id?.toString() || "",
				});
				setInitialFormData({
					// Сохраняем начальные данные при загрузке
					first_name: data.first_name || "",
					last_name: data.last_name || "",
					middle_name: data.middle_name || "",
					phone: undefined,
					role: data.role || "",
					status: data.status || "",
					departmentId: data.department?.id?.toString() || "",
				});
			} catch (err) {
				console.error("Ошибка при загрузке данных пользователя:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		if (userId) {
			fetchUserData();
		}
	}, [userId, isCreating]);

	// Загрузка списка отделов
	useEffect(() => {
		const fetchDepartments = async () => {
			try {
				const response = await fetch("/api/departments");
				if (response.ok) {
					const data = await response.json();
					setDepartments(data);
				}
			} catch (err) {
				console.error("Ошибка при загрузке списка отделов:", err);
			}
		};

		fetchDepartments();
	}, []);

	// Функция для проверки наличия изменений в форме
	const checkForChanges = () => {
		// Для создания пользователя всегда считаем, что есть изменения
		if (isCreating) return true;

		// Проверяем все поля на изменения
		return (
			formData.first_name !== initialFormData.first_name ||
			formData.last_name !== initialFormData.last_name ||
			formData.middle_name !== initialFormData.middle_name ||
			formData.role !== initialFormData.role ||
			formData.status !== initialFormData.status ||
			formData.departmentId !== initialFormData.departmentId
		);
	};

	// Проверка наличия изменений при каждом изменении формы
	useEffect(() => {
		if (!isCreating) {
			setHasChanges(checkForChanges());
		}
	}, [formData, isCreating, initialFormData]);

	// Функция для форматирования роли
	const formatRole = (role: string) => {
		switch (role) {
			case "superadmin":
				return "Суперадмин";
			case "admin":
				return "Администратор";
			case "manager":
				return "Менеджер";
			case "client":
				return "Пользователь";
			default:
				return role;
		}
	};

	// Функция для форматирования статуса
	const formatStatus = (status: string) => {
		switch (status) {
			case "verified":
				return "Подтверждён";
			case "unverified":
				return "Не подтверждён";
			default:
				return status;
		}
	};

	// Функция для форматирования даты
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Обработчик изменения полей формы
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;

		// Если меняется роль на "client" или "superadmin", автоматически сбрасываем отдел
		if (name === "role" && (value === "client" || value === "superadmin")) {
			setFormData((prev) => ({ ...prev, [name]: value, departmentId: "" }));
		} else {
			setFormData((prev) => ({ ...prev, [name]: value }));
		}
	};

	// Проверка прав на редактирование полей
	const canEditRole = () => {
		if (isCreating) return user?.role === "superadmin" || user?.role === "admin";

		// Суперадмин может редактировать роли всех пользователей
		if (user?.role === "superadmin") return true;

		// Админ может менять роль между менеджером и пользователем если:
		// 1. Редактируемый пользователь не админ и не суперадмин
		// 2. И одно из условий:
		//    - Менеджер принадлежит к отделу админа или не принадлежит ни к какому отделу
		//    - Пользователь (client)
		if (user?.role === "admin" && userData?.role !== "admin" && userData?.role !== "superadmin") {
			// Если это менеджер, проверяем принадлежность к отделу
			if (userData?.role === "manager") {
				return canAdminEditManager();
			}
			// Если это пользователь (client), разрешаем редактирование
			return true;
		}

		return false;
	};

	const canEditDepartment = () => {
		// Суперадмин может редактировать отдел любого пользователя
		if (user?.role === "superadmin") return true;

		// Админ может добавить менеджера без отдела в свой отдел
		if (user?.role === "admin" && userData?.role === "manager" && !userData?.department) {
			return true;
		}

		return false;
	};

	// Проверка, является ли текущий пользователь владельцем профиля
	const isOwnProfile = () => {
		return user?.id === userData?.id;
	};

	// Проверка, является ли менеджер из отдела текущего пользователя-админа или без отдела
	const canAdminEditManager = () => {
		// Менеджер из отдела админа
		const isFromSameDepartment =
			user?.role === "admin" && userData?.role === "manager" && user?.department?.id === userData?.department?.id && user?.department?.id !== undefined;

		// Менеджер без отдела
		const isManagerWithoutDepartment = user?.role === "admin" && userData?.role === "manager" && !userData?.department;

		return isFromSameDepartment || isManagerWithoutDepartment;
	};

	const canEditStatus = () => {
		// Если создаем нового пользователя
		if (isCreating) return true;

		// Суперадмин может редактировать статус всех пользователей
		if (user?.role === "superadmin") return true;

		// Админ может редактировать статус:
		// - свой собственный
		// - менеджеров из своего отдела или без отдела
		// - пользователей (клиентов)
		if (user?.role === "admin") {
			return isOwnProfile() || canAdminEditManager() || userData?.role === "client";
		}

		// Менеджер может редактировать статус только пользователей (клиентов)
		if (user?.role === "manager") {
			return userData?.role === "client";
		}

		return false;
	};

	const canEditName = () => {
		// Если создаем нового пользователя
		if (isCreating) return true;

		// Суперадмин может редактировать имена всех пользователей
		if (user?.role === "superadmin") return true;

		// Админ может редактировать имена:
		// - свои собственные
		// - менеджеров из своего отдела или без отдела
		// - пользователей (клиентов)
		if (user?.role === "admin") {
			return isOwnProfile() || canAdminEditManager() || userData?.role === "client";
		}

		// Менеджер может редактировать имена только пользователей (клиентов)
		if (user?.role === "manager") {
			return userData?.role === "client";
		}

		return false;
	};

	// Проверка наличия прав на редактирование хотя бы одного поля
	const canEditAnyField = () => {
		return canEditName() || canEditRole() || canEditStatus() || canEditDepartment();
	};

	// Функция для сохранения изменений или создания пользователя
	const handleSaveChanges = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSaving(true);

		// Валидация номера телефона при создании
		if (isCreating) {
			if (!formData.phone || !formData.phone.match(/^\+?[0-9]{10,15}$/)) {
				showErrorToast("Пожалуйста, введите корректный номер телефона");
				setIsSaving(false);
				return;
			}
		}

		try {
			let response;
			// Удалены все состояния, функции и разметка, связанные с аватаркой пользователя по требованию. Оставлена только логика для остальных полей пользователя.
			const dataToSend: any = {};
			if (isCreating) {
				dataToSend.first_name = formData.first_name;
				dataToSend.last_name = formData.last_name;
				dataToSend.middle_name = formData.middle_name;
				dataToSend.phone = formData.phone;
				dataToSend.role = formData.role;
				dataToSend.status = formData.status;
				dataToSend.adminId = user?.id;
				if (formData.departmentId && formData.role !== "client" && formData.role !== "superadmin") {
					dataToSend.departmentId = parseInt(formData.departmentId);
				}
			} else {
				if (canEditName()) {
					dataToSend.first_name = formData.first_name;
					dataToSend.last_name = formData.last_name;
					dataToSend.middle_name = formData.middle_name;
				}
				if (canEditRole()) dataToSend.role = formData.role;
				if (canEditStatus()) dataToSend.status = formData.status;
				if (canEditDepartment()) dataToSend.departmentId = formData.departmentId ? parseInt(formData.departmentId) : null;
			}
			const url = isCreating ? `/api/users/create` : `/api/users/${userId}/update`;
			const method = isCreating ? "POST" : "PUT";
			response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(dataToSend),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Ошибка при ${isCreating ? "создании" : "обновлении"} пользователя`);
			}

			const responseData = await response.json();

			if (isCreating) {
				showSuccessToast("Пользователь успешно создан");
				setTimeout(() => {
					router.push(`/admin/users/${responseData.id}`);
				}, 1000);
			} else {
				setUserData((prev) => (prev ? { ...prev, ...responseData } : null));
				showSuccessToast("Данные пользователя успешно обновлены");
				setInitialFormData({
					first_name: responseData.first_name || "",
					last_name: responseData.last_name || "",
					middle_name: responseData.middle_name || "",
					phone: undefined,
					role: responseData.role || "",
					status: responseData.status || "",
					departmentId: responseData.department?.id?.toString() || "",
				});
				setHasChanges(false);
				setTimeout(() => {
					router.refresh();
				}, 2000);
			}
		} catch (err) {
			console.error(`Ошибка при ${isCreating ? "создании" : "обновлении"} пользователя:`, err);
			showErrorToast(err instanceof Error ? err.message : `Неизвестная ошибка при ${isCreating ? "создании" : "обновлении"} пользователя`);
		} finally {
			setIsSaving(false);
		}
	};

	// Функция для отмены редактирования
	const handleCancelEdit = () => {
		if (isCreating) {
			// Если создаем, то возвращаемся к списку пользователей
			router.push("/admin/users");
		} else if (userData) {
			// Если редактируем, то возвращаем исходные данные
			setFormData({
				first_name: initialFormData.first_name,
				last_name: initialFormData.last_name,
				middle_name: initialFormData.middle_name,
				phone: undefined,
				role: initialFormData.role,
				status: initialFormData.status,
				departmentId: initialFormData.departmentId,
			});
			setHasChanges(false); // Сбрасываем флаг изменений при отмене
		}
	};

	// Проверка, может ли текущий пользователь удалить этого пользователя
	const canDeleteUser = () => {
		if (isCreating || !userData || !user) return false;

		// Суперадмин может удалять любых пользователей, кроме других суперадминов
		if (user.role === "superadmin" && userData.role !== "superadmin") {
			return true;
		}

		// Админ может удалять менеджеров из своего отдела и обычных пользователей
		if (user.role === "admin") {
			if (userData.role === "client") {
				return true;
			}
			if (userData.role === "manager" && user.department?.id && userData.department?.id === user.department.id) {
				return true;
			}
		}

		return false;
	};

	// Функция для удаления пользователя
	const handleDeleteUser = async () => {
		if (!userId || isDeleting) return;

		setIsDeleting(true);
		try {
			const response = await fetch(`/api/users/${userId}/delete`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при удалении пользователя");
			}

			showSuccessToast("Пользователь успешно удален");

			// Перенаправляем на страницу списка пользователей
			setTimeout(() => {
				router.push("/admin/users");
			}, 1500);
		} catch (err) {
			console.error("Ошибка при удалении пользователя:", err);
			showErrorToast(err instanceof Error ? err.message : "Неизвестная ошибка при удалении пользователя");
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	if (loading) {
		return (
			<div className={`screenContent ${styles.userPageContainer}`}>
				<Link href="/admin/users" className={styles.backLink}>
					← К списку пользователей
				</Link>
				<Loading />
			</div>
		);
	}

	if (error) {
		return (
			<div className={`screenContent ${styles.userPageContainer}`}>
				<Link href="/admin/users" className={styles.backLink}>
					← К списку пользователей
				</Link>
				<h3>Ошибка: {error}</h3>
			</div>
		);
	}

	if (!userData && !isCreating) {
		return (
			<div className={`screenContent ${styles.userPageContainer}`}>
				<Link href="/admin/users" className={styles.backLink}>
					← К списку пользователей
				</Link>
				<h3>Пользователь не найден</h3>
			</div>
		);
	}

	return (
		<div className={`screenContent ${styles.userPageContainer}`}>
			{/* Навигация и заголовок */}
			<Link href="/admin/users" className={styles.backLink}>
				← К списку пользователей
			</Link>
			<h1 className={styles.pageTitle}>
				{isCreating ? "Создание нового пользователя" : `Профиль пользователя: ${userData?.last_name || ""} ${userData?.first_name || ""} ${userData?.middle_name || ""}`}
			</h1>

			{/* Добавляем вкладки для существующих пользователей */}
			{!isCreating && userData && (
				<div className={styles.userTabs}>
					<button className={`${styles.tabButton} ${activeTab === "profile" ? styles.activeTab : ""}`} onClick={() => setActiveTab("profile")}>
						Профиль
					</button>
					<button className={`${styles.tabButton} ${activeTab === "logs" ? styles.activeTab : ""}`} onClick={() => setActiveTab("logs")}>
						История изменений
					</button>
				</div>
			)}

			{/* Отображаем контент в зависимости от активной вкладки */}
			{activeTab === "profile" ? (
				<>
					{/* Карточка пользователя */}
					<div className={`borderBlock ${styles.userCard}`}>
						<div className={styles.userInfoContainer}>
							{/* Информация о пользователе */}
							<div className={styles.userDetailsContainer}>
								<form onSubmit={handleSaveChanges} className={styles.editForm}>
									<div className={styles.userDetailsList}>
										{!isCreating && (
											<div className={styles.detailItem}>
												<h3 className={styles.detailLabel}>ID пользователя:</h3>
												<div className={styles.inputField}>{userData?.id}</div>
											</div>
										)}
										{isCreating ? (
											<div className={styles.detailItem}>
												<label className={styles.detailLabel} htmlFor="phone">
													Телефон *
												</label>
												<input
													id="phone"
													name="phone"
													type="text"
													value={formData.phone || ""}
													onChange={handleInputChange}
													className={styles.inputField}
													required
													placeholder="+79001234567"
												/>
											</div>
										) : (
											<div className={styles.detailItem}>
												<label className={styles.detailLabel}>Телефон:</label>
												<p className={styles.detailValue}>{userData?.phone}</p>
											</div>
										)}
										<div className={styles.detailItem}>
											<label className={styles.detailLabel} htmlFor="last_name">
												Фамилия:
											</label>
											{canEditName() ? (
												<input
													id="last_name"
													name="last_name"
													type="text"
													value={formData.last_name}
													onChange={handleInputChange}
													className={styles.inputField}
												/>
											) : (
												<p className={styles.detailValue}>{userData?.last_name || "—"}</p>
											)}
										</div>
										<div className={styles.detailItem}>
											<label className={styles.detailLabel} htmlFor="first_name">
												Имя:
											</label>
											{canEditName() ? (
												<input
													id="first_name"
													name="first_name"
													type="text"
													value={formData.first_name}
													onChange={handleInputChange}
													className={styles.inputField}
												/>
											) : (
												<p className={styles.detailValue}>{userData?.first_name || "—"}</p>
											)}
										</div>
										<div className={styles.detailItem}>
											<label className={styles.detailLabel} htmlFor="middle_name">
												Отчество:
											</label>
											{canEditName() ? (
												<input
													id="middle_name"
													name="middle_name"
													type="text"
													value={formData.middle_name}
													onChange={handleInputChange}
													className={styles.inputField}
												/>
											) : (
												<p className={styles.detailValue}>{userData?.middle_name || "—"}</p>
											)}
										</div>
										<div className={styles.detailItem}>
											<label className={styles.detailLabel} htmlFor="role">
												Роль:
											</label>
											{canEditRole() ? (
												<>
													<select id="role" name="role" value={formData.role} onChange={handleInputChange} className={styles.selectField}>
														{/* Убираем возможность выбора роли суперадмина */}
														{user?.role === "superadmin" && <option value="admin">Администратор</option>}
														<option value="manager">Менеджер</option>
														<option value="client">Пользователь</option>
													</select>
												</>
											) : (
												<p className={styles.detailValue}>{userData ? formatRole(userData.role) : "Пользователь"}</p>
											)}
										</div>
										<div className={styles.detailItem}>
											<label className={styles.detailLabel} htmlFor="status">
												Статус:
											</label>
											{canEditStatus() ? (
												<select id="status" name="status" value={formData.status} onChange={handleInputChange} className={styles.selectField}>
													<option value="verified">Подтверждён</option>
													<option value="unverified">Не подтверждён</option>
												</select>
											) : (
												<p className={styles.detailValue}>{userData ? formatStatus(userData.status) : "Не подтверждён"}</p>
											)}
										</div>
										<div className={styles.detailItem}>
											<label className={styles.detailLabel} htmlFor="departmentId">
												Отдел:
											</label>
											{canEditDepartment() ? (
												<>
													<select
														id="departmentId"
														name="departmentId"
														value={formData.role === "client" || formData.role === "superadmin" ? "" : formData.departmentId}
														onChange={handleInputChange}
														className={styles.selectField}
														disabled={formData.role === "client" || formData.role === "superadmin"}
													>
														<option value="">Не выбрано</option>
														{formData.role !== "client" &&
															formData.role !== "superadmin" &&
															departments.map((dept) => {
																// Если пользователь админ, то он может выбрать только свой отдел
																if (user?.role === "admin" && dept.id !== user?.department?.id) {
																	return null;
																}
																return (
																	<option key={dept.id} value={dept.id.toString()}>
																		{dept.name}
																	</option>
																);
															})}
													</select>
													{formData.role === "client" && <div className={styles.infoText}>* Пользователи не могут быть привязаны к отделам</div>}
													{formData.role === "superadmin" && <div className={styles.infoText}>* Суперадмины не могут быть привязаны к отделам</div>}
												</>
											) : (
												<p className={styles.detailValue}>
													{userData?.department ? (
														<Link href={`/admin/departments/${userData.department.id}`} className={styles.departmentLink}>
															{userData.department.name}
														</Link>
													) : (
														"—"
													)}
												</p>
											)}
										</div>
									</div>

									{/* Кнопки действий */}
									{canEditAnyField() && (
										<div className={styles.formActions}>
											<button type="submit" className={`button acceptButton ${styles.saveButton}`} disabled={isSaving || !checkForChanges()}>
												{isSaving ? (isCreating ? "Создание..." : "Сохранение...") : isCreating ? "Создать пользователя" : "Сохранить изменения"}
											</button>
											<button
												type="button"
												className={`button cancelButton ${styles.cancelButton}`}
												onClick={handleCancelEdit}
												disabled={isSaving || !checkForChanges()}
											>
												Отмена
											</button>
										</div>
									)}
								</form>
							</div>
						</div>
					</div>

					{/* Блок для заявок пользователя - только для существующих пользователей */}
					{!isCreating && userData && (
						<div className={styles.ordersCard}>
							<h2 className={styles.ordersTitle}>Заявки пользователя</h2>

							{userData.orders && userData.orders.length > 0 ? (
								<div className="overflow-x-auto">
									<table className={styles.ordersTable}>
										<thead>
											<tr>
												<th>ID</th>
												<th>Название</th>
												<th>Статус</th>
												<th>Дата создания</th>
											</tr>
										</thead>
										<tbody>
											{userData.orders.map((order) => (
												<tr key={order.id}>
													<td>{order.id}</td>
													<td>{order.title}</td>
													<td>{order.status}</td>
													<td>{formatDate(order.createdAt)}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className={styles.noOrders}>У пользователя пока нет заявок</div>
							)}
						</div>
					)}

					{/* Кнопка удаления пользователя */}
					{!isCreating && userData && canDeleteUser() && (
						<div className={styles.deleteUserSection}>
							<button onClick={() => setShowDeleteConfirm(true)} className={`button dangerButton ${styles.deleteButton}`} disabled={isDeleting}>
								{isDeleting ? "Удаление..." : "Удалить пользователя"}
							</button>
						</div>
					)}
				</>
			) : (
				// Вкладка с логами пользователя
				<div className={styles.logsTab}>{userId && <UsersLogs userId={Number(userId)} />}</div>
			)}

			{/* Модальное окно подтверждения удаления */}
			{showDeleteConfirm && (
				<ConfirmPopup
					open={showDeleteConfirm}
					title="Удаление пользователя"
					message={`Вы действительно хотите удалить пользователя ${userData?.last_name || ""} ${userData?.first_name || ""} (${userData?.phone})?`}
					confirmText="Удалить"
					cancelText="Отмена"
					onConfirm={handleDeleteUser}
					onCancel={() => setShowDeleteConfirm(false)}
				/>
			)}
		</div>
	);
}
