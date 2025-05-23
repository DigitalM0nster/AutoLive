// src/app/admin/product-management/products/page.tsx

"use client";

import { useEffect, useState } from "react";
import ProductsList from "./local_components/productsList/ProductsList";
import ProductsUpload from "./local_components/productsUpload/ProductsUpload";
import UploadLogs from "./local_components/productsLogs/ProductsLogs";
import { useAuthStore } from "@/store/authStore";

const ProductTabsPage = () => {
	const [activeTab, setActiveTab] = useState<"products" | "pricelists" | "logs">("products");
	const { user } = useAuthStore();

	useEffect(() => {
		if (user?.role === "manager") {
			setActiveTab("products");
		}
	}, [user]);

	return (
		<div className="px-6 py-10 w-full max-w-7xl mx-auto mb-auto">
			{user?.role !== "manager" && (
				<div className="flex gap-4 border-b mb-4">
					<button
						onClick={() => setActiveTab("products")}
						className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "products" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
					>
						Список товаров
					</button>
					<button
						onClick={() => setActiveTab("pricelists")}
						className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "pricelists" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
					>
						Загрузка товаров
					</button>
					<button
						onClick={() => setActiveTab("logs")}
						className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "logs" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
					>
						История действий
					</button>
				</div>
			)}

			{activeTab === "products" && (
				<>
					{user?.role === "manager" && <div className="text-3xl font-bold text-gray-800 mb-8">Список товаров</div>}
					<ProductsList />
				</>
			)}

			{user?.role !== "manager" && activeTab === "pricelists" && user && <ProductsUpload user={user} />}

			{user?.role !== "manager" && activeTab === "logs" && <UploadLogs />}
		</div>
	);
};

export default ProductTabsPage;
