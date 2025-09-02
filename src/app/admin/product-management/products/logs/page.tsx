// src\app\admin\product-management\products\logs\page.tsx

"use client";

import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import UploadLogs from "../local_components/productsLogs/ProductsLogs";

export default function ProductsLogsPage() {
	const { user } = useAuthStore();

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
				<UploadLogs user={user} />
			</div>
		</div>
	);
}
