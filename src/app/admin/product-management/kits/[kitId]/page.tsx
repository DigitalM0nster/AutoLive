import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import ServiceKitComponent from "../local_components/serviceKit/ServiceKitComponent";

type PageParams = {
	params: Promise<{
		kitId: string;
	}>;
};

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function ServiceKitDetailPage({ params }: PageParams) {
	const { kitId } = await params;
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

	// Проверяем права доступа - только admin, superadmin и manager могут просматривать комплекты ТО
	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/product-management/kits/${kitId}`} className="tabButton active">
						{user.role === "manager" ? "Просмотр комплекта ТО" : "Управление комплектом ТО"}
					</Link>
					<Link href={`/admin/product-management/kits/${kitId}/logs`} className="tabButton">
						История изменений комплекта ТО
					</Link>
				</div>
				<ServiceKitComponent kitId={kitId} userRole={user.role} />
			</div>
		</div>
	);
}
