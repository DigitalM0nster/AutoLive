// Загрузка файлов: изображения (как раньше) и документы для подвала (PDF/DOC/DOCX, только суперадмин)

import { NextRequest, NextResponse } from "next/server";
import { uploadFile, validateFile } from "@/lib/simpleFileUpload";
import { getUserFromRequest } from "@/middleware/permissionMiddleware";

const DOCUMENT_MAX_BYTES = 15 * 1024 * 1024; // 15 МБ

const DOCUMENT_MIME_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Расширение подтверждает тип, если браузер не прислал MIME */
function documentFileLooksAllowed(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx");
}

function validateDocumentFile(file: File): { isValid: boolean; error?: string } {
	if (file.size > DOCUMENT_MAX_BYTES) {
		return { isValid: false, error: "Размер файла не должен превышать 15 МБ" };
	}
	const mimeOk = file.type !== "" && DOCUMENT_MIME_TYPES.includes(file.type);
	const extOk = documentFileLooksAllowed(file);
	if (!mimeOk && !extOk) {
		return { isValid: false, error: "Допустимы файлы PDF, DOC или DOCX" };
	}
	return { isValid: true };
}

export async function POST(req: NextRequest) {
	const formData = await req.formData();
	const documentFile = formData.get("document") as File | null;
	const imageFile = formData.get("image") as File | null;

	// Документы для футера — только суперадмин (контент сайта)
	if (documentFile && documentFile.size > 0) {
		const { user, error, status } = await getUserFromRequest(req);
		if (!user) {
			return NextResponse.json({ error }, { status });
		}
		if (user.role !== "superadmin") {
			return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
		}

		const docValidation = validateDocumentFile(documentFile);
		if (!docValidation.isValid) {
			return NextResponse.json({ error: docValidation.error }, { status: 400 });
		}

		try {
			const uploadResult = await uploadFile(documentFile, {
				prefix: "footer-doc",
			});
			return NextResponse.json({
				url: uploadResult.url,
				originalName: uploadResult.originalName,
				size: uploadResult.size,
				type: uploadResult.type,
			});
		} catch (error) {
			console.error("Ошибка загрузки документа подвала:", error);
			return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
		}
	}

	if (!imageFile) {
		return new NextResponse("Файл не найден", { status: 400 });
	}

	try {
		const validation = validateFile(imageFile);
		if (!validation.isValid) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		const uploadResult = await uploadFile(imageFile, {
			prefix: "upload",
		});

		return NextResponse.json({
			url: uploadResult.url,
			originalName: uploadResult.originalName,
			size: uploadResult.size,
			type: uploadResult.type,
		});
	} catch (error) {
		console.error("Ошибка загрузки изображения:", error);
		return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
	}
}
