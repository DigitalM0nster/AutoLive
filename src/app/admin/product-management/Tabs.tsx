// src\app\admin\product-management\Tabs.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function Tabs() {
	const [activeTab, setActiveTab] = useState();
	return (
		<>
			<div className="flex gap-4 border-b mb-4">
				<Link
					href="/admin/product-management/products"
					className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "products" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
				>
					Товары
				</Link>
				<Link
					href="/admin/product-management/pricelist"
					className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "pricelist" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
				>
					Прайс-листы
				</Link>
				<Link
					href="/admin/product-management/kits"
					className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "kits" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
				>
					Комплекты ТО
				</Link>
				<Link
					href="/admin/product-management/categories"
					className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "categories" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
				>
					Категории
				</Link>
			</div>
		</>
	);
}
