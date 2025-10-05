import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import OrderComponent from "../local_components/order/OrderComponent";
import Link from "next/link";

type PageParams = {
	params: Promise<{
		orderId: string;
	}>;
};

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function OrderDetailPage({ params }: PageParams) {
	const { orderId } = await params;
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

	// Проверяем права доступа - все роли могут просматривать заказа
	if (!["superadmin", "admin", "manager", "client"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<Link href={`/admin/orders/${orderId}`} className={`tabButton active`}>
						{user.role === "manager" ? "Просмотр заказа" : "Управление заказой"}
					</Link>
					<Link href={`/admin/orders/${orderId}/logs`} className={`tabButton`}>
						История изменений заказа
					</Link>
				</div>
				<OrderComponent orderId={orderId} userRole={user.role} />
			</div>
		</div>
	);
}
