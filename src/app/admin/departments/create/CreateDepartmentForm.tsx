"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import { Category, User, Role } from "@/lib/types";
import { Check, X } from "lucide-react";
import Loading from "@/components/ui/loading/Loading";

export default function CreateDepartmentForm() {
	const router = useRouter();

	// Состояния для формы
	const [formName, setFormName] = useState("");
	const [formCategories, setFormCategories] = useState<number[]>([]);
	const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);
	const [selectedManagers, setSelectedManagers] = useState<number[]>([]);

	// Состояния для данных
	const [categories, setCategories] = useState<Category[]>([]);
	const [availableAdmins, setAvailableAdmins] = useState<User[]>([]);
	const [availableManagers, setAvailableManagers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadingAdmins, setLoadingAdmins] = useState(false);
	const [loadingManagers, setLoadingManagers] = useState(false);
	const [adminPage, setAdminPage] = useState(1);
	const [managerPage, setManagerPage] = useState(1);
	const [hasMoreAdmins, setHasMoreAdmins] = useState(false);
	const [hasMoreManagers, setHasMoreManagers] = useState(false);

	// Константы
	const PAGE_SIZE = 20; // Размер страницы для загрузки пользователей
	const INITIAL_LOAD_LIMIT = 100; // Лимит для первоначальной загрузки

	// Загрузка категорий при монтировании компонента
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				// Загружаем категории
				const categoriesRes = await fetch("/api/categories", { credentials: "include" });
				if (!categoriesRes.ok) throw new Error("Не удалось загрузить категории");
				const categoriesData = await categoriesRes.json();
				setCategories(categoriesData);
			} catch (err) {
				console.error("Ошибка загрузки категорий:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
				showErrorToast("Ошибка загрузки категорий");
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	// Загрузка всех пользователей без отдела
	const loadAllUsersWithoutDepartment = async () => {
		try {
			setLoadingAdmins(true);
			setLoadingManagers(true);

			// Загружаем пользователей без отдела
			const apiUrl = `/api/users?withoutDepartment=true&limit=${INITIAL_LOAD_LIMIT}`;
			const usersRes = await fetch(apiUrl, {
				credentials: "include",
			});

			if (!usersRes.ok) {
				const errorText = await usersRes.text();
				throw new Error(`Не удалось загрузить пользователей: ${usersRes.status} ${errorText}`);
			}

			const usersData = await usersRes.json();

			// Проверяем, что usersData.users существует и является массивом
			if (!Array.isArray(usersData.users)) {
				throw new Error("API вернул неверный формат данных");
			}

			// Фильтруем пользователей по ролям
			const admins = usersData.users.filter((user: User) => user.role === "admin");
			const managers = usersData.users.filter((user: User) => user.role === "manager");

			setAvailableAdmins(admins);
			setAvailableManagers(managers);

			// Проверяем, возможно ли наличие дополнительных пользователей
			// Если количество пользователей равно лимиту, возможно есть еще
			setHasMoreAdmins(usersData.users.length === INITIAL_LOAD_LIMIT && admins.length > 0);
			setHasMoreManagers(usersData.users.length === INITIAL_LOAD_LIMIT && managers.length > 0);
		} catch (err) {
			console.error("Ошибка загрузки пользователей:", err);
			setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			showErrorToast("Ошибка загрузки пользователей");
		} finally {
			setLoadingAdmins(false);
			setLoadingManagers(false);
		}
	};

	// Загрузка администраторов
	const loadAdmins = async (page = 1) => {
		if (loadingAdmins || (!hasMoreAdmins && page > 1)) return;

		setLoadingAdmins(true);
		try {
			// Загружаем администраторов без отдела
			const adminsRes = await fetch(`/api/users?withoutDepartment=true&role=admin&page=${page}&limit=${PAGE_SIZE}`, {
				credentials: "include",
			});

			if (!adminsRes.ok) {
				const errorText = await adminsRes.text();
				throw new Error(`Не удалось загрузить администраторов: ${adminsRes.status} ${errorText}`);
			}

			const adminsData = await adminsRes.json();

			// Обновляем список администраторов
			if (page === 1) {
				setAvailableAdmins(adminsData.users || []);
			} else {
				setAvailableAdmins((prev) => [...prev, ...(adminsData.users || [])]);
			}

			// Проверяем, есть ли еще администраторы для загрузки
			setHasMoreAdmins((adminsData.users || []).length === PAGE_SIZE);
			setAdminPage(page);
		} catch (err) {
			console.error("Ошибка загрузки администраторов:", err);
			showErrorToast("Ошибка загрузки администраторов");
		} finally {
			setLoadingAdmins(false);
		}
	};

	// Загрузка менеджеров
	const loadManagers = async (page = 1) => {
		if (loadingManagers || (!hasMoreManagers && page > 1)) return;

		setLoadingManagers(true);
		try {
			// Загружаем менеджеров без отдела
			const managersRes = await fetch(`/api/users?withoutDepartment=true&role=manager&page=${page}&limit=${PAGE_SIZE}`, {
				credentials: "include",
			});

			if (!managersRes.ok) {
				const errorText = await managersRes.text();
				throw new Error(`Не удалось загрузить менеджеров: ${managersRes.status} ${errorText}`);
			}

			const managersData = await managersRes.json();

			// Обновляем список менеджеров
			if (page === 1) {
				setAvailableManagers(managersData.users || []);
			} else {
				setAvailableManagers((prev) => [...prev, ...(managersData.users || [])]);
			}

			// Проверяем, есть ли еще менеджеры для загрузки
			setHasMoreManagers((managersData.users || []).length === PAGE_SIZE);
			setManagerPage(page);
		} catch (err) {
			console.error("Ошибка загрузки менеджеров:", err);
			showErrorToast("Ошибка загрузки менеджеров");
		} finally {
			setLoadingManagers(false);
		}
	};

	// Загрузка пользователей при загрузке категорий
	useEffect(() => {
		if (!loading) {
			// Загружаем всех пользователей сразу
			loadAllUsersWithoutDepartment();
		}
	}, [loading]);

	// Переключение выбора категории
	const toggleCategory = (categoryId: number) => {
		if (formCategories.includes(categoryId)) {
			setFormCategories(formCategories.filter((id) => id !== categoryId));
		} else {
			setFormCategories([...formCategories, categoryId]);
		}
	};

	// Переключение выбора пользователя (админа)
	const toggleAdmin = (userId: number) => {
		if (selectedAdmins.includes(userId)) {
			setSelectedAdmins(selectedAdmins.filter((id) => id !== userId));
		} else {
			setSelectedAdmins([...selectedAdmins, userId]);
		}
	};

	// Переключение выбора пользователя (менеджера)
	const toggleManager = (userId: number) => {
		if (selectedManagers.includes(userId)) {
			setSelectedManagers(selectedManagers.filter((id) => id !== userId));
		} else {
			setSelectedManagers([...selectedManagers, userId]);
		}
	};

	// Отправка формы
	const handleSubmit = async () => {
		if (!formName.trim()) {
			showErrorToast("Введите название отдела");
			return;
		}

		setLoading(true);
		try {
			// Создаем отдел с пользователями
			const userIds = [...selectedAdmins, ...selectedManagers];
			const departmentRes = await fetch("/api/departments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formName,
					categoryIds: formCategories,
					userIds: userIds,
				}),
				credentials: "include",
			});

			if (!departmentRes.ok) {
				let errorMessage = "Ошибка при создании отдела";
				try {
					const errorData = await departmentRes.json();
					errorMessage = errorData.error || errorMessage;
				} catch {
					// Если не удалось распарсить JSON, используем текст ответа
					errorMessage = (await departmentRes.text()) || errorMessage;
				}
				throw new Error(errorMessage);
			}

			const departmentData = await departmentRes.json();
			const departmentId = departmentData.id;

			showSuccessToast("Отдел успешно создан");
			router.push(`/admin/departments/${departmentId}`);
		} catch (err) {
			console.error("Ошибка при создании отдела:", err);
			showErrorToast(err instanceof Error ? err.message : "Ошибка при создании отдела");
		} finally {
			setLoading(false);
		}
	};

	// Отображаем загрузку, если данные еще не получены
	if (loading) {
		return <Loading />;
	}

	// Отображаем ошибку, если она есть
	if (error) {
		return (
			<div className="errorContainer">
				<h3>Ошибка загрузки данных</h3>
				<p>{error}</p>
				<button className="button" onClick={() => window.location.reload()}>
					Попробовать снова
				</button>
			</div>
		);
	}

	return (
		<div className="createDepartmentForm">
			<div className="formSection">
				<div className="formGroup">
					<h3 className="sectionTitle">Название отдела</h3>
					<input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Введите название отдела" className="formInput" />
				</div>
			</div>

			<div className="formSection">
				<div className="formGroup">
					<h3 className="sectionTitle">Доступные категории</h3>
					<div className="categoriesList">
						{categories.map((category) => (
							<div key={category.id} onClick={() => toggleCategory(category.id)} className="categoryItem">
								<div className="checkboxWrapper">
									<div className="checkbox">{formCategories.includes(category.id) ? "✓" : ""}</div>
								</div>
								<div className="categoryTitle">{category.title}</div>
							</div>
						))}
						{categories.length === 0 && <div className="emptyMessage">Нет доступных категорий</div>}
					</div>
				</div>
			</div>

			<div className="formSection">
				<div className="formGroup">
					<h3 className="sectionTitle">Администраторы</h3>
					<div className="usersContainer">
						{/* Выбранные администраторы */}
						{selectedAdmins.length > 0 && (
							<div className="selectedUsers">
								<h4 className="subsectionTitle">Выбранные администраторы</h4>
								{availableAdmins
									.filter((admin) => selectedAdmins.includes(admin.id))
									.map((admin) => (
										<div key={admin.id} className="userItem selected">
											<div onClick={() => toggleAdmin(admin.id)} className="userName">
												{admin.first_name} {admin.last_name} ({admin.phone})
											</div>
										</div>
									))}
							</div>
						)}

						{/* Доступные администраторы (без отдела) */}
						<div className="availableUsers">
							<h4 className="subsectionTitle">Доступные администраторы</h4>
							{availableAdmins
								.filter((admin) => !selectedAdmins.includes(admin.id))
								.map((admin) => (
									<div key={admin.id} onClick={() => toggleAdmin(admin.id)} className="userItem">
										{admin.first_name} {admin.last_name} ({admin.phone})
									</div>
								))}
							{availableAdmins.length === 0 && !loadingAdmins && <div className="emptyMessage">Нет доступных администраторов</div>}
							{loadingAdmins && <div className="loadingMessage">Загрузка администраторов...</div>}
							{/* Показываем кнопку "Загрузить еще" только если есть вероятность наличия дополнительных администраторов */}
							{hasMoreAdmins && availableAdmins.length > 0 && !loadingAdmins && (
								<div className="loadMoreContainer">
									<button onClick={() => loadAdmins(adminPage + 1)} className="loadMoreButton">
										Загрузить еще администраторов
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="formSection">
				<div className="formGroup">
					<h3 className="sectionTitle">Менеджеры</h3>
					<div className="usersContainer">
						{/* Выбранные менеджеры */}
						{selectedManagers.length > 0 && (
							<div className="selectedUsers">
								<h4 className="subsectionTitle">Выбранные менеджеры</h4>
								{availableManagers
									.filter((manager) => selectedManagers.includes(manager.id))
									.map((manager) => (
										<div key={manager.id} className="userItem selected">
											<div onClick={() => toggleManager(manager.id)} className="userName">
												{manager.first_name} {manager.last_name} ({manager.phone})
											</div>
										</div>
									))}
							</div>
						)}

						{/* Доступные менеджеры (без отдела) */}
						<div className="availableUsers">
							<h4 className="subsectionTitle">Доступные менеджеры</h4>
							{availableManagers
								.filter((manager) => !selectedManagers.includes(manager.id))
								.map((manager) => (
									<div key={manager.id} onClick={() => toggleManager(manager.id)} className="userItem">
										{manager.first_name} {manager.last_name} ({manager.phone})
									</div>
								))}
							{availableManagers.length === 0 && !loadingManagers && <div className="emptyMessage">Нет доступных менеджеров</div>}
							{loadingManagers && <div className="loadingMessage">Загрузка менеджеров...</div>}
							{/* Показываем кнопку "Загрузить еще" только если есть вероятность наличия дополнительных менеджеров */}
							{hasMoreManagers && availableManagers.length > 0 && !loadingManagers && (
								<div className="loadMoreContainer">
									<button onClick={() => loadManagers(managerPage + 1)} className="loadMoreButton">
										Загрузить еще менеджеров
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="formActions">
				<button onClick={handleSubmit} disabled={!formName.trim()} className="submitButton">
					<Check />
					Создать отдел
				</button>
				<button onClick={() => router.push("/admin/departments")} className="cancelButton">
					<X />
					Отмена
				</button>
			</div>

			<style jsx>{`
				.createDepartmentForm {
					max-width: 800px;
					margin: 0 auto;
					padding: 20px;
				}

				.formSection {
					margin-bottom: 30px;
					background: #fff;
					border-radius: 8px;
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
					padding: 20px;
				}

				.sectionTitle {
					font-size: 18px;
					margin-top: 0;
					margin-bottom: 15px;
					color: #333;
					border-bottom: 1px solid #eee;
					padding-bottom: 10px;
				}

				.subsectionTitle {
					font-size: 16px;
					margin-top: 0;
					margin-bottom: 10px;
					color: #555;
				}

				.formInput {
					width: 100%;
					padding: 10px;
					border: 1px solid #ddd;
					border-radius: 4px;
					font-size: 16px;
				}

				.categoriesList {
					display: flex;
					flex-wrap: wrap;
					gap: 10px;
					margin-top: 10px;
				}

				.categoryItem {
					display: flex;
					align-items: center;
					padding: 8px 12px;
					border: 1px solid #ddd;
					border-radius: 4px;
					cursor: pointer;
					transition: background-color 0.2s;
				}

				.categoryItem:hover {
					background-color: #f5f5f5;
				}

				.checkboxWrapper {
					margin-right: 8px;
				}

				.checkbox {
					width: 18px;
					height: 18px;
					border: 1px solid #aaa;
					border-radius: 3px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: #0066cc;
					font-weight: bold;
				}

				.usersContainer {
					margin-top: 15px;
				}

				.selectedUsers {
					margin-bottom: 20px;
					padding: 15px;
					background: #f0f7ff;
					border-radius: 6px;
				}

				.userItem {
					padding: 8px 12px;
					border-radius: 4px;
					margin-bottom: 5px;
					cursor: pointer;
					transition: background-color 0.2s;
				}

				.userItem:hover {
					background-color: #f0f0f0;
				}

				.userItem.selected {
					background-color: #e6f0ff;
				}

				.emptyMessage,
				.loadingMessage {
					padding: 10px;
					color: #666;
					font-style: italic;
				}

				.loadMoreContainer {
					margin-top: 15px;
					text-align: center;
				}

				.loadMoreButton {
					background: #f5f5f5;
					border: 1px solid #ddd;
					padding: 8px 15px;
					border-radius: 4px;
					cursor: pointer;
					color: #555;
				}

				.loadMoreButton:hover {
					background: #eee;
				}

				.formActions {
					display: flex;
					gap: 15px;
					margin-top: 20px;
				}

				.submitButton,
				.cancelButton {
					display: flex;
					align-items: center;
					gap: 8px;
					padding: 10px 20px;
					border-radius: 4px;
					cursor: pointer;
					font-weight: 500;
					border: none;
					transition: background-color 0.2s;
				}

				.submitButton {
					background-color: #0066cc;
					color: white;
				}

				.submitButton:hover {
					background-color: #0055aa;
				}

				.submitButton:disabled {
					background-color: #cccccc;
					cursor: not-allowed;
				}

				.cancelButton {
					background-color: #f5f5f5;
					color: #333;
					border: 1px solid #ddd;
				}

				.cancelButton:hover {
					background-color: #eee;
				}

				.errorContainer {
					text-align: center;
					padding: 30px;
					background: #fff;
					border-radius: 8px;
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
				}

				.button {
					background-color: #0066cc;
					color: white;
					padding: 10px 20px;
					border: none;
					border-radius: 4px;
					cursor: pointer;
					font-weight: 500;
					margin-top: 15px;
				}

				.button:hover {
					background-color: #0055aa;
				}
			`}</style>
		</div>
	);
}
