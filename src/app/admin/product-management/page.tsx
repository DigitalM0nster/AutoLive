"use client";

import Link from "next/link";
import { Package, ListOrdered, Wrench } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import styles from "./styles.module.scss";

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
		<>
			<div className={`screenContent ${styles.screenContent}`}>
				<div className={`tableContainer ${styles.tableContainer}`}>
					<div className={`tabsContainer ${styles.tabsContainer}`}>
						<div className="tabTitle">Управление товарами</div>
					</div>

					<div className={`tableContent ${styles.tableContent}`}>
						<div className={`cardsList`}>
							{allSections.map(({ href, label, desc, icon: Icon, bgClass }) => (
								<Link key={href} href={href} className={`cardItem ${styles.cardItem}`}>
									<div className={`cardIcon ${bgClass}`}>
										<Icon className={styles.icon} />
									</div>
									<h3 className="cardTitle">{label}</h3>
									<p className="cardButton">{desc}</p>
									<div className="hoverOverlay" />
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
