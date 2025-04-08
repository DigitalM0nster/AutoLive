"use client";
import { useState } from "react";
import ImportPricelist from "./local_components/importPricelist/ImportPricelist";
import ProductList from "./local_components/productList/ProductList";
import ImportLogs from "./local_components/importLogs/ImportLogs";

const ProductTabsPage = () => {
	const [activeTab, setActiveTab] = useState<"products" | "pricelists">("products");

	return (
		<div className="p-4">
			<div className="flex gap-4 border-b mb-4">
				<button
					onClick={() => setActiveTab("products")}
					className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "products" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
				>
					Товары
				</button>
				<button
					onClick={() => setActiveTab("pricelists")}
					className={`pb-2 px-4 border-b-2 transition-all ${activeTab === "pricelists" ? "border-black font-semibold" : "border-transparent text-gray-500"}`}
				>
					Прайс-листы
				</button>
			</div>

			{activeTab === "pricelists" && (
				<div>
					<ImportPricelist />
					<ImportLogs />
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
