"use client";
import { useEffect, useState } from "react";
import ProductsList from "./local_components/productsList/ProductsList";
import ProductsUpload from "./local_components/productsUpload/ProductsUpload";
import UploadLogs from "./local_components/uploadLogs/UploadLogs";
import { useAuthStore } from "@/store/authStore";

const ProductTabsPage = () => {
	const [activeTab, setActiveTab] = useState<"products" | "pricelists">("products");
	const { user } = useAuthStore();

	useEffect(() => {
		if (user?.role === "manager") {
			setActiveTab("products");
		}
	}, []);

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
				</div>
			)}

			{activeTab === "pricelists" && (
				<>
					<ProductsUpload />
					<UploadLogs />
				</>
			)}

			{activeTab === "products" && (
				<>
					{user?.role === "manager" && <div className="text-3xl font-bold text-gray-800 mb-8">Список товаров</div>}
					<ProductsList />
				</>
			)}
		</div>
	);
};

export default ProductTabsPage;
