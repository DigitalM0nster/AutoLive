// src\app\admin\layout.tsx

import "./globals.css";
import Footer from "@/components/admin/footer/Footer";
import Header from "@/components/admin/header/Header";
import React from "react";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import AdminPageWrapper from "./AdminPageWrapper";

export const metadata = {
	title: "Админка",
	description: "Панель управления магазином автозапчастей",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<ToastProvider>
					<Header />
					<AdminPageWrapper>{children}</AdminPageWrapper>
					<Footer />
				</ToastProvider>
			</body>
		</html>
	);
}
