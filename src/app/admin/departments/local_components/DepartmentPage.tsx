"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import DepartmentCategorySection from "./DepartmentCategorySection";
import DepartmentStaffSection from "./DepartmentStaffSection";
import { Category, Department, User } from "@/lib/types";
import { Check, X } from "lucide-react";
import styles from "./styles.module.scss";
import Loading from "@/components/ui/loading/Loading";

interface DepartmentPageProps {
	departmentId?: string | number;
	initialDepartment?: Department | null;
	initialCategories?: Category[];
}

export default function DepartmentPage({ departmentId, initialDepartment = null, initialCategories = [] }: DepartmentPageProps) {
	const router = useRouter();
	const { user } = useAuthStore();

	const [department, setDepartment] = useState<Department | null>(initialDepartment);
	const [categories, setCategories] = useState<Category[]>(initialCategories);
	const [loading, setLoading] = useState(true);

	const [formName, setFormName] = useState("");
	const [formCategories, setFormCategories] = useState<number[]>([]);
	const [isFormChanged, setIsFormChanged] = useState(false);

	const [originalName, setOriginalName] = useState("");
	const [originalCategories, setOriginalCategories] = useState<number[]>([]);

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

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await fetch("/api/categories", { credentials: "include" });
				if (!res.ok) throw new Error("Не удалось загрузить категории");
				const data = await res.json();
				setCategories(data);
			} catch (err) {
				console.error("Ошибка загрузки категорий:", err);
				showErrorToast("Ошибка загрузки категорий");
			}
		};

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
				setFormCategories([]);
				setOriginalName("");
				setOriginalCategories([]);
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
				setFormCategories(data.allowedCategories.map((a: any) => a.category.id));
				setOriginalName(data.name);
				setOriginalCategories(data.allowedCategories.map((a: any) => a.category.id));
			} catch (err) {
				console.error("Ошибка загрузки отдела:", err);
				showErrorToast("Ошибка загрузки данных отдела");
			} finally {
				setLoading(false);
			}
		};

		// Загружаем категории и департамент (если не в режиме создания)
		fetchCategories();
		fetchDepartment();
	}, [departmentId]);

	const isDirty = formName !== originalName || formCategories.length !== originalCategories.length || !formCategories.every((id) => originalCategories.includes(id));

	// Отслеживаем изменения в форме
	useEffect(() => {
		setIsFormChanged(isDirty);
	}, [isDirty, formName, formCategories, originalName, originalCategories]);

	const handleSave = async () => {
		if (!formName.trim()) {
			showErrorToast("Введите название отдела");
			return;
		}

		try {
			const method = "PATCH";
			const url = `/api/departments/${departmentId}`;

			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formName,
					categoryIds: formCategories,
				}),
				credentials: "include",
			});

			if (res.ok) {
				const updated = await res.json();

				setDepartment(updated);
				// После сохранения текущее состояние становится новым базовым состоянием
				setOriginalName(formName);
				setOriginalCategories([...formCategories]);
				showSuccessToast("Изменения сохранены");
			} else {
				const { error } = await res.json();
				showErrorToast(error || "Ошибка при сохранении");
			}
		} catch (err) {
			console.error(err);
			showErrorToast("Ошибка запроса");
		}
	};

	if (loading)
		return (
			<div className="screenContent borderBlock">
				<Loading />
			</div>
		);

	const isEditable = canEditDepartment();
	const pageTitle = department?.name || "Отдел";

	return (
		<div className="screenContent">
			{isEditable ? (
				<input value={formName} onChange={(e) => setFormName(e.target.value)} className={`${styles.screenTitle} screenTitle`} placeholder="Введите название отдела" />
			) : (
				<h1 className="screenTitle">{pageTitle}</h1>
			)}

			<div className={`sectionsContent ${styles.sectionsContent}`}>
				<DepartmentCategorySection
					categories={categories}
					formCategories={formCategories}
					setFormCategories={setFormCategories}
					department={department || { id: 0, name: "", allowedCategories: [], users: [], products: [], orders: [] }}
					isEditable={isEditable}
				/>

				{/* Показываем секцию сотрудников всегда */}
				<DepartmentStaffSection users={department?.users || []} isEditable={isEditable} />
			</div>

			{isEditable && isFormChanged && (
				<div className="fixedButtonsBlock">
					<div className="buttonsContent">
						<button onClick={handleSave} disabled={!isFormChanged} className={`acceptButton ${!isFormChanged ? "disabled" : ""}`}>
							<Check className="" />
							Сохранить
						</button>

						{isFormChanged && (
							<button
								onClick={() => {
									setFormName(originalName);
									setFormCategories(originalCategories);
									setIsFormChanged(false);
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
		</div>
	);
}
