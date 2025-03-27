// src\components\admin\dashboard\adminDashboard.tsx

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Role } from "@/lib/rolesConfig";
import { Users, ShoppingCart, Wrench, FileText, Package } from "lucide-react";

type Props = {
	user: {
		name: string;
		role: Role;
	};
};

export default function AdminDashboard({ user }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleLogout = async () => {
		setLoading(true);
		await fetch("/api/admin/auth/logout", {
			method: "POST",
		});
		router.push("/admin/login");
	};

	const sections = [
		{
			href: "/admin/users",
			label: "Пользователи",
			icon: Users,
			bg: "from-indigo-400 to-indigo-600",
		},
		{
			href: "/admin/orders",
			label: "Заказы",
			icon: ShoppingCart,
			bg: "from-emerald-400 to-emerald-600",
		},
		{
			href: "/admin/service-records",
			label: "Записи на ТО",
			icon: Wrench,
			bg: "from-yellow-400 to-yellow-600",
		},
		{
			href: "/admin/content",
			label: "Контент сайта",
			icon: FileText,
			bg: "from-pink-400 to-pink-600",
		},
		{
			href: "/admin/products",
			label: "Товары",
			icon: Package,
			bg: "from-sky-400 to-sky-600",
		},
	];

	return (
		<div className="px-6 py-10 max-w-7xl mx-auto">
			<div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{sections.map(({ href, label, icon: Icon, bg }) => (
					<Link
						key={href}
						href={href}
						className="group relative p-6 rounded-2xl border bg-white/80 backdrop-blur shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white"
					>
						<div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-4 bg-gradient-to-br ${bg} text-white shadow-md`}>
							<Icon className="w-6 h-6" />
						</div>
						<h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">{label}</h3>
						<p className="text-sm text-gray-500 mt-1">Перейти в раздел “{label}”</p>

						{/* glow hover effect */}
						<div className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none" />
					</Link>
				))}
			</div>
		</div>
	);
}
