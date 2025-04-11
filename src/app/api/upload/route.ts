// src\app\api\upload\route.ts

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
	const formData = await req.formData();
	const file = formData.get("image") as File | null;

	if (!file) {
		return new NextResponse("Файл не найден", { status: 400 });
	}

	const bytes = await file.arrayBuffer();
	const buffer = Buffer.from(bytes);
	const ext = path.extname(file.name) || ".jpg";
	const fileName = `${Date.now()}-${randomUUID()}${ext}`;
	const uploadPath = path.join(process.cwd(), "public", "uploads", fileName);

	await fs.writeFile(uploadPath, buffer);

	return NextResponse.json({ url: `/uploads/${fileName}` });
}
