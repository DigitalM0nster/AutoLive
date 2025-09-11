// src\app\api\upload\route.ts

import { NextResponse } from "next/server";
import { uploadFile, validateFile } from "@/lib/simpleFileUpload";

export async function POST(req: Request) {
	const formData = await req.formData();
	const file = formData.get("image") as File | null;

	if (!file) {
		return new NextResponse("Файл не найден", { status: 400 });
	}

	try {
		// Валидируем файл
		const validation = validateFile(file);
		if (!validation.isValid) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		// Загружаем файл используя простую систему
		const uploadResult = await uploadFile(file, {
			prefix: "upload",
		});

		console.log("✅ API Debug - Файл успешно загружен:", uploadResult.url);

		return NextResponse.json({
			url: uploadResult.url,
			originalName: uploadResult.originalName,
			size: uploadResult.size,
			type: uploadResult.type,
		});
	} catch (error) {
		console.error("❌ API Debug - Ошибка загрузки файла:", error);
		return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
	}
}
