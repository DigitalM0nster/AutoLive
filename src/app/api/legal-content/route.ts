// GET — публично (страницы /privacy, /cookies, личный кабинет)
// POST — сохранение (superadmin + право edit_content), как у footer-content

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";
import { getSiteLegalContent } from "@/lib/siteLegalContent";
import {
	defaultSiteLegalContent,
	parseSiteLegalContentBody,
	siteLegalRowToDto,
} from "@/lib/siteLegalContent.shared";

export async function GET() {
	try {
		const data = await getSiteLegalContent();
		return NextResponse.json(data);
	} catch (e) {
		console.error("legal-content GET:", e);
		return NextResponse.json(defaultSiteLegalContent);
	}
}

export const POST = withPermission(
	async (req: NextRequest) => {
		try {
			const body = parseSiteLegalContentBody(await req.json());

			const result = await withDbRetry(async () => {
				const existing = await prisma.siteLegalContent.findFirst();
				const data = {
					privacyPolicyTitle: body.privacyPolicyTitle,
					privacyPolicyFileUrl: body.privacyPolicyFileUrl,
					cookiesPolicyTitle: body.cookiesPolicyTitle,
					cookiesPolicyFileUrl: body.cookiesPolicyFileUrl,
				};
				if (existing) {
					return prisma.siteLegalContent.update({
						where: { id: existing.id },
						data,
					});
				}
				return prisma.siteLegalContent.create({ data });
			});

			return NextResponse.json(siteLegalRowToDto(result));
		} catch (e) {
			console.error("legal-content POST:", e);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_content",
	["superadmin"]
);
