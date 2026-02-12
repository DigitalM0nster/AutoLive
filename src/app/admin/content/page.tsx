"use client";

import Link from "next/link";
import { Home, MapPin, Percent } from "lucide-react";
import styles from "./local_components/styles.module.scss";

const contentSections = [
	{
		href: "/admin/content/homepage",
		label: "Главная страница",
		description: "Редактировать раздел «Главная страница»",
		icon: Home,
		iconBg: "blue",
	},
	{
		href: "/admin/content/contacts",
		label: "Контакты",
		description: "Редактировать раздел «Контакты»",
		icon: MapPin,
		iconBg: "green",
	},
	{
		href: "/admin/content/promotions",
		label: "Акции",
		description: "Редактировать раздел «Акции»",
		icon: Percent,
		iconBg: "red",
	},
];

export default function AdminContentPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabTitle">Редактирование контента сайта</div>
				</div>
				<div className="tableContent">
					<div className="cardsList">
						{contentSections.map(({ href, label, description, icon: Icon, iconBg }) => (
							<Link key={href} href={href} className="cardItem">
								<div className={`cardIcon ${iconBg}`}>
									<Icon size={24} />
								</div>
								<h3 className="cardTitle">{label}</h3>
								<p className="cardButton">{description}</p>
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
