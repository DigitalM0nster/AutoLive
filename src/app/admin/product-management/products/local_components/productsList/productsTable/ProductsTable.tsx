// src\app\admin\product-management\products\local_components\productsList\ProductsTable.tsx

import { EditableProduct, Category, Product } from "@/lib/types";
import ProductRow from "./productRow/ProductRow";
import { ArrowDown, ArrowUp, ArrowDownWideNarrow } from "lucide-react";
import { useEffect, useState } from "react";
import React from "react"; // Импорт React
import { User } from "@/lib/types";
import DuplicateProductModal from "./DuplicateProductModal";
import ConfirmModal from "@/components/ui/confirmModal/ConfirmModal";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/ToastProvider";

type Props = {
	products: EditableProduct[];
	selectedProductIds: (number | string)[];
	setSelectedProductIds: React.Dispatch<React.SetStateAction<(number | string)[]>>;
	loading: boolean;
	sortBy: string;
	sortOrder: "asc" | "desc";
	handleSort: (column: string) => void;
	categories: Category[];
	departments: { id: number; name: string }[];
	onProductUpdate: (updated: EditableProduct) => void;
	user?: User | null;
	toEditableProduct: (product: Product | EditableProduct) => EditableProduct;
	toProductForm: (product: EditableProduct) => any;
};

const ProductsTable = React.memo(
	({
		products,
		selectedProductIds,
		setSelectedProductIds,
		loading,
		sortBy,
		sortOrder,
		handleSort,
		categories,
		departments,
		user,
		onProductUpdate,
		toEditableProduct,
		toProductForm,
	}: Props) => {
		const renderSortIcon = (column: string) => {
			if (sortBy !== column) {
				return <ArrowDownWideNarrow size={14} className="inline-block text-gray-300 ml-1" />;
			}
			return sortOrder === "asc" ? <ArrowUp size={14} className="inline-block text-blue-600 ml-1" /> : <ArrowDown size={14} className="inline-block text-blue-600 ml-1" />;
		};

		const [duplicateProduct, setDuplicateProduct] = useState<EditableProduct | null>(null);
		const [pendingProductData, setPendingProductData] = useState<EditableProduct | null>(null);

		// Следим за изменениями пропсов, чтобы обновлять только когда это необходимо
		const [localProducts, setLocalProducts] = useState(products);

		const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

		useEffect(() => {
			setLocalProducts(products);
		}, [products]); // Обновляем локальные данные только при изменении товаров

		// ОБНОВЛЯЕМ ТОВАР
		const handleProductUpdate = (updated: EditableProduct) => {
			onProductUpdate(updated); // ← только это
		};

		// Удаляем товар
		const handleProductDelete = async (id: string | number) => {
			if (typeof id === "string" && id.startsWith("new-")) {
				// Просто удаляем локально, если это новый не сохранённый товар
				setLocalProducts((prev) => prev.filter((p) => p.id !== id));
				return;
			}

			try {
				const res = await fetch(`/api/products/${id}`, {
					method: "DELETE",
				});

				if (res.ok) {
					setLocalProducts((prev) => prev.filter((p) => p.id !== id));
					showSuccessToast("Товар удалён");
				} else {
					showErrorToast("Ошибка при удалении товара");
				}
			} catch (err) {
				showErrorToast("Ошибка сети");
			}
		};

		// ✅ Добавим новый товар
		const handleAddProduct = () => {
			const departmentId = user?.role === "superadmin" ? "" : String(user?.department?.id ?? "");

			const newProduct: EditableProduct = {
				id: `new-${Date.now()}`,
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
				department: departmentId ? departments.find((d) => String(d.id) === departmentId) : undefined,
				departmentId: departmentId ? Number(departmentId) : null,
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
				{user?.role !== "manager" && (
					<button onClick={handleAddProduct} className="text-sm text-green-600 hover:underline border border-green-600 px-3 py-1 rounded mb-3">
						+ Добавить товар
					</button>
				)}
				<table className="w-full table-fixed text-sm border border-black/10border-gray-300">
					<thead className="bg-gray-100 text-left">
						<tr>
							<th className="border border-black/10 px-2 py-1 w-1/15 text-center">
								<input
									type="checkbox"
									checked={products.length > 0 && products.every((p) => selectedProductIds.includes(p.id))}
									onChange={(e) => {
										if (e.target.checked) {
											setSelectedProductIds(products.map((p) => p.id));
										} else {
											setSelectedProductIds([]);
										}
									}}
								/>
							</th>

							{user?.role === "superadmin" && <th className="border border-black/10 px-2 py-1 cursor-default w-1/6">Отдел</th>}

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

							<th className="border border-black/10 px-2 py-1 cursor-default w-1/6" onClick={() => handleSort("supplierPrice")}>
								Закупочная цена {renderSortIcon("supplierPrice")}
							</th>
							<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("price")}>
								Цена {renderSortIcon("price")}
							</th>
							<th className="border border-black/10 px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("categoryTitle")}>
								Категория {renderSortIcon("categoryTitle")}
							</th>
							<th className="border border-black/10 px-2 py-1 text-center w-1/6">Изображение</th>

							{user?.role !== "manager" && <th className="border border-black/10 px-2 py-1 text-center w-1/6">Действия</th>}
						</tr>
					</thead>

					<tbody>
						{localProducts.length > 0 ? (
							localProducts.map((product) => (
								<ProductRow
									key={`${product.id}-${product.updatedAt}`}
									product={toEditableProduct(product)}
									categories={categories}
									departments={departments}
									setPendingProductData={setPendingProductData}
									setDuplicateProduct={setDuplicateProduct}
									onUpdate={handleProductUpdate}
									onDelete={() => setConfirmDeleteId(product.id)}
									handleProductDelete={handleProductDelete}
									user={user}
									toEditableProduct={toEditableProduct}
									toProductForm={toProductForm}
									isSelected={selectedProductIds.includes(product.id)}
									toggleSelect={() => {
										setSelectedProductIds((prev) => (prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]));
									}}
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
				{/* Модалка подтверждения удаления товара */}
				{confirmDeleteId !== null && (
					<ConfirmModal
						open={true}
						title="Удалить товар?"
						message="Вы действительно хотите удалить этот товар? Это действие нельзя отменить."
						onCancel={() => setConfirmDeleteId(null)}
						onConfirm={() => {
							handleProductDelete(confirmDeleteId);
							setConfirmDeleteId(null);
						}}
					/>
				)}

				{duplicateProduct && pendingProductData && (
					<DuplicateProductModal
						existing={duplicateProduct}
						pending={pendingProductData}
						categories={categories}
						departments={departments}
						onEditArticle={() => {
							setDuplicateProduct(null);
							setPendingProductData(null);
						}}
						onUpdateExisting={async () => {
							const productData = {
								...toProductForm(pendingProductData),
								sku: pendingProductData.sku,
								brand: pendingProductData.brand,
							};

							const res = await fetch(`/api/products/${duplicateProduct.id}`, {
								method: "PUT",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(productData),
							});

							if (res.ok) {
								const json = await res.json();
								const updatedProduct = toEditableProduct(json.product);
								handleProductUpdate(updatedProduct);
								setDuplicateProduct(null);
								setPendingProductData(null);
							}
						}}
					/>
				)}
			</>
		);
	}
);

// Мемоизированный компонент
export default ProductsTable;
