// src/components/admin/header/Header.tsx
"use client";

import Loading from "@/components/ui/loading/Loading";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { AdminData } from "@/lib/types";

export default function Header() {
	const router = useRouter();
	const pathname = usePathname();
	const [admin, setAdmin] = useState<AdminData | null>(null);
	const [loading, setLoading] = useState(true);
	const [loggingOut, setLoggingOut] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch("/api/admin/get-admin-data");
				if (res.ok) {
					const data = await res.json();
					setAdmin({
						first_name: data.first_name,
						last_name: data.last_name,
						avatar: data.avatar,
						role: data.role,
						id: data.id,
						phone: data.phone,
						permissions: data.permissions,
					});
				}
			} catch (e) {
				console.error("Ошибка при загрузке данных админа", e);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const handleLogout = async () => {
		setLoggingOut(true);
		await fetch("/api/admin/auth/logout", { method: "POST" });
		setAdmin(null);
		router.replace("/admin/login");
	};

	return (
		<header id="admin-header" className="fixed top-0 left-0 right-0 bg-white border-b shadow z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
				<div className="text-sm sm:text-base font-medium text-gray-800">
					{loading ? (
						<Loading />
					) : admin ? (
						<div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => router.push("/admin/profile")}>
							<img src={admin.avatar || "/images/user_placeholder.png"} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
							<span>
								{admin.first_name || "Админ"} <span className="text-gray-500 text-sm">({admin.role})</span>
							</span>
						</div>
					) : (
						<span>🔐 Войдите в свою учетную запись</span>
					)}
				</div>

				{!loading && admin && (
					<button onClick={handleLogout} disabled={loggingOut} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded shadow text-sm">
						{loggingOut ? "Выход..." : "Выйти"}
					</button>
				)}
			</div>
			<Breadcrumbs />
		</header>
	);
}
