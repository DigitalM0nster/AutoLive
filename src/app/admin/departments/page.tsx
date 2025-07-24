"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Building2 } from "lucide-react";
import Loading from "@/components/ui/loading/Loading";

type Department = {
	id: number;
	name: string;
};

export default function DepartmentsDashboardPage() {
	const { user } = useAuthStore();
	const router = useRouter();
	const [departments, setDepartments] = useState<Department[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;

		// Загрузка отделов для всех ролей
		const fetchDepartments = async () => {
			try {
				setLoading(true);
				const res = await fetch("/api/departments", { credentials: "include" });
				const data = await res.json();
				setDepartments(data);
			} catch (error) {
				console.error("Ошибка загрузки отделов", error);
			} finally {
				setLoading(false);
			}
		};

		fetchDepartments();
	}, [user]);

	if (!user) return null;
	if (loading)
		return (
			<div className="screenContent">
				<Loading />
			</div>
		);

	return (
		<div className="screenContent">
			<div className="titleBlock">
				<h1 className="screenTitle">Управление отделами</h1>
			</div>

			<div className="cardsList">
				{departments.map((dept) => (
					<Link key={dept.id} href={`/admin/departments/${dept.id}`} className="cardItem">
						<div className={`cardIcon indigo`}>
							<Building2 className="w-7 h-7" />
						</div>
						<div>
							<h3 className="cardTitle">{dept.name}</h3>
							<p className="cardButton">Нажмите, чтобы перейти</p>
						</div>
					</Link>
				))}
			</div>
			{user.role === "superadmin" && (
				<div className="createContainer">
					<Link href="/admin/departments/create" className="button createButton">
						+ Создать отдел
					</Link>
				</div>
			)}
		</div>
	);
}
