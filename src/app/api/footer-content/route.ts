// API контента подвала: телефон, блоки контактов, документы, копирайт (одна запись в БД)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";
import {
	defaultFooterContentDisplay,
	footerRowToDto,
	parseFooterContactBlocks,
	parseFooterDocuments,
	footerBlockIsVisible,
	type FooterContentData,
} from "@/lib/footerDisplay";

export type { FooterContentData };

// GET /api/footer-content — публично, для футера на сайте
export async function GET() {
	try {
		const row = await withDbRetry(async () => prisma.footerContent.findFirst());
		if (!row) {
			return NextResponse.json(defaultFooterContentDisplay);
		}
		return NextResponse.json(footerRowToDto(row));
	} catch (error) {
		console.error("Ошибка при получении контента подвала:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// POST /api/footer-content — сохранить (только суперадмин)
export const POST = withPermission(
	async (req: NextRequest) => {
		try {
			const body = (await req.json()) as FooterContentData;

			const phone = body.phone != null && String(body.phone).trim() !== "" ? String(body.phone).trim() : null;
			const copyrightLine =
				body.copyrightLine != null && String(body.copyrightLine).trim() !== ""
					? String(body.copyrightLine).trim()
					: null;

			// Убираем пустые пункты и блоки без содержимого
			const contactBlocks = parseFooterContactBlocks(body.contactBlocks).filter(footerBlockIsVisible);
			const documents = parseFooterDocuments(body.documents);

			const result = await withDbRetry(async () => {
				const existing = await prisma.footerContent.findFirst();
				if (existing) {
					return prisma.footerContent.update({
						where: { id: existing.id },
						data: {
							phone,
							contactBlocks: contactBlocks as unknown as object[],
							documents: documents as unknown as object[],
							copyrightLine,
						},
					});
				}
				return prisma.footerContent.create({
					data: {
						phone,
						contactBlocks: contactBlocks as unknown as object[],
						documents: documents as unknown as object[],
						copyrightLine,
					},
				});
			});

			return NextResponse.json(footerRowToDto(result));
		} catch (error) {
			console.error("Ошибка при сохранении контента подвала:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_content",
	["superadmin"]
);
