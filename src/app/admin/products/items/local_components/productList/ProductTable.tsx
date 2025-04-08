import { Product } from "./ProductList";
import ProductRow from "./ProductRow";
import { ArrowDown, ArrowUp, ArrowDownWideNarrow } from "lucide-react";

type Props = {
	products: Product[];
	loading: boolean;
	sortBy: string;
	sortOrder: "asc" | "desc";
	handleSort: (column: string) => void;
};

export default function ProductTable({ products, loading, sortBy, sortOrder, handleSort }: Props) {
	const renderSortIcon = (column: string) => {
		if (sortBy !== column) {
			return <ArrowDownWideNarrow size={14} className="inline-block text-gray-300 ml-1" />;
		}
		return sortOrder === "asc" ? <ArrowUp size={14} className="inline-block text-blue-600 ml-1" /> : <ArrowDown size={14} className="inline-block text-blue-600 ml-1" />;
	};

	if (loading) {
		return <p className="text-gray-500 text-sm">Загрузка товаров...</p>;
	}

	return (
		<table className="w-full table-fixed text-sm border border-gray-300">
			<thead className="bg-gray-100 text-left">
				<tr>
					<th className="border px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("sku")}>
						Артикул {renderSortIcon("sku")}
					</th>
					<th className="border px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("title")}>
						Название {renderSortIcon("title")}
					</th>
					<th className="border px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("price")}>
						Цена {renderSortIcon("price")}
					</th>
					<th className="border px-2 py-1 cursor-pointer w-1/6" onClick={() => handleSort("brand")}>
						Бренд {renderSortIcon("brand")}
					</th>
					<th className="border px-2 py-1 w-1/6">Категория</th>
					<th className="border px-2 py-1 text-center w-1/6">Действия</th>
				</tr>
			</thead>

			<tbody>
				{products.length > 0 ? (
					products.map((product) => <ProductRow key={product.id} product={product} />)
				) : (
					<tr>
						<td colSpan={6} className="text-center text-gray-400 py-4">
							Ничего не найдено
						</td>
					</tr>
				)}
			</tbody>
		</table>
	);
}
