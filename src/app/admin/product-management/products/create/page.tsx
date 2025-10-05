import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import ProductComponent from "../local_components/product/ProductComponent";

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function CreateProductPage() {
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

	// Проверяем права доступа - только admin, superadmin и manager могут создавать товары
	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	// Получаем полную информацию о пользователе с отделом
	const fullUser = await prisma.user.findUnique({
		where: { id: user.id },
		include: {
			department: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	// Если пользователь не найден, перенаправляем
	if (!fullUser) {
		redirect("/admin");
	}

	// Проверяем наличие отдела для создания товара
	// Суперадминистратор может создавать товары без привязки к отделу
	// Остальные администраторы должны быть привязаны к отделу
	if (user.role !== "superadmin" && !fullUser.departmentId) {
		return (
			<div className={`screenContent`}>
				<div className={`tableContainer`}>
					<div className={`tabsContainer`}>
						<div className={`tabButton active`}>Создание товара</div>
					</div>
					<div className={`tableContent productComponent`}>
						<div className={`errorMessage`}>
							<h2>Нет возможности создавать товары</h2>
							<p>Вы не можете создавать товары, так как не привязаны ни к одному отделу.</p>
							<p>Обратитесь к суперадминистратору для назначения вас в отдел.</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<div className={`tabButton active`}>Создание товара</div>
				</div>
				<ProductComponent isCreating={true} userRole={user.role} />
			</div>
		</div>
	);
}
