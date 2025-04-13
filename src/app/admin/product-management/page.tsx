"use client";

import Link from "next/link";
import { Package, ListOrdered, Wrench } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const allSections = [
	{
		href: "/admin/product-management/categories",
		label: "Категории",
		desc: "Создание и настройка категорий товаров",
		icon: ListOrdered,
		bg: "from-purple-400 to-purple-600",
		onlySuperadmin: true, // ← добавлено
	},
	{
		href: "/admin/product-management/products",
		label: "Товары",
		desc: "Добавление и редактирование товаров",
		icon: Package,
		bg: "from-blue-400 to-blue-600",
	},
	{
		href: "/admin/product-management/kits",
		label: "Комплекты ТО",
		desc: "Сборка наборов ТО из товаров",
		icon: Wrench,
		bg: "from-emerald-400 to-emerald-600",
	},
];

export default function ProductsDashboardPage() {
	const { user } = useAuthStore();

	const sections = allSections.filter((section) => {
		if (section.onlySuperadmin) {
			return user?.role === "superadmin";
		}
		return true;
	});

	return (
		<div className="px-6 py-10 max-w-7xl mx-auto mb-auto">
			<h1 className="text-3xl font-extrabold text-gray-900 mb-8">Управление товарами</h1>
			<div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{sections.map(({ href, label, desc, icon: Icon, bg }) => (
					<Link
						key={href}
						href={href}
						className="group relative p-6 rounded-2xl border border-black/10 bg-white/80 backdrop-blur shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white"
					>
						<div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-4 bg-gradient-to-br ${bg} text-white shadow-md`}>
							<Icon className="w-6 h-6" />
						</div>
						<h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">{label}</h3>
						<p className="text-sm text-gray-500 mt-1">{desc}</p>
						<div className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none" />
					</Link>
				))}
			</div>
		</div>
	);
}
