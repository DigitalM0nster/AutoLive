// src\app\admin\layout.tsx

import "./globals.css";
import Footer from "@/components/admin/footer/Footer";
import Header from "@/components/admin/header/Header";
import React from "react";
import AdminPageWrapper from "./AdminPageWrapper";
import ToastManager from "@/components/ui/toast/ToastManager";

export const metadata = {
	title: "Админка",
	description: "Панель управления магазином автозапчастей",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<Header />
				<AdminPageWrapper>{children}</AdminPageWrapper>
				{/* <Footer /> */}
				<ToastManager />
			</body>
		</html>
	);
}
