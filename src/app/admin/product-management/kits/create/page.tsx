import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import ServiceKitComponent from "../local_components/serviceKit/ServiceKitComponent";

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function CreateServiceKitPage() {
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

	// Проверяем права доступа - только admin и superadmin могут создавать комплекты ТО
	if (!["superadmin", "admin"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<div className="tabButton active">Создание комплекта ТО</div>
				</div>
				<ServiceKitComponent isCreating={true} userRole={user.role} />
			</div>
		</div>
	);
}
