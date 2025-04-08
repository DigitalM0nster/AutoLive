type Product = {
	id: string;
	sku: string;
	title: string;
	price: number;
	brand: string;
	categoryTitle: string;
};

export default function ProductRow({ product }: { product: Product }) {
	return (
		<tr>
			<td className="border px-2 py-1">{product.sku}</td>
			<td className="border px-2 py-1">{product.title}</td>
			<td className="border px-2 py-1">{product.price} ₽</td>
			<td className="border px-2 py-1">{product.brand}</td>
			<td className="border px-2 py-1">{product.categoryTitle}</td>
			<td className="border px-2 py-1 text-center">
				<button className="text-blue-600 hover:underline text-xs mr-2">Редактировать</button>
				<button className="text-red-600 hover:underline text-xs">Удалить</button>
			</td>
		</tr>
	);
}
