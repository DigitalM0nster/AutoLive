// components/admin/header/Header.tsx
"use client";

import Loading from "@/components/loading/Loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminData = {
	name: string;
	role: string;
};

export default function Header() {
	const router = useRouter();
	const [admin, setAdmin] = useState<AdminData | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch("/api/admin/get-admin-data");
				if (res.ok) {
					const data = await res.json();
					setAdmin({ name: data.name, role: data.role });
				}
			} catch (e) {
				console.error("Ошибка при загрузке данных админа", e);
			}
		};
		load();
	}, []);

	const handleLogout = async () => {
		setLoading(true);
		await fetch("/api/admin/auth/logout", { method: "POST" });
		router.push("/admin/login");
	};

	return (
		<header className="fixed top-0 left-0 right-0 bg-white border-b shadow z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
				<div className="text-sm sm:text-base font-semibold text-gray-800">
					{admin ? (
						<span>
							👋 Здравствуйте, <span className="text-blue-600">{admin.name}</span> ({admin.role})
						</span>
					) : (
						<Loading />
					)}
				</div>
				<button onClick={handleLogout} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded shadow text-sm">
					{loading ? "Выход..." : "Выйти"}
				</button>
			</div>
		</header>
	);
}
