// API основных настроек сайта: логотип, фавиконка, цвета

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

/** Публичный DTO: семантические имена (колонки БД прежние — @map в Prisma) */
export interface SiteSettingsData {
	logoUrl: string | null;
	faviconUrl: string | null;
	headerPhone: string | null;
	colorPrimary: string | null;
	colorSecondary: string | null;
	colorAccent: string | null;
	colorContrastLight: string | null;
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
				colorPrimary: null,
				colorSecondary: null,
				colorAccent: null,
				colorContrastLight: null,
			} satisfies SiteSettingsData);
		}

		return NextResponse.json({
			logoUrl: row.logoUrl ?? null,
			faviconUrl: row.faviconUrl ?? null,
			headerPhone: row.headerPhone ?? null,
			colorPrimary: row.colorPrimary ?? null,
			colorSecondary: row.colorSecondary ?? null,
			colorAccent: row.colorAccent ?? null,
			colorContrastLight: row.colorContrastLight ?? null,
		} satisfies SiteSettingsData);
	} catch (error) {
		console.error("Ошибка при получении настроек сайта:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// POST /api/site-settings — сохранить настройки (только с правом edit_content)
export const POST = withPermission(
	async (req: NextRequest) => {
		try {
			const body = (await req.json()) as Record<string, unknown>;

			const logoUrl = body.logoUrl != null && body.logoUrl !== "" ? String(body.logoUrl).trim() : null;
			const faviconUrl = body.faviconUrl != null && body.faviconUrl !== "" ? String(body.faviconUrl).trim() : null;
			const headerPhone = body.headerPhone != null && body.headerPhone !== "" ? String(body.headerPhone).trim() : null;

			const pickColor = (next: string, legacy: string) => {
				const v = body[next] ?? body[legacy];
				return v != null && v !== "" ? String(v).trim() : null;
			};
			const colorPrimary = pickColor("colorPrimary", "colorGrey");
			const colorSecondary = pickColor("colorSecondary", "colorGreyLight");
			const colorAccent = pickColor("colorAccent", "colorGreen");
			const colorContrastLight = pickColor("colorContrastLight", "colorWhite");

			const result = await withDbRetry(async () => {
				const existing = await prisma.siteSettings.findFirst();
				if (existing) {
					return await prisma.siteSettings.update({
						where: { id: existing.id },
						data: {
							logoUrl,
							faviconUrl,
							headerPhone,
							colorPrimary,
							colorSecondary,
							colorAccent,
							colorContrastLight,
						},
					});
				}
				return await prisma.siteSettings.create({
					data: {
						logoUrl,
						faviconUrl,
						headerPhone,
						colorPrimary,
						colorSecondary,
						colorAccent,
						colorContrastLight,
					},
				});
			});

			return NextResponse.json({
				logoUrl: result.logoUrl ?? null,
				faviconUrl: result.faviconUrl ?? null,
				headerPhone: result.headerPhone ?? null,
				colorPrimary: result.colorPrimary ?? null,
				colorSecondary: result.colorSecondary ?? null,
				colorAccent: result.colorAccent ?? null,
				colorContrastLight: result.colorContrastLight ?? null,
			} satisfies SiteSettingsData);
		} catch (error) {
			console.error("Ошибка при сохранении настроек сайта:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_content",
	["superadmin"]
);
