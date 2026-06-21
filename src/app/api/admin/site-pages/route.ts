export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { filterSitePages, STATIC_SITE_PAGES, type SitePageOption } from "@/lib/sitePagesCatalog";
import { withDbRetry } from "@/lib/utils";

async function handler(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const query = (searchParams.get("q") ?? "").trim();
		const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
		const limit = Math.min(30, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

		const categories = await withDbRetry(async () =>
			prisma.category.findMany({
				where: { visibleOnSite: true },
				orderBy: { title: "asc" },
				select: { id: true, title: true },
			}),
		);

		const dynamicPages: SitePageOption[] = categories.map((cat) => ({
			path: `/categories/${cat.id}`,
			label: cat.title,
			group: "Категории",
		}));

		const allPages = [...STATIC_SITE_PAGES, ...dynamicPages];
		const filtered = filterSitePages(allPages, query);
		const total = filtered.length;
		const skip = (page - 1) * limit;
		const items = filtered.slice(skip, skip + limit);

		return NextResponse.json({
			items,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit) || 0,
		});
	} catch (e) {
		console.error("admin site-pages GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(handler, "view_orders", ["superadmin"]);
