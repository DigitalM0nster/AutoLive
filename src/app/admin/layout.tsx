import "./globals.css";
import Header from "@/components/admin/header/Header";
import React from "react";
import AdminPageWrapper from "./AdminPageWrapper";
import ToastManager from "@/components/ui/toast/ToastManager";

export const metadata = {
	title: "Админка",
	description: "Панель управления магазином автозапчастей",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	let dbIsAlive = true;

	try {
		const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/health/database`, {
			cache: "no-store",
		});
		if (!res.ok) dbIsAlive = false;
	} catch (error) {
		dbIsAlive = false;
	}

	if (!dbIsAlive) {
		return (
			<html lang="ru">
				<body>
					<div className="p-8 text-center">
						<h1 className="text-2xl font-bold text-red-600">Ошибка подключения к базе данных</h1>
						<p className="mt-4 text-gray-700">Попробуйте позже или обратитесь к администратору.</p>
					</div>
				</body>
			</html>
		);
	}

	return (
		<html lang="ru">
			<body>
				<Header />
				<AdminPageWrapper>{children}</AdminPageWrapper>
				<ToastManager />
			</body>
		</html>
	);
}
