import "./globals.scss";
import Header from "@/components/admin/header/Header";
import React from "react";
import ToastProvider from "@/components/ui/toast/ToastProvider";
import GlobalLoadingProvider from "@/components/ui/loading/GlobalLoadingProvider";
import GlobalLoadingOverlay from "@/components/ui/loading/GlobalLoadingOverlay";
import ScrollToTop from "@/components/ScrollToTop/ScrollToTop";
import AdminTableDragScroll from "@/components/admin/AdminTableDragScroll";

export const metadata = {
	title: "Административная панель",
	description: "Панель управления магазином автозапчастей",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<GlobalLoadingProvider>
					<ScrollToTop />
					<AdminTableDragScroll />
					<Header />
					<div className="screen">{children}</div>
					<ToastProvider />
					<GlobalLoadingOverlay />
				</GlobalLoadingProvider>
			</body>
		</html>
	);
}
