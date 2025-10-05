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
	const sections: Section[] = ["departments", "users", "orders", "bookings", "categories", "content", "product-management"]
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
		<div className="screenContent">
			<div className="cardsList">
				{sections.map(({ href, label, icon: Icon, bg, description }) => (
					<Link key={href} href={href} className={`cardItem`}>
						<div className={`cardIcon ${bg}`}>
							<Icon />
						</div>
						<h3 className="cardTitle">{label}</h3>
						<p className="cardButton">{description ? description : `Перейти в раздел “${label}”`}</p>
					</Link>
				))}
			</div>
		</div>
	);
}
