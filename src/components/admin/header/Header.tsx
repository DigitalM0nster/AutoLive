// src/components/admin/header/Header.tsx

"use client";

import Loading from "@/components/ui/loading/Loading";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { useAuthStore } from "@/store/authStore";

export default function Header() {
	const router = useRouter();
	const { user, logout, initAuth } = useAuthStore();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		initAuth().finally(() => setLoading(false));
	}, []);

	const handleLogout = async () => {
		await fetch("/api/admin/auth/logout", { method: "POST" });
		logout();
		router.replace("/admin/login");
	};

	return (
		<header id="admin-header" className="fixed top-0 left-0 right-0 bg-white border-b shadow z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
				<div className="text-sm sm:text-base font-medium text-gray-800">
					{loading ? (
						<Loading />
					) : user ? (
						<div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => router.push("/admin/profile")}>
							<img src={user.avatar || "/images/user_placeholder.png"} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
							<span>
								{user.first_name || "Админ"} <span className="text-gray-500 text-sm">({user.role})</span>
							</span>
						</div>
					) : (
						<span>🔐 Войдите в свою учетную запись</span>
					)}
				</div>

				{!loading && user && (
					<button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded shadow text-sm">
						Выйти
					</button>
				)}
			</div>
			<Breadcrumbs />
		</header>
	);
}
