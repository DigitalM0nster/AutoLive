// src\app\layout.tsx

import "./index.scss";
import "./skeleton-styles.scss";
import Header from "@/components/user/header/Header";
import Footer from "@/components/user/footer/Footer";
import CONFIG from "@/lib/config";
import { Metadata } from "next";
import React from "react";
import GlobalLoadingProvider from "@/components/ui/loading/GlobalLoadingProvider";
import GlobalLoadingOverlay from "@/components/ui/loading/GlobalLoadingOverlay";
import ToastProvider from "@/components/ui/toast/ToastProvider";

export const metadata: Metadata = {
	title: `Главная | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Купите автозапчасти, материалы для ТО и записывайтесь на обслуживание в ${CONFIG.STORE_NAME}. Лучшие цены, доставка в ${CONFIG.CITY} и по всей России!`,
	keywords: `автозапчасти, техническое обслуживание, комплект ТО, купить запчасти ${CONFIG.CITY}, ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<GlobalLoadingProvider>
					<ToastProvider />
					<Header />
					{children}
					<Footer />
					<GlobalLoadingOverlay />
				</GlobalLoadingProvider>
			</body>
		</html>
	);
}
