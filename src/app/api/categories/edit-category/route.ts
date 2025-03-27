// src/app/api/categories/edit-category/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import { mkdir } from "fs";

export async function POST(req: Request) {
	try {
		const formData = await req.formData();
		const id = Number(formData.get("id"));
		const title = formData.get("title")?.toString();
		const slug = formData.get("slug")?.toString();
		const description = formData.get("description")?.toString() || "";

		const file = formData.get("image") as File | null;
		let imageUrl: string | undefined = undefined;

		if (!id || !title || !slug) {
			return NextResponse.json({ error: "id, title и slug обязательны" }, { status: 400 });
		}

		if (file && file.size > 0) {
			const bytes = await file.arrayBuffer();
			const buffer = Buffer.from(bytes);

			const uploadDir = path.join(process.cwd(), "public", "uploads");
			await new Promise((resolve, reject) => {
				mkdir(uploadDir, { recursive: true }, (err) => (err ? reject(err) : resolve(true)));
			});

			const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
			const filepath = path.join(uploadDir, filename);
			await writeFile(filepath, buffer);
			imageUrl = `/uploads/${filename}`;
		}

		const updated = await prisma.category.update({
			where: { id },
			data: {
				title,
				slug,
				description,
				image: imageUrl ?? undefined,
			},
		});

		return NextResponse.json({ success: true, category: updated });
	} catch (error) {
		console.error("Ошибка обновления категории:", error);
		return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
	}
}
