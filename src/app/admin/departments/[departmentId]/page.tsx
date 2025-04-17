"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import DepartmentTitleSettings from "./local_components/DepartmentTitleSettings";
import DepartmentCategorySection from "./local_components/DepartmentCategorySection";
import DepartmentStaffSection from "./local_components/DepartmentStaffSection";
import { Category } from "@/lib/types";
import { Check, X } from "lucide-react";

type Department = {
	id: number;
	name: string;
	allowedCategories: { category: Category }[];
	users: { id: number; first_name: string; last_name: string; phone: string; role: string }[];
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

	return (
		<div className="px-6 py-10 max-w-5xl mx-auto">
			<DepartmentTitleSettings formName={formName} setFormName={setFormName} />
			<DepartmentCategorySection categories={categories} formCategories={formCategories} setFormCategories={setFormCategories} department={department} />
			<DepartmentStaffSection users={department.users} />
			{(user?.role === "superadmin" || user?.role === "admin") && (
				<div className="flex items-center gap-2 mb-10">
					<button
						onClick={handleSave}
						disabled={!isDirty}
						className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition ${
							isDirty ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
						}`}
					>
						<Check className="w-4 h-4" />
						Сохранить
					</button>
					{isDirty && (
						<button
							onClick={() => {
								setFormName(originalName);
								setFormCategories(originalCategories);
							}}
							className="flex items-center gap-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm hover:bg-gray-400 transition"
						>
							<X className="w-4 h-4" />
							Отменить
						</button>
					)}
				</div>
			)}
		</div>
	);
}
