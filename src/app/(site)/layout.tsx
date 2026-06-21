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
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import SitePreloader from "@/components/site/preloader/SitePreloader";
import CookieConsent from "@/components/site/cookieConsent/CookieConsent";
import { onest, siteFontVariables } from "@/lib/siteFonts";
import ScrollToTop from "@/components/ScrollToTop/ScrollToTop";

export const metadata: Metadata = {
	title: `Главная | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Купите автозапчасти, материалы для ТО и записывайтесь на обслуживание в ${CONFIG.STORE_NAME}. Лучшие цены, доставка в ${CONFIG.CITY} и по всей России!`,
	keywords: `автозапчасти, техническое обслуживание, комплект ТО, купить запчасти ${CONFIG.CITY}, ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru" className={siteFontVariables}>
			<body className={onest.className}>
				<SiteSettingsProvider>
					<GlobalLoadingProvider>
						<ScrollToTop />
						<SitePreloader>
							<ToastProvider />
							<Header />
							{children}
							<Footer />
						</SitePreloader>
						<CookieConsent />
						<GlobalLoadingOverlay />
					</GlobalLoadingProvider>
				</SiteSettingsProvider>
			</body>
		</html>
	);
}
