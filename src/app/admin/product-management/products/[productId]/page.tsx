import Link from "next/link";
import ProductComponent from "../local_components/product/ProductComponent";

type PageParams = {
	params: Promise<{
		productId: string;
	}>;
};

export default async function ProductDetailPage({ params }: PageParams) {
	const { productId } = await params;

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<Link href={`/admin/product-management/products/${productId}`} className={`tabButton active`}>
						Управление товаром
					</Link>
					<Link href={`/admin/product-management/products/${productId}/logs`} className={`tabButton`}>
						История изменений товара
					</Link>
				</div>
				<ProductComponent productId={productId} />
			</div>
		</div>
	);
}
