import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import OrderComponent from "../local_components/order/OrderComponent";

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function CreateOrderPage() {
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

	// Проверяем права доступа - все роли могут создавать заказа
	if (!["superadmin", "admin", "manager", "client"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<div className={`tabButton active`}>Создание заказа</div>
				</div>
				<OrderComponent isCreating={true} userRole={user.role} />
			</div>
		</div>
	);
}
