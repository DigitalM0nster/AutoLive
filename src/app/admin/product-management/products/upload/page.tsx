// src\app\admin\product-management\products\upload\page.tsx

"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import ProductsUpload from "../local_components/productsUpload/ProductsUpload";

export default function ProductsUploadPage() {
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
						<Link href="/admin/product-management/products/logs" className={`tabButton`}>
							История действий
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
					{user?.role !== "manager" && (
						<Link href="/admin/product-management/products/upload" className={`tabButton active`}>
							Загрузка товаров
						</Link>
					)}
					<Link href="/admin/product-management/products/logs" className={`tabButton`}>
						История действий
					</Link>
				</div>
				<ProductsUpload user={user} />
			</div>
		</div>
	);
}
