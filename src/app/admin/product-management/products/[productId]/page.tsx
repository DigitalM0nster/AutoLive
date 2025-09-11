import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import ProductComponent from "../local_components/product/ProductComponent";

type PageParams = {
	params: Promise<{
		productId: string;
	}>;
};

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function ProductDetailPage({ params }: PageParams) {
	const { productId } = await params;
	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	// Проверяем авторизацию
	if (!token) {
		redirect("/admin");
	}

	let user: DecodedToken | null = null;

	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
	} catch (e) {
		redirect("/admin");
	}

	// Проверяем права доступа - только admin, superadmin и manager могут просматривать товары
	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<Link href={`/admin/product-management/products/${productId}`} className={`tabButton active`}>
						{user.role === "manager" ? "Просмотр товара" : "Управление товаром"}
					</Link>
					<Link href={`/admin/product-management/products/${productId}/logs`} className={`tabButton`}>
						История изменений товара
					</Link>
				</div>
				<ProductComponent productId={productId} userRole={user.role} />
			</div>
		</div>
	);
}
