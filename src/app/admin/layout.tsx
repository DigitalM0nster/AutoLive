// src\app\admin\layout.tsx

import Breadcrumbs from "@/components/admin/breadcrumbs/Breadcrumbs";
import "./globals.css";
import Footer from "@/components/admin/footer/Footer";
import Header from "@/components/admin/header/Header";
import React from "react";

export const metadata = {
	title: "Админка",
	description: "Панель управления магазином автозапчастей",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<html lang="ru">
				<body>
					<Header />
					<div className="pt-16">
						{/* отступ на высоту шапки */}
						<Breadcrumbs />
					</div>
					{children}
					<Footer />
				</body>
			</html>
		</>
	);
}
