"use client";
import React, { useEffect, useState } from "react";
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
	const [ordersCounts, setOrdersCounts] = useState<{ unassignedCount: number; departmentCount: number } | null>(null);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const res = await fetch("/api/orders/count-new-orders", { credentials: "include" });
				if (!res.ok) return;
				const data = await res.json();
				if (isMounted) setOrdersCounts({ unassignedCount: data.unassignedCount ?? 0, departmentCount: data.departmentCount ?? 0 });
			} catch {}
		})();
		return () => {
			isMounted = false;
		};
	}, []);
	// Группируем секции по цветам для отображения по строкам
	const sectionsByColor: Record<string, Section[]> = {
		green: [],
		blue: [],
		purple: [],
		red: [],
	};

	// Собираем все секции и группируем их по цветам
	// Порядок в массиве определяет порядок отображения карточек в каждой строке
	["departments", "users", "orders", "product-management", "categories", "bookings", "booking-departments", "content"].forEach((key) => {
		const meta = adminRoutesMeta[key];
		if (!meta || !meta.icon || !meta.bg) return;
		const section: Section = {
			href: `/admin/${key}`,
			label: meta.label,
			description: meta.description,
			icon: meta.icon,
			bg: meta.bg,
		};
		if (sectionsByColor[meta.bg]) {
			sectionsByColor[meta.bg].push(section);
		}
	});

	// Определяем порядок строк
	const rows = [
		{ color: "green", sections: sectionsByColor.green },
		{ color: "blue", sections: sectionsByColor.blue },
		{ color: "purple", sections: sectionsByColor.purple },
		{ color: "red", sections: sectionsByColor.red },
	];

	return (
		<div className="screenContent">
			{rows.map((row, rowIndex) => (
				<div key={rowIndex} className="cardsList">
					{row.sections.map(({ href, label, icon: Icon, bg, description }) => (
						<Link key={href} href={href} className={`cardItem`}>
							<div className={`cardIcon ${bg}`}>
								<Icon />
							</div>
							<h3 className="cardTitle">{label}</h3>
							<p className="cardButton">{description ? description : `Перейти в раздел “${label}”`}</p>
							{href === "/admin/orders" && ordersCounts && ordersCounts.unassignedCount + ordersCounts.departmentCount > 0 && (
								<div className="cardNewOrdersNumber">{ordersCounts.unassignedCount + ordersCounts.departmentCount}</div>
							)}
						</Link>
					))}
				</div>
			))}
		</div>
	);
}
