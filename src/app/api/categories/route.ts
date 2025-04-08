import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/categories
export async function GET() {
	try {
		const categories = await prisma.category.findMany({
			orderBy: { order: "asc" },
			include: {
				products: {
					select: { id: true },
				},
			},
		});

		const result = categories.map((cat) => ({
			id: cat.id,
			title: cat.title,
			image: cat.image,
			productCount: cat.products.length,
		}));

		return NextResponse.json(result);
	} catch (error) {
		console.error("Ошибка при получении категорий:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}

// POST /api/categories
export async function POST(req: Request) {
	try {
		const body = await req.json();
		const category = await prisma.category.create({
			data: {
				title: body.title,
				image: body.image,
				order: 0,
			},
		});
		return NextResponse.json(category);
	} catch (error) {
		console.error("Ошибка при создании категории:", error);
		return new NextResponse("Ошибка сервера", { status: 500 });
	}
}
