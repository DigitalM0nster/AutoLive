"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Building2 } from "lucide-react";

type Department = {
	id: number;
	name: string;
};

export default function DepartmentsDashboardPage() {
	const { user } = useAuthStore();
	const router = useRouter();
	const [departments, setDepartments] = useState<Department[]>([]);

	useEffect(() => {
		if (!user) return;

		if (user.role === "admin" || user.role === "manager") {
			if (user.department) {
				router.replace(`/admin/departments/${user.department?.id}`);
			}
			return;
		}

		// загрузка отделов только для суперадмина
		const fetchDepartments = async () => {
			try {
				const res = await fetch("/api/departments", { credentials: "include" });
				const data = await res.json();
				setDepartments(data);
			} catch (error) {
				console.error("Ошибка загрузки отделов", error);
			}
		};

		fetchDepartments();
	}, [user, router]);

	if (!user || user.role !== "superadmin") return null;

	return (
		<div className="px-6 py-10 max-w-7xl mx-auto mb-auto">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold text-gray-800">Управление отделами</h1>
				<Link href="/admin/departments/create" className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
					+ Добавить отдел
				</Link>
			</div>

			<div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto">
				{departments.map((dept) => (
					<Link
						key={dept.id}
						href={`/admin/departments/${dept.id}`}
						className="group relative flex flex-col justify-between p-6 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-white"
					>
						<div className="flex items-center gap-4">
							<div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md">
								<Building2 className="w-7 h-7" />
							</div>
							<div>
								<h3 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition">{dept.name}</h3>
								<p className="text-sm text-gray-500">Нажмите, чтобы перейти</p>
							</div>
						</div>

						<div className="absolute inset-0 rounded-2xl bg-indigo-100 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none" />
					</Link>
				))}
			</div>
		</div>
	);
}
