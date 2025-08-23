import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DepartmentPageClient from "../local_components/DepartmentPageClient";
import { Category, Department, User } from "@/lib/types";

type PageParams = {
	params: Promise<{
		departmentId: string;
	}>;
};

// Типы для данных из Prisma
type DepartmentWithUsers = {
	id: number;
	name: string;
	users: User[];
};

export default async function DepartmentPage({ params }: PageParams) {
	const { departmentId } = await params;

	// Получаем данные отдела
	const department = (await prisma.department.findUnique({
		where: { id: Number(departmentId) },
		include: {
			users: {
				select: {
					id: true,
					first_name: true,
					last_name: true,
					middle_name: true,
					role: true,
					phone: true,
				},
			},
		},
	})) as DepartmentWithUsers | null;

	if (!department) {
		return notFound();
	}

	// Получаем все категории для выбора
	const categories = await prisma.category.findMany({
		orderBy: { title: "asc" },
	});

	// Получаем категории, связанные с отделом
	const departmentCategories = await prisma.departmentCategory.findMany({
		where: { departmentId: Number(departmentId) },
		include: { category: true },
	});

	// Получаем всех пользователей для выбора в отдел
	const availableUsers = (await prisma.user.findMany({
		where: {
			OR: [{ departmentId: null }, { departmentId: Number(departmentId) }],
		},
		select: {
			id: true,
			first_name: true,
			last_name: true,
			middle_name: true,
			role: true,
			phone: true,
			departmentId: true,
		},
		orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
	})) as User[];

	// Подготавливаем данные для клиентского компонента
	// Создаем объект отдела с правильной структурой
	const departmentData: Department = {
		id: department.id,
		name: department.name,
		allowedCategories: departmentCategories.map((dc) => ({ category: dc.category })),
		users: department.users.map((user) => ({
			id: user.id,
			first_name: user.first_name || "",
			last_name: user.last_name || "",
			middle_name: user.middle_name || "",
			avatar: "",
			phone: user.phone,
			role: user.role as any,
			status: "verified",
			orders: [],
		})),
		products: [],
		orders: [],
	};

	const initialData = {
		department: departmentData,
		categories,
		departmentCategories: departmentCategories.map((dc) => dc.category),
		availableUsers: availableUsers.map((user) => ({
			id: user.id,
			first_name: user.first_name || "",
			last_name: user.last_name || "",
			middle_name: user.middle_name || "",
			avatar: "",
			phone: user.phone,
			role: user.role as any,
			status: "verified",
			orders: [],
		})),
	};

	return <DepartmentPageClient initialData={initialData} />;
}
