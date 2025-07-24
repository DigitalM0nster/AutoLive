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
	const [hasMoreAdmins, setHasMoreAdmins] = useState(true);
	const [hasMoreManagers, setHasMoreManagers] = useState(true);
	const [debugInfo, setDebugInfo] = useState<string | null>(null);

	// Константы
	const PAGE_SIZE = 20; // Размер страницы для загрузки пользователей

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

			console.log("Загружаем всех пользователей без отдела...");
			// Увеличиваем лимит, чтобы получить больше пользователей за один запрос
			const usersRes = await fetch("/api/users?withoutDepartment=true&limit=100", {
				credentials: "include",
			});

			if (!usersRes.ok) {
				const errorText = await usersRes.text();
				console.error("Ошибка загрузки пользователей:", usersRes.status, errorText);
				throw new Error(`Не удалось загрузить пользователей: ${usersRes.status} ${errorText}`);
			}

			const usersData = await usersRes.json();
			console.log("Все пользователи без отдела:", usersData);

			// Фильтруем пользователей по ролям
			const admins = (usersData.users || []).filter((user: User) => user.role === "admin");
			const managers = (usersData.users || []).filter((user: User) => user.role === "manager");

			setAvailableAdmins(admins);
			setAvailableManagers(managers);

			// Отладочная информация
			setDebugInfo(`
				Всего пользователей без отдела: ${usersData.users?.length || 0} из ${usersData.total || 0}
				Администраторов без отдела: ${admins.length}
				Менеджеров без отдела: ${managers.length}
				Роли пользователей: ${JSON.stringify(
					(usersData.users || []).reduce((acc: Record<string, number>, user: User) => {
						const role = user.role || "unknown";
						acc[role] = (acc[role] || 0) + 1;
						return acc;
					}, {})
				)}
			`);
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
			console.log(`Загружаем администраторов без отдела (страница ${page})...`);
			const adminsRes = await fetch(`/api/users?withoutDepartment=true&role=admin&page=${page}&limit=${PAGE_SIZE}`, {
				credentials: "include",
			});

			if (!adminsRes.ok) {
				const errorText = await adminsRes.text();
				console.error("Ошибка загрузки администраторов:", adminsRes.status, errorText);
				throw new Error(`Не удалось загрузить администраторов: ${adminsRes.status} ${errorText}`);
			}

			const adminsData = await adminsRes.json();
			console.log("Полученные администраторы:", adminsData);

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
			console.log(`Загружаем менеджеров без отдела (страница ${page})...`);
			const managersRes = await fetch(`/api/users?withoutDepartment=true&role=manager&page=${page}&limit=${PAGE_SIZE}`, {
				credentials: "include",
			});

			if (!managersRes.ok) {
				const errorText = await managersRes.text();
				console.error("Ошибка загрузки менеджеров:", managersRes.status, errorText);
				throw new Error(`Не удалось загрузить менеджеров: ${managersRes.status} ${errorText}`);
			}

			const managersData = await managersRes.json();
			console.log("Полученные менеджеры:", managersData);

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
			// Используем альтернативный подход - загружаем всех пользователей сразу
			loadAllUsersWithoutDepartment();

			// Если альтернативный подход не сработает, можно вернуться к раздельной загрузке
			// loadAdmins(1);
			// loadManagers(1);
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
			// Создаем отдел
			const departmentRes = await fetch("/api/departments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formName,
					categoryIds: formCategories,
				}),
				credentials: "include",
			});

			if (!departmentRes.ok) {
				const errorData = await departmentRes.json();
				throw new Error(errorData.error || "Ошибка при создании отдела");
			}

			const departmentData = await departmentRes.json();
			const departmentId = departmentData.id;

			// Если есть выбранные пользователи, добавляем их в отдел
			if (selectedAdmins.length > 0 || selectedManagers.length > 0) {
				const userIds = [...selectedAdmins, ...selectedManagers];
				const usersRes = await fetch(`/api/departments/${departmentId}/users`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userIds }),
					credentials: "include",
				});

				if (!usersRes.ok) {
					const errorData = await usersRes.json();
					throw new Error(errorData.error || "Ошибка при добавлении пользователей");
				}
			}

			showSuccessToast("Отдел успешно создан");
			router.push(`/admin/departments/${departmentId}`);
		} catch (err) {
			console.error("Ошибка при создании отдела:", err);
			showErrorToast(err instanceof Error ? err.message : "Ошибка при создании отдела");
		} finally {
			setLoading(false);
		}
	};

	console.log("Доступные администраторы:", availableAdmins);
	console.log("Доступные менеджеры:", availableManagers);

	// Отображаем загрузку, если данные еще не получены
	if (loading) {
		return <Loading />;
	}

	// Отображаем ошибку, если она есть
	if (error) {
		return (
			<div>
				<h3>Ошибка загрузки данных</h3>
				<p>{error}</p>
				<button onClick={() => window.location.reload()}>Попробовать снова</button>
			</div>
		);
	}

	return (
		<div>
			<div>
				<div>
					<h3>Название отдела</h3>
					<input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Введите название отдела" />
				</div>
			</div>

			<div>
				<div>
					<h3>Доступные категории</h3>
					<div>
						{categories.map((category) => (
							<div key={category.id} onClick={() => toggleCategory(category.id)}>
								<div>
									<div>{formCategories.includes(category.id) ? "✓" : ""}</div>
								</div>
								<div>{category.title}</div>
							</div>
						))}
						{categories.length === 0 && <div>Нет доступных категорий</div>}
					</div>
				</div>
			</div>

			{/* Отладочная информация */}
			{debugInfo && (
				<div style={{ margin: "10px 0", padding: "10px", border: "1px solid #ccc", background: "#f5f5f5", fontSize: "12px" }}>
					<h4>Отладочная информация:</h4>
					<pre>{debugInfo}</pre>
					<button onClick={loadAllUsersWithoutDepartment}>Перезагрузить пользователей</button>
				</div>
			)}

			<div>
				<div>
					<h3>Администраторы</h3>
					<div>
						{/* Выбранные администраторы */}
						{selectedAdmins.length > 0 && (
							<div>
								<h4>Выбранные администраторы</h4>
								{availableAdmins
									.filter((admin) => selectedAdmins.includes(admin.id))
									.map((admin) => (
										<div key={admin.id}>
											<div onClick={() => toggleAdmin(admin.id)}>
												{admin.first_name} {admin.last_name} ({admin.phone})
											</div>
										</div>
									))}
							</div>
						)}

						{/* Доступные администраторы (без отдела) */}
						<div>
							<h4>Доступные администраторы</h4>
							{availableAdmins
								.filter((admin) => !selectedAdmins.includes(admin.id))
								.map((admin) => (
									<div key={admin.id} onClick={() => toggleAdmin(admin.id)}>
										{admin.first_name} {admin.last_name} ({admin.phone})
									</div>
								))}
							{availableAdmins.length === 0 && !loadingAdmins && <div>Нет доступных администраторов</div>}
							{loadingAdmins && <div>Загрузка администраторов...</div>}
							{hasMoreAdmins && availableAdmins.length > 0 && !loadingAdmins && (
								<div>
									<button onClick={() => loadAdmins(adminPage + 1)}>Загрузить еще администраторов</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div>
				<div>
					<h3>Менеджеры</h3>
					<div>
						{/* Выбранные менеджеры */}
						{selectedManagers.length > 0 && (
							<div>
								<h4>Выбранные менеджеры</h4>
								{availableManagers
									.filter((manager) => selectedManagers.includes(manager.id))
									.map((manager) => (
										<div key={manager.id}>
											<div onClick={() => toggleManager(manager.id)}>
												{manager.first_name} {manager.last_name} ({manager.phone})
											</div>
										</div>
									))}
							</div>
						)}

						{/* Доступные менеджеры (без отдела) */}
						<div>
							<h4>Доступные менеджеры</h4>
							{availableManagers
								.filter((manager) => !selectedManagers.includes(manager.id))
								.map((manager) => (
									<div key={manager.id} onClick={() => toggleManager(manager.id)}>
										{manager.first_name} {manager.last_name} ({manager.phone})
									</div>
								))}
							{availableManagers.length === 0 && !loadingManagers && <div>Нет доступных менеджеров</div>}
							{loadingManagers && <div>Загрузка менеджеров...</div>}
							{hasMoreManagers && availableManagers.length > 0 && !loadingManagers && (
								<div>
									<button onClick={() => loadManagers(managerPage + 1)}>Загрузить еще менеджеров</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div>
				<button onClick={handleSubmit} disabled={!formName.trim()}>
					<Check />
					Создать отдел
				</button>
				<button onClick={() => router.push("/admin/departments")}>
					<X />
					Отмена
				</button>
			</div>
		</div>
	);
}
