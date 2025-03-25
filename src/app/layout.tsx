import Header from "@/components/header/Header";
import "./index.scss";
import Footer from "@/components/footer/Footer";
import CONFIG from "@/lib/config";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
	title: `Главная | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Купите автозапчасти, материалы для ТО и записывайтесь на обслуживание в ${CONFIG.STORE_NAME}. Лучшие цены, доставка в ${CONFIG.CITY} и по всей России!`,
	keywords: `автозапчасти, техническое обслуживание, комплект ТО, купить запчасти ${CONFIG.CITY}, ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<Header />
				{children}
				<Footer />
			</body>
		</html>
	);
}
