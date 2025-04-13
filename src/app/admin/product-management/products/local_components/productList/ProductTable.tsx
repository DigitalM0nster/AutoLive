// src\app\admin\product-management\items\local_components\productList\ProductTable.tsx

import { EditableProduct, Category } from "@/lib/types";
import ProductRow from "./ProductRow";
import { ArrowDown, ArrowUp, ArrowDownWideNarrow } from "lucide-react";
import { useEffect, useState } from "react";
import React from "react"; // Импорт React
import { User } from "@/lib/types";

type Props = {
	products: EditableProduct[];
	loading: boolean;
	sortBy: string;
	sortOrder: "asc" | "desc";
	handleSort: (column: string) => void;
	categories: Category[];
	onProductUpdate: (updated: EditableProduct) => void;
	user?: User | null;
};

const ProductTable = React.memo(({ products, loading, sortBy, sortOrder, handleSort, categories, user, onProductUpdate }: Props) => {
	const renderSortIcon = (column: string) => {
		if (sortBy !== column) {
			return <ArrowDownWideNarrow size={14} className="inline-block text-gray-300 ml-1" />;
		}
		return sortOrder === "asc" ? <ArrowUp size={14} className="inline-block text-blue-600 ml-1" /> : <ArrowDown size={14} className="inline-block text-blue-600 ml-1" />;
	};

	// Следим за изменениями пропсов, чтобы обновлять только когда это необходимо
	const [localProducts, setLocalProducts] = useState(products);

	useEffect(() => {
		setLocalProducts(products);
	}, [products]); // Обновляем локальные данные только при изменении товаров

	// ОБНОВЛЯЕМ ТОВАР
	const handleProductUpdate = (updated: EditableProduct) => {
		setLocalProducts((prev) => {
			// если новый товар ("new"), удалим его и добавим обновлённый
			if (typeof updated.id === "number") {
				return prev.filter((p) => p.id !== "new" && p.id !== updated.id).concat(updated);
			}
			return prev;
		});
		onProductUpdate(updated);
	};

	// Удаляем товар
	const handleProductDelete = (id: string | number) => {
		if (id === "new") {
			setLocalProducts((prev) => prev.filter((p) => p.id !== "new"));
			return;
		}
		setLocalProducts((prev) => prev.filter((p) => p.id !== id));
	};

	// ✅ Добавим новый товар
	const handleAddProduct = () => {
		const newProduct: EditableProduct = {
			id: "new",
			title: "",
			sku: "",
			price: 0,
			brand: "",
			image: null,
			description: "",
			categoryId: null,
			categoryTitle: "—",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			filters: [],
			isEditing: true,
		};

		setLocalProducts((prev) => [newProduct, ...prev]);
	};

	if (loading) {
		return <p className="text-gray-500 text-sm">Загрузка товаров...</p>;
	}

	return (
		<>
			<button onClick={handleAddProduct} className="text-sm text-green-600 hover:underline border border-green-600 px-3 py-1 rounded">
				+ Добавить товар
			</button>
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
						{user?.role === "superadmin" && <th className="border border-black/10 px-2 py-1 cursor-default w-1/6">Отдел</th>}

						<th className="border border-black/10 px-2 py-1 text-center w-1/6">Действия</th>
					</tr>
				</thead>

				<tbody>
					{localProducts.length > 0 ? (
						localProducts.map((product) => (
							<ProductRow
								key={`${product.id}-${product.updatedAt}`}
								product={product}
								categories={categories}
								onUpdate={handleProductUpdate}
								onDelete={handleProductDelete}
								user={user}
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
			<div className="flex justify-end mb-2"></div>
		</>
	);
});

// Мемоизированный компонент
export default ProductTable;
