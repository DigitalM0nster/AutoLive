// src\app\admin\product-management\products\import\page.tsx

"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import ProductsImport from "../local_components/productsImport/ProductsImport";

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
						<Link href="/admin/product-management/products/import" className={`tabButton active`}>
							Импорт товаров
						</Link>
						<Link href="/admin/product-management/products/logs" className={`tabButton`}>
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
					<Link href="/admin/product-management/products/import" className={`tabButton active`}>
						Импорт товаров
					</Link>
					<Link href="/admin/product-management/products/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>
				<ProductsImport user={user} />
			</div>
		</div>
	);
}
