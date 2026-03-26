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
	/** Ключ метаданных — для особой логики (счётчики) */
	routeKey: string;
};

type Props = {
	user: {
		name: string;
		role: Role;
	};
};

export default function AdminDashboard({ user }: Props) {
	const [ordersCounts, setOrdersCounts] = useState<{ unassignedCount: number; departmentCount: number } | null>(null);
	const [homepageNewCount, setHomepageNewCount] = useState<number | null>(null);

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

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const res = await fetch("/api/homepage-requests/count-new", { credentials: "include" });
				if (!res.ok) return;
				const data = await res.json();
				if (isMounted) setHomepageNewCount(typeof data.newCount === "number" ? data.newCount : 0);
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
	[
		"departments",
		"users",
		"orders",
		"product-management",
		"categories",
		"bookings",
		"booking-departments",
		"pickup-points",
		"homepage-requests",
		"content",
	].forEach((key) => {
		// Контент сайта — только суперадмин (совпадает с POST API и layout /admin/content)
		if (key === "content" && user.role !== "superadmin") return;

		const meta = adminRoutesMeta[key];
		if (!meta || !meta.icon || !meta.bg) return;
		const section: Section = {
			href: meta.href ?? `/admin/${key}`,
			label: meta.label,
			description: meta.description,
			icon: meta.icon,
			bg: meta.bg,
			routeKey: key,
		};
		if (sectionsByColor[meta.bg]) {
			sectionsByColor[meta.bg].push(section);
		}
	});

	// Красный ряд: «Заявки с главной» всегда перед «Контент сайта» (как в ТЗ)
	const redRowOrder = ["homepage-requests", "content"];
	sectionsByColor.red.sort((a, b) => {
		const ia = redRowOrder.indexOf(a.routeKey);
		const ib = redRowOrder.indexOf(b.routeKey);
		if (ia === -1 && ib === -1) return 0;
		if (ia === -1) return 1;
		if (ib === -1) return -1;
		return ia - ib;
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
					{row.sections.map(({ href, label, icon: Icon, bg, description, routeKey }) => (
						<Link key={href} href={href} className={`cardItem`}>
							<div className={`cardIcon ${bg}`}>
								<Icon />
							</div>
							<h3 className="cardTitle">{label}</h3>
							<p className="cardButton">{description ? description : `Перейти в раздел “${label}”`}</p>
							{routeKey === "orders" && ordersCounts && ordersCounts.unassignedCount + ordersCounts.departmentCount > 0 && (
								<div className="cardNewOrdersNumber">{ordersCounts.unassignedCount + ordersCounts.departmentCount}</div>
							)}
							{routeKey === "homepage-requests" && homepageNewCount != null && homepageNewCount > 0 && (
								<div className="cardNewOrdersNumber">{homepageNewCount}</div>
							)}
						</Link>
					))}
				</div>
			))}
		</div>
	);
}
