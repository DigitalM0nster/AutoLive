// src\app\admin\product-management\items\local_components\productList\ProductTable.tsx

import { EditableProduct, Category } from "@/lib/types";
import ProductRow from "./ProductRow";
import { ArrowDown, ArrowUp, ArrowDownWideNarrow } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
	products: EditableProduct[];
	loading: boolean;
	sortBy: string;
	sortOrder: "asc" | "desc";
	handleSort: (column: string) => void;
	categories: Category[]; // добавили
};

export default function ProductTable({ products, loading, sortBy, sortOrder, handleSort, categories }: Props) {
	const renderSortIcon = (column: string) => {
		if (sortBy !== column) {
			return <ArrowDownWideNarrow size={14} className="inline-block text-gray-300 ml-1" />;
		}
		return sortOrder === "asc" ? <ArrowUp size={14} className="inline-block text-blue-600 ml-1" /> : <ArrowDown size={14} className="inline-block text-blue-600 ml-1" />;
	};
	const [localProducts, setLocalProducts] = useState(products);

	useEffect(() => {
		setLocalProducts(products);
	}, [products]);

	const handleProductUpdate = (updated: EditableProduct) => {
		setLocalProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
	};

	// Удаляем товар
	const handleProductDelete = async (id: string | number) => {
		if (id === "new") {
			setLocalProducts((prev) => prev.filter((p) => p.id !== "new"));
			return;
		}

		try {
			const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
			if (res.ok) {
				setLocalProducts((prev) => prev.filter((p) => p.id !== id));
			} else {
				alert("Ошибка при удалении");
			}
		} catch (err) {
			alert("Ошибка сети");
		}
	};

	// ✅ Добавим новый товар
	const handleAddProduct = () => {
		setLocalProducts((prev) => [
			...prev,
			{
				id: "new",
				title: "",
				sku: "",
				price: 0,
				brand: "",
				image: null,
				description: "",
				categoryId: undefined,
				categoryTitle: "—",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				filters: [],
				isEditing: true,
			},
		]);
	};

	if (loading) {
		return <p className="text-gray-500 text-sm">Загрузка товаров...</p>;
	}

	return (
		<>
			<table className="w-full table-fixed text-sm border border-black/10border-gray-300">
				<thead className="bg-gray-100 text-left">
					<tr>
						<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("brand")}>
							Бренд {renderSortIcon("brand")}
						</th>
						<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("sku")}>
							Артикул {renderSortIcon("sku")}
						</th>
						<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("title")}>
							Название {renderSortIcon("title")}
						</th>
						<th className="border border-black/10 px-2 py-1 cursor-default w-1/6">Описание</th>

						<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("price")}>
							Цена {renderSortIcon("price")}
						</th>
						<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("categoryTitle")}>
							Категория {renderSortIcon("categoryTitle")}
						</th>
						<th className="border border-black/10 px-2 py-1 text-center w-1/6">Изображение</th>
						<th className="border border-black/10 px-2 py-1 text-center w-1/6">Действия</th>
					</tr>
				</thead>

				<tbody>
					{localProducts.length > 0 ? (
						localProducts.map((product) => (
							<ProductRow
								key={product.id}
								product={product}
								categories={categories}
								onUpdate={handleProductUpdate}
								onDelete={handleProductDelete} // 👈
							/>
						))
					) : (
						<tr>
							<td colSpan={7} className="text-center text-gray-400 py-4">
								Ничего не найдено
							</td>
						</tr>
					)}
				</tbody>
			</table>
			<div className="flex justify-end mb-2">
				<button onClick={handleAddProduct} className="text-sm text-green-600 hover:underline border border-green-600 px-3 py-1 rounded">
					+ Добавить товар
				</button>
			</div>
		</>
	);
}
