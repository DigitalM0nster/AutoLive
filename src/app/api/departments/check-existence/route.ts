import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: any;
	scope: string;
}

export const POST = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const { departmentIds } = await req.json();

			if (!Array.isArray(departmentIds)) {
				return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
			}

			// Получаем существующие отделы
			const existingDepartments = await prisma.department.findMany({
				where: {
					id: {
						in: departmentIds,
					},
				},
				select: {
					id: true,
				},
			});

			const existingDepartmentIds = existingDepartments.map((dept) => dept.id);

			return NextResponse.json({
				existingDepartmentIds,
			});
		} catch (error) {
			console.error("Ошибка при проверке существования отделов:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"view_departments", // Разрешение на просмотр отделов
	["superadmin", "admin", "manager"]
);
