// API для контента страницы контактов (контактные адреса, настройки карты, заголовки блоков)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

export interface ContactAddressItem {
	id?: number;
	address: string;
	latitude: number | null;
	longitude: number | null;
	phones: string[];
	emails: string[];
	workingHours: string | null;
	sortOrder: number;
}

export interface ContactsContentData {
	id?: number;
	address: string;
	phone: string;
	email: string;
	workingHours: string;
	mapNote: string;
	mapMarkerColor: string;
	mapZoom: number | null;
	addressesBlockTitle: string;
	pickupBlockTitle: string;
	/** Адреса контактной информации (отображаются на карте всегда). */
	contactAddresses: ContactAddressItem[];
}

const emptyContactAddresses: ContactAddressItem[] = [];

// GET /api/contacts-content — получить контент контактов (для сайта и админки)
export async function GET() {
	try {
		const content = await withDbRetry(async () => {
			return await prisma.contactsContent.findFirst({
				include: {
					contactAddresses: { orderBy: { sortOrder: "asc" } },
				},
			});
		});

		if (!content) {
			return NextResponse.json({
				address: "",
				phone: "",
				email: "",
				workingHours: "",
				mapNote: "",
				mapMarkerColor: "",
				mapZoom: null,
				addressesBlockTitle: "",
				pickupBlockTitle: "",
				contactAddresses: emptyContactAddresses,
			} as ContactsContentData);
		}

		let contactAddresses: ContactAddressItem[] = content.contactAddresses.map((a) => ({
			id: a.id,
			address: a.address,
			latitude: a.latitude,
			longitude: a.longitude,
			phones: a.phones ?? [],
			emails: a.emails ?? [],
			workingHours: a.workingHours ?? null,
			sortOrder: a.sortOrder,
		}));

		// Обратная совместимость: если контактных адресов нет, но есть старые поля — один виртуальный адрес
		if (contactAddresses.length === 0 && (content.address || content.phone || content.email || content.workingHours)) {
			contactAddresses = [
				{
					address: content.address ?? "",
					latitude: null,
					longitude: null,
					phones: content.phone ? [content.phone] : [],
					emails: content.email ? [content.email] : [],
					workingHours: content.workingHours ?? null,
					sortOrder: 0,
				},
			];
		}

		return NextResponse.json({
			id: content.id,
			address: content.address ?? "",
			phone: content.phone ?? "",
			email: content.email ?? "",
			workingHours: content.workingHours ?? "",
			mapNote: content.mapNote ?? "",
			mapMarkerColor: content.mapMarkerColor ?? "",
			mapZoom: content.mapZoom ?? null,
			addressesBlockTitle: content.addressesBlockTitle ?? "",
			pickupBlockTitle: content.pickupBlockTitle ?? "",
			contactAddresses,
		} as ContactsContentData);
	} catch (error) {
		console.error("Ошибка при получении контента контактов:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// POST /api/contacts-content — сохранить контент контактов (только с правом edit_content)
export const POST = withPermission(
	async (req: NextRequest) => {
		try {
			const body = (await req.json()) as ContactsContentData;

			const address = typeof body.address === "string" ? body.address.trim() : "";
			const phone = typeof body.phone === "string" ? body.phone.trim() : "";
			const email = typeof body.email === "string" ? body.email.trim() : "";
			const workingHours = typeof body.workingHours === "string" ? body.workingHours.trim() : "";
			const mapNote = typeof body.mapNote === "string" ? body.mapNote.trim() : "";
			const mapMarkerColor = typeof body.mapMarkerColor === "string" ? body.mapMarkerColor.trim() : "";
			// JSON может прислать zoom строкой или числом — тип тела не сужаем до number | null
			const rawZoom: unknown = body.mapZoom;
			const mapZoom =
				typeof rawZoom === "number" && Number.isFinite(rawZoom) && rawZoom >= 1 && rawZoom <= 19
					? Math.round(rawZoom)
					: typeof rawZoom === "string" && rawZoom.trim() !== ""
						? (() => {
								const n = parseInt(rawZoom.trim(), 10);
								return n >= 1 && n <= 19 ? n : null;
							})()
						: null;
			const addressesBlockTitle = typeof body.addressesBlockTitle === "string" ? body.addressesBlockTitle.trim() : "";
			const pickupBlockTitle = typeof body.pickupBlockTitle === "string" ? body.pickupBlockTitle.trim() : "";

			const rawAddresses = Array.isArray(body.contactAddresses) ? body.contactAddresses : [];
			const contactAddresses = rawAddresses.map((a: any, index: number) => {
				const address = typeof a?.address === "string" ? a.address.trim() : "";
				const phones = Array.isArray(a?.phones) ? (a.phones as string[]).filter((p: string) => typeof p === "string" && p.trim() !== "") : [];
				const emails = Array.isArray(a?.emails) ? (a.emails as string[]).filter((e: string) => typeof e === "string" && e.trim() !== "") : [];
				const workingHours = a?.workingHours != null && String(a.workingHours).trim() !== "" ? String(a.workingHours).trim() : null;
				const lat = a?.latitude;
				const lng = a?.longitude;
				const latitude = lat === null || lat === undefined || lat === "" ? null : Number(lat);
				const longitude = lng === null || lng === undefined || lng === "" ? null : Number(lng);
				return { address, latitude, longitude, phones, emails, workingHours, sortOrder: index };
			}).filter((a: { address: string }) => a.address !== "");

			const result = await withDbRetry(async () => {
				const existing = await prisma.contactsContent.findFirst();
				let contentId: number;
				if (existing) {
					await prisma.contactsContent.update({
						where: { id: existing.id },
						data: { address, phone, email, workingHours, mapNote, mapMarkerColor, mapZoom, addressesBlockTitle, pickupBlockTitle },
					});
					contentId = existing.id;
					await prisma.contactAddress.deleteMany({ where: { contactsContentId: contentId } });
				} else {
					const created = await prisma.contactsContent.create({
						data: { address, phone, email, workingHours, mapNote, mapMarkerColor, mapZoom, addressesBlockTitle, pickupBlockTitle },
					});
					contentId = created.id;
				}
				if (contactAddresses.length > 0) {
					await prisma.contactAddress.createMany({
						data: contactAddresses.map((a) => ({
							contactsContentId: contentId,
							address: a.address,
							latitude: a.latitude,
							longitude: a.longitude,
							phones: a.phones,
							emails: a.emails,
							workingHours: a.workingHours,
							sortOrder: a.sortOrder,
						})),
					});
				}
				return await prisma.contactsContent.findUniqueOrThrow({
					where: { id: contentId },
					include: { contactAddresses: { orderBy: { sortOrder: "asc" } } },
				});
			});

			const outAddresses: ContactAddressItem[] = result.contactAddresses.map((a) => ({
				id: a.id,
				address: a.address,
				latitude: a.latitude,
				longitude: a.longitude,
				phones: a.phones ?? [],
				emails: a.emails ?? [],
				workingHours: a.workingHours ?? null,
				sortOrder: a.sortOrder,
			}));

			return NextResponse.json({
				id: result.id,
				address: result.address ?? "",
				phone: result.phone ?? "",
				email: result.email ?? "",
				workingHours: result.workingHours ?? "",
				mapNote: result.mapNote ?? "",
				mapMarkerColor: result.mapMarkerColor ?? "",
				mapZoom: result.mapZoom ?? null,
				addressesBlockTitle: result.addressesBlockTitle ?? "",
				pickupBlockTitle: result.pickupBlockTitle ?? "",
				contactAddresses: outAddresses,
			});
		} catch (error) {
			console.error("Ошибка при сохранении контента контактов:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_content",
	["superadmin"]
);
