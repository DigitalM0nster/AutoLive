import Link from "next/link";
import ProductLogsComponent from "../../local_components/productLogs/ProductLogsComponent";

type PageParams = {
	params: Promise<{
		productId: string;
	}>;
};

export default async function ProductLogsPage({ params }: PageParams) {
	const { productId } = await params;

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<Link href={`/admin/product-management/products/${productId}`} className={`tabButton`}>
						Управление товаром
					</Link>
					<Link href={`/admin/product-management/products/${productId}/logs`} className={`tabButton active`}>
						История изменений товара
					</Link>
				</div>
				<ProductLogsComponent productId={Number(productId)} />
			</div>
		</div>
	);
}
