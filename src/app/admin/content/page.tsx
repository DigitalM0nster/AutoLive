// src/app/admin/content/page.tsx
"use client";

import Link from "next/link";
import { FileText, Home, MapPin, Percent } from "lucide-react";

const contentSections = [
	{
		href: "/admin/content/homepage",
		label: "Главная страница",
		icon: Home,
		bg: "from-blue-400 to-blue-600",
	},
	{
		href: "/admin/content/contacts",
		label: "Контакты",
		icon: MapPin,
		bg: "from-green-400 to-green-600",
	},
	{
		href: "/admin/content/promotions",
		label: "Акции",
		icon: Percent,
		bg: "from-rose-400 to-rose-600",
	},
];

export default function AdminContentPage() {
	return (
		<div className="px-6 py-10 max-w-7xl mx-auto">
			<h1 className="text-3xl font-bold text-gray-800 mb-8">Редактирование контента сайта</h1>
			<div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{contentSections.map(({ href, label, icon: Icon, bg }) => (
					<Link
						key={href}
						href={href}
						className="group relative p-6 rounded-2xl border border-black/10 bg-white/80 backdrop-blur shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white"
					>
						<div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-4 bg-gradient-to-br ${bg} text-white shadow-md`}>
							<Icon className="w-6 h-6" />
						</div>
						<h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">{label}</h3>
						<p className="text-sm text-gray-500 mt-1">Редактировать раздел “{label}”</p>

						{/* glow hover effect */}
						<div className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none" />
					</Link>
				))}
			</div>
		</div>
	);
}
