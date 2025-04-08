// src/app/admin/products/items/page.tsx

import ImportPricelist from "./local_components/importPricelist/ImportPricelist";
import ProductList from "./local_components/productList/ProductList";

export default function ItemsPage() {
	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold mb-4">Товары</h1>
			<ImportPricelist />
			<ProductList />
		</div>
	);
}
