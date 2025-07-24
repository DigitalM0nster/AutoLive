"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import DepartmentCategorySection from "./local_components/DepartmentCategorySection";
import DepartmentStaffSection from "./local_components/DepartmentStaffSection";
import { Category, User } from "@/lib/types";
import { Check, X } from "lucide-react";
import styles from "./local_components/styles.module.scss";

type Department = {
	id: number;
	name: string;
	allowedCategories: { category: Category }[];
	users: User[];
	products: { id: number; title: string; sku: string; brand: string; price: number }[];
	orders: { id: number; title: string; status: string; createdAt: string }[];
};

export default function DepartmentPage() {
	const { departmentId } = useParams();
	const { user } = useAuthStore();

	const [department, setDepartment] = useState<Department | null>(null);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

	const [formName, setFormName] = useState("");
	const [formCategories, setFormCategories] = useState<number[]>([]);

	const [originalName, setOriginalName] = useState("");
	const [originalCategories, setOriginalCategories] = useState<number[]>([]);

	// Проверка, может ли пользователь редактировать этот отдел
	const canEditDepartment = () => {
		if (!user || !department) return false;

		// Суперадмин может редактировать любой отдел
		if (user.role === "superadmin") return true;

		// Админ может редактировать только свой отдел
		if (user.role === "admin" && user.department?.id === Number(departmentId)) {
			return true;
		}

		return false;
	};

	useEffect(() => {
		const fetchDepartment = async () => {
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

		const fetchCategories = async () => {
			try {
				const res = await fetch("/api/categories", { credentials: "include" });
				const data = await res.json();
				setCategories(data);
			} catch (err) {
				console.error("Ошибка загрузки категорий:", err);
			}
		};

		if (departmentId) {
			fetchDepartment();
			fetchCategories();
		}
	}, [departmentId]);

	const isDirty = formName !== originalName || formCategories.length !== originalCategories.length || !formCategories.every((id) => originalCategories.includes(id));

	const handleSave = async () => {
		try {
			const res = await fetch(`/api/departments/${departmentId}`, {
				method: "PATCH",
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
				setOriginalName(updated.name);
				setOriginalCategories(updated.allowedCategories.map((a: any) => a.category.id));
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

	if (loading) return <div className="p-6">Загрузка...</div>;
	if (!department) return <div className="p-6 text-red-500">Отдел не найден</div>;

	const isEditable = canEditDepartment();

	return (
		<div className="screenContent">
			{isEditable ? <input value={formName} onChange={(e) => setFormName(e.target.value)} className="screenTitle" /> : <h1 className="screenTitle">{department.name}</h1>}
			<div className={`sectionsContent ${styles.sectionsContent}`}>
				<DepartmentCategorySection
					categories={categories}
					formCategories={formCategories}
					setFormCategories={setFormCategories}
					department={department}
					isEditable={isEditable}
				/>
				<DepartmentStaffSection users={department.users} isEditable={isEditable} />
			</div>
			{isEditable && isDirty && (
				<div className="fixedButtonsBlock">
					<div className="buttonsContent">
						<button onClick={handleSave} disabled={!isDirty} className={`acceptButton ${isDirty ? "" : "disabled"}`}>
							<Check className="" />
							Сохранить
						</button>
						{isDirty && (
							<button
								onClick={() => {
									setFormName(originalName);
									setFormCategories(originalCategories);
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
