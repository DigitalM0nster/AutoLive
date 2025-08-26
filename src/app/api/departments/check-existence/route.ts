import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/middleware/permissionMiddleware";

interface ExtendedRequestContext {
	user: any;
	scope: string;
}

export const GET = withPermission(
	async (req: NextRequest, { user }: ExtendedRequestContext) => {
		try {
			const { searchParams } = new URL(req.url);
			const departmentIdsParam = searchParams.get("departmentIds");

			if (!departmentIdsParam) {
				return NextResponse.json({ error: "departmentIds обязателен" }, { status: 400 });
			}

			const departmentIds = departmentIdsParam
				.split(",")
				.map((id) => parseInt(id))
				.filter((id) => !isNaN(id));

			if (departmentIds.length === 0) {
				return NextResponse.json({ existingDepartmentIds: [] });
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
	"view_departments",
	["superadmin", "admin", "manager"]
);
