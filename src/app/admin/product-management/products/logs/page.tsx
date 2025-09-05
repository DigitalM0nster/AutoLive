// src\app\admin\product-management\products\logs\page.tsx

"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import AllProductsLogsComponent from "../local_components/allProductsLogs/AllProductsLogsComponent";

export default function ProductsLogsPage() {
	const { user } = useAuthStore();

	// Проверяем, что пользователь авторизован
	if (!user) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						<Link href="/admin/product-management/products" className={`tabButton`}>
							Список товаров
						</Link>
						<Link href="/admin/product-management/products/upload" className={`tabButton`}>
							Загрузка товаров
						</Link>
						<Link href="/admin/product-management/products/logs" className={`tabButton active`}>
							История изменений
						</Link>
					</div>
					<div>Пользователь не авторизован</div>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/product-management/products" className={`tabButton`}>
						Список товаров
					</Link>
					<Link href="/admin/product-management/products/import" className={`tabButton`}>
						Импорт товаров
					</Link>
					<Link href="/admin/product-management/products/logs" className={`tabButton active`}>
						История действий
					</Link>
				</div>
				<AllProductsLogsComponent />
			</div>
		</div>
	);
}
