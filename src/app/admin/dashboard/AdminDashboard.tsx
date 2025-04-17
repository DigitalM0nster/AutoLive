"use client";
import Link from "next/link";
import { Role } from "@/lib/rolesConfig";
import { adminRoutesMeta } from "@/lib/adminRoutesMeta";

// Определяем тип для секций
type Section = {
	href: string;
	label: string;
	description?: string;
	icon: React.ElementType;
	bg: string;
};

type Props = {
	user: {
		name: string;
		role: Role;
	};
};

export default function AdminDashboard({ user }: Props) {
	const sections: Section[] = ["departments", "users", "orders", "service-records", "content", "product-management"]
		.map((key): Section | null => {
			const meta = adminRoutesMeta[key];
			if (!meta || !meta.icon || !meta.bg) return null;
			return {
				href: `/admin/${key}`,
				label: meta.label,
				description: meta.description,
				icon: meta.icon,
				bg: meta.bg,
			};
		})
		// Функция type guard позволяет TypeScript понять, что null значений уже нет
		.filter((section): section is Section => section !== null);

	return (
		<div className="px-6 py-10 max-w-7xl mx-auto mb-auto">
			<div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				{sections.map(({ href, label, icon: Icon, bg, description }) => (
					<Link
						key={href}
						href={href}
						className="group relative p-6 rounded-2xl border border-black/10 bg-white/80 backdrop-blur shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white"
					>
						<div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-4 bg-gradient-to-br ${bg} text-white shadow-md`}>
							<Icon className="w-6 h-6" />
						</div>
						<h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition">{label}</h3>
						<p className="text-sm text-gray-500 mt-1">{description ? description : `Перейти в раздел “${label}”`}</p>

						{/* glow hover effect */}
						<div className="absolute inset-0 rounded-2xl bg-blue-100 opacity-0 group-hover:opacity-10 transition duration-300 pointer-events-none" />
					</Link>
				))}
			</div>
		</div>
	);
}
