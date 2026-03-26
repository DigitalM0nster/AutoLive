// Публичная отправка заявки с главной («Оставить заявку») и список для админки
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formFieldsToPartDefs, validateHomepageRequestValues } from "@/lib/homepageRequestFormShared";
import type { FormField } from "@/app/api/homepage-content/route";
import { uploadFile, validateFile } from "@/lib/simpleFileUpload";
import { PERSONAL_DATA_CONSENT_ERROR } from "@/lib/personalDataConsentServer";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

type PayloadRow = {
	key: string;
	partType: string;
	placeholder: string;
	value?: string;
	fileUrl?: string;
	originalName?: string;
};

/** POST — гость отправляет форму с главной (multipart, поля по ключам из админки) */
export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		if (formData.get("personal_data_consent") !== "true") {
			return NextResponse.json({ error: PERSONAL_DATA_CONSENT_ERROR }, { status: 400 });
		}

		const content = await withDbRetry(async () => prisma.homepageContent.findFirst());
		if (!content) {
			return NextResponse.json({ error: "Форма на главной не настроена" }, { status: 503 });
		}

		const formFieldsRaw = content.formFields;
		if (!Array.isArray(formFieldsRaw)) {
			return NextResponse.json({ error: "Некорректная конфигурация формы" }, { status: 500 });
		}
		const fields = formFieldsRaw as FormField[];

		const get = (key: string) => formData.get(key);
		const val = validateHomepageRequestValues(fields, get);
		if (!val.ok) {
			return NextResponse.json({ error: val.message }, { status: 400 });
		}

		const defs = formFieldsToPartDefs(fields);
		const payload: PayloadRow[] = [];

		for (const d of defs) {
			const raw = formData.get(d.key);
			if (d.partType === "file") {
				if (raw instanceof File && raw.size > 0) {
					const v = validateFile(raw);
					if (!v.isValid) {
						return NextResponse.json({ error: v.error }, { status: 400 });
					}
					const up = await uploadFile(raw, { prefix: "homepage-req" });
					payload.push({
						key: d.key,
						partType: d.partType,
						placeholder: d.placeholder,
						fileUrl: up.url,
						originalName: up.originalName,
					});
				} else {
					payload.push({ key: d.key, partType: d.partType, placeholder: d.placeholder });
				}
			} else {
				const s = typeof raw === "string" ? raw.trim() : "";
				payload.push({
					key: d.key,
					partType: d.partType,
					placeholder: d.placeholder,
					value: s || undefined,
				});
			}
		}

		await withDbRetry(async () =>
			prisma.homepageRequest.create({
				data: {
					payload,
					status: "new",
				},
			}),
		);

		return NextResponse.json({ ok: true }, { status: 201 });
	} catch (e) {
		console.error("homepage-requests POST:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

async function listHandler(req: NextRequest, _ctx: { user: unknown; scope: unknown; params: unknown }) {
	try {
		const { searchParams } = new URL(req.url);
		const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
		const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
		const status = searchParams.get("status");
		const skip = (page - 1) * limit;

		const where =
			status === "new" || status === "processed"
				? { status: status as "new" | "processed" }
				: {};

		const [rows, total] = await withDbRetry(async () =>
			Promise.all([
				prisma.homepageRequest.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				prisma.homepageRequest.count({ where }),
			]),
		);

		return NextResponse.json({
			requests: rows,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit) || 0,
		});
	} catch (e) {
		console.error("homepage-requests GET:", e);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

export const GET = withPermission(listHandler, "view_orders", ["superadmin", "admin", "manager"]);
