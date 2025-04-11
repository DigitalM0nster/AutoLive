"use client";
import { useState } from "react";
import ProductList from "./local_components/productList/ProductList";
import Pricelist from "./local_components/pricelist/Pricelist";
import PricelistLogs from "./local_components/pricelistLogs/PricelistLogs";

const ProductTabsPage = () => {
	const [activeTab, setActiveTab] = useState<"products" | "pricelists">("products");

	return (
		<div className="px-6 py-10 w-full max-w-7xl mx-auto mb-auto">
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

			{activeTab === "pricelists" && (
				<div>
					<Pricelist />
					<PricelistLogs />
				</div>
			)}

			{activeTab === "products" && (
				<div>
					<ProductList />
				</div>
			)}
		</div>
	);
};

export default ProductTabsPage;
