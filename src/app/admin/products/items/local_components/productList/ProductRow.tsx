type Product = {
	id: string;
	sku: string;
	title: string;
	price: number;
	brand: string;
	categoryTitle: string;
	updatedAt: string;
};

export default function ProductRow({ product }: { product: Product }) {
	const isStale = (updatedAt: string) => {
		const daysDiff = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
		return daysDiff > 30;
	};

	return (
		<tr className={isStale(product.updatedAt) ? "bg-yellow-50" : ""}>
			<td className="border px-2 py-1 w-1/6">{product.sku}</td>
			<td className="border px-2 py-1 w-1/6">{product.title}</td>
			<td className="border px-2 py-1 w-1/6">{product.price} ₽</td>
			<td className="border px-2 py-1 w-1/6">{product.brand}</td>
			<td className="border px-2 py-1 w-1/6">
				{product.categoryTitle}
				{isStale(product.updatedAt) && <span className="text-xs text-red-500 ml-1">(устарело)</span>}
			</td>
			<td className="border px-2 py-1 text-center w-1/6">
				<button className="text-blue-600 hover:underline text-xs mr-2">Редактировать</button>
				<button className="text-red-600 hover:underline text-xs">Удалить</button>
			</td>
		</tr>
	);
}
