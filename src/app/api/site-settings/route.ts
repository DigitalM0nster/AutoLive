// API основных настроек сайта: логотип, фавиконка, цвета

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

export interface SiteSettingsData {
	logoUrl: string | null;
	faviconUrl: string | null;
	headerPhone: string | null;
	colorGrey: string | null;
	colorGreyLight: string | null;
	colorGreen: string | null;
	colorWhite: string | null;
}

// GET /api/site-settings — получить настройки (публичный, для отображения на сайте)
export async function GET() {
	try {
		const row = await withDbRetry(async () => {
			return await prisma.siteSettings.findFirst();
		});

		if (!row) {
			return NextResponse.json({
				logoUrl: null,
				faviconUrl: null,
				headerPhone: null,
				colorGrey: null,
				colorGreyLight: null,
				colorGreen: null,
				colorWhite: null,
			} as SiteSettingsData);
		}

		return NextResponse.json({
			logoUrl: row.logoUrl ?? null,
			faviconUrl: row.faviconUrl ?? null,
			headerPhone: row.headerPhone ?? null,
			colorGrey: row.colorGrey ?? null,
			colorGreyLight: row.colorGreyLight ?? null,
			colorGreen: row.colorGreen ?? null,
			colorWhite: row.colorWhite ?? null,
		} as SiteSettingsData);
	} catch (error) {
		console.error("Ошибка при получении настроек сайта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// POST /api/site-settings — сохранить настройки (только с правом edit_content)
export const POST = withPermission(
	async (req: NextRequest) => {
		try {
			const body = (await req.json()) as SiteSettingsData;

			const logoUrl = body.logoUrl != null && body.logoUrl !== "" ? String(body.logoUrl).trim() : null;
			const faviconUrl = body.faviconUrl != null && body.faviconUrl !== "" ? String(body.faviconUrl).trim() : null;
			const headerPhone = body.headerPhone != null && body.headerPhone !== "" ? String(body.headerPhone).trim() : null;
			const colorGrey = body.colorGrey != null && body.colorGrey !== "" ? String(body.colorGrey).trim() : null;
			const colorGreyLight = body.colorGreyLight != null && body.colorGreyLight !== "" ? String(body.colorGreyLight).trim() : null;
			const colorGreen = body.colorGreen != null && body.colorGreen !== "" ? String(body.colorGreen).trim() : null;
			const colorWhite = body.colorWhite != null && body.colorWhite !== "" ? String(body.colorWhite).trim() : null;

			const result = await withDbRetry(async () => {
				const existing = await prisma.siteSettings.findFirst();
				if (existing) {
					return await prisma.siteSettings.update({
						where: { id: existing.id },
						data: { logoUrl, faviconUrl, headerPhone, colorGrey, colorGreyLight, colorGreen, colorWhite },
					});
				}
				return await prisma.siteSettings.create({
					data: { logoUrl, faviconUrl, headerPhone, colorGrey, colorGreyLight, colorGreen, colorWhite },
				});
			});

			return NextResponse.json({
				logoUrl: result.logoUrl ?? null,
				faviconUrl: result.faviconUrl ?? null,
				headerPhone: result.headerPhone ?? null,
				colorGrey: result.colorGrey ?? null,
				colorGreyLight: result.colorGreyLight ?? null,
				colorGreen: result.colorGreen ?? null,
				colorWhite: result.colorWhite ?? null,
			});
		} catch (error) {
			console.error("Ошибка при сохранении настроек сайта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_content",
	["superadmin"]
);
