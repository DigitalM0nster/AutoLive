"use client";

import Link from "next/link";
import { Package, Wrench } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const allSections = [
	{
		href: "/admin/product-management/products",
		label: "Товары",
		desc: "Добавление и редактирование товаров",
		icon: Package,
		bgClass: "blue",
	},
	{
		href: "/admin/product-management/kits",
		label: "Комплекты ТО",
		desc: "Сборка наборов ТО из товаров",
		icon: Wrench,
		bgClass: "green",
	},
];

export default function ProductsDashboardPage() {
	const { user } = useAuthStore();

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabTitle">Управление товарами</div>
				</div>

				<div className="tableContent">
					<div className="cardsList">
						{allSections.map(({ href, label, desc, icon: Icon, bgClass }) => (
							<Link key={href} href={href} className="cardItem">
								<div className={`cardIcon ${bgClass}`}>
									<Icon size={24} />
								</div>
								<h3 className="cardTitle">{label}</h3>
								<p className="cardButton">{desc}</p>
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
