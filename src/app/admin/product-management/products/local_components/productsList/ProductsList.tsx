"use client";

import React from "react";
import ProductsFilterPanel from "./productsFilter/ProductsFilterPanel";
import ProductsTable from "./productsTable/ProductsTable";

export default function ProductsList() {
	return (
		<div className="mt-8">
			{/* самодостаточный фильтр */}
			<ProductsFilterPanel />

			{/* самодостаточная таблица (берёт продукты, сортировку и все экшны из Zustand) */}
			<ProductsTable />
		</div>
	);
}
