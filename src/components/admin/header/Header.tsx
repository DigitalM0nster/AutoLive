// src/components/admin/header/Header.tsx
"use client";

import Loading from "@/components/ui/loading/Loading";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";

type AdminData = {
	name: string;
	role: string;
};

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
					setAdmin({ name: data.name, role: data.role });
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
				<div className="text-sm sm:text-base font-semibold text-gray-800">
					{loading ? (
						<Loading />
					) : admin ? (
						<span>
							👋 Здравствуйте,{" "}
							<span className="text-blue-600 hover:underline cursor-pointer" onClick={() => router.push("/admin/profile")}>
								{admin.name}
							</span>{" "}
							({admin.role})
						</span>
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
