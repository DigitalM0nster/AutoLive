// src/app/admin/products/items/page.tsx

import ImportPricelist from "./components/importPricelist/ImportPricelist";

export default function ItemsPage() {
	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold mb-4">Товары</h1>
			<ImportPricelist />
			<p className="text-gray-600">Здесь будет список товаров, возможность добавить и редактировать каждый товар.</p>
		</div>
	);
}
