// Только сервер: Prisma + pg. Не импортировать из "use client".

import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/utils";
import { defaultSiteLegalContent, siteLegalRowToDto, type SiteLegalContentData } from "@/lib/siteLegalContent.shared";

export type { SiteLegalContentData } from "@/lib/siteLegalContent.shared";

/** Публичное чтение (Server Components, GET API). */
export async function getSiteLegalContent(): Promise<SiteLegalContentData> {
	try {
		const row = await withDbRetry(async () => prisma.siteLegalContent.findFirst());
		return siteLegalRowToDto(row);
	} catch {
		return { ...defaultSiteLegalContent };
	}
}
