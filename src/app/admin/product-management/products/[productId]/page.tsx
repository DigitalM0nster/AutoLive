// src/app/admin/products/[productId]/page.tsx
import ProductForm from "@/app/admin/product-management/products/local_components/createProductForm/CreateProductForm";

export default function EditProductPage({ params }: { params: { productId: string } }) {
	return <ProductForm productId={params.productId} />;
}
