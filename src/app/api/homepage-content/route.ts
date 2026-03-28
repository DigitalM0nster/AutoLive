// src/app/api/homepage-content/route.ts
// API для работы с контентом главной страницы

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/middleware/permissionMiddleware";
import { withDbRetry } from "@/lib/utils";

// Типы для полей формы
export type FormFieldType = "text" | "phone" | "textarea" | "file" | "custom";
export type CustomFieldSubType = "text" | "phone" | "textarea" | "file"; // Типы для полей внутри кастомного поля

export interface FormField {
	id: string; // Уникальный ID поля
	type: FormFieldType;
	placeholder: string; // Текст placeholder (для обычных полей)
	required: boolean; // Обязательное ли поле
	// Для типа "custom" - два поля с выбором типов
	firstFieldType?: CustomFieldSubType; // Тип первого поля в кастомном блоке
	firstFieldPlaceholder?: string; // Placeholder первого поля
	secondFieldType?: CustomFieldSubType; // Тип второго поля в кастомном блоке
	secondFieldPlaceholder?: string; // Placeholder второго поля
	separatorText?: string; // Текст между полями (например, "или", "и")
}

export interface HomepageContentData {
	id?: number;
	firstBlockTitle: string;
	/** Заголовок блока «самостоятельно» (карточки категорий) */
	secondBlockTitle: string;
	callButtonText: string;
	orderButtonText: string;
	formFields: FormField[];
	formSubmitButtonText: string;
}

// GET /api/homepage-content - Получить контент главной страницы
// Публичный доступ (для отображения на сайте)
export async function GET(request: NextRequest) {
	try {
		// Получаем единственную запись или создаём с дефолтными значениями
		let content = await withDbRetry(async () => {
			return await prisma.homepageContent.findFirst();
		});

		// Если записи нет, возвращаем пустые тексты, но сохраняем структуру полей попапа
		if (!content) {
			const defaultContent: HomepageContentData = {
				firstBlockTitle: "",
				secondBlockTitle: "Выбрать запчасти самостоятельно:",
				callButtonText: "",
				orderButtonText: "",
				formFields: [
					{
						id: "1",
						type: "custom",
						placeholder: "Vin код или фото",
						required: false,
						firstFieldType: "text",
						firstFieldPlaceholder: "Vin код",
						secondFieldType: "file",
						secondFieldPlaceholder: "Приложите фото",
						separatorText: "или",
					},
					{
						id: "2",
						type: "text",
						placeholder: "Наименование детали",
						required: true,
					},
					{
						id: "3",
						type: "phone",
						placeholder: "Телефон для связи",
						required: true,
					},
					{
						id: "4",
						type: "textarea",
						placeholder: "Комментарий (не обязательно)",
						required: false,
					},
				],
				formSubmitButtonText: "Оставить заказ",
			};
			return NextResponse.json(defaultContent);
		}

		// Парсим JSON поля formFields
		const formFields = Array.isArray(content.formFields) ? (content.formFields as unknown as FormField[]) : [];

		const response: HomepageContentData = {
			id: content.id,
			firstBlockTitle: content.firstBlockTitle,
			secondBlockTitle: content.secondBlockTitle,
			callButtonText: content.callButtonText,
			orderButtonText: content.orderButtonText,
			formFields: formFields,
			formSubmitButtonText: content.formSubmitButtonText,
		};

		return NextResponse.json(response);
	} catch (error) {
		console.error("Ошибка при получении контента главной страницы:", error);
		return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
	}
}

// POST /api/homepage-content - Сохранить контент главной страницы
// Только для админов
export const POST = withPermission(
	async (req: NextRequest, { user }) => {
		try {
			const body: HomepageContentData = await req.json();
			const secondBlockTitle =
				typeof body.secondBlockTitle === "string"
					? body.secondBlockTitle.trim()
					: "Выбрать запчасти самостоятельно:";

			if (!Array.isArray(body.formFields)) {
				return NextResponse.json({ error: "Поля формы должны быть массивом" }, { status: 400 });
			}

			/** Ответ 400 с текстом для человека и данными для подсветки поля в админке */
			const rejectField = (
				i: number,
				field: FormField | undefined,
				message: string,
				issues: string[],
			) =>
				NextResponse.json(
					{
						error: message,
						fieldIndex: i,
						fieldId: field?.id ?? null,
						issues,
					},
					{ status: 400 },
				);

			// Валидация полей формы (пустая строка в НАЗВАНИИ после trim — отдельное сообщение)
			for (let i = 0; i < body.formFields.length; i++) {
				const field = body.formFields[i] as FormField | undefined;
				const n = i + 1;
				const idStr = field && typeof field.id === "string" ? field.id.trim() : "";
				if (!field || !idStr) {
					return rejectField(
						i,
						field,
						`Поле ${n}: отсутствует или пустой внутренний идентификатор. Удалите поле и добавьте снова, либо обновите страницу.`,
						["id"],
					);
				}
				if (!field.type || typeof field.type !== "string") {
					return rejectField(i, field, `Поле ${n} (id «${idStr}»): не выбран тип поля.`, ["type"]);
				}
				const ph = typeof field.placeholder === "string" ? field.placeholder.trim() : "";
				if (!ph) {
					return rejectField(
						i,
						field,
						`Поле ${n} (id «${idStr}»): заполните НАЗВАНИЕ — подпись поля для посетителей сайта (поле не может быть пустым).`,
						["placeholder"],
					);
				}

				if (field.type === "custom") {
					if (!field.firstFieldType) {
						return rejectField(
							i,
							field,
							`Поле ${n} (id «${idStr}», настраиваемое): выберите тип первого подполя.`,
							["firstFieldType"],
						);
					}
					if (!field.secondFieldType) {
						return rejectField(
							i,
							field,
							`Поле ${n} (id «${idStr}», настраиваемое): выберите тип второго подполя.`,
							["secondFieldType"],
						);
					}
					const fp = typeof field.firstFieldPlaceholder === "string" ? field.firstFieldPlaceholder.trim() : "";
					const sp = typeof field.secondFieldPlaceholder === "string" ? field.secondFieldPlaceholder.trim() : "";
					if (!fp) {
						return rejectField(
							i,
							field,
							`Поле ${n} (id «${idStr}», настраиваемое): заполните НАЗВАНИЕ первого подполя.`,
							["firstFieldPlaceholder"],
						);
					}
					if (!sp) {
						return rejectField(
							i,
							field,
							`Поле ${n} (id «${idStr}», настраиваемое): заполните НАЗВАНИЕ второго подполя.`,
							["secondFieldPlaceholder"],
						);
					}
				}
			}

			// Сохраняем или обновляем запись
			const result = await withDbRetry(async () => {
				// Проверяем, есть ли уже запись
				const existing = await prisma.homepageContent.findFirst();

				if (existing) {
					// Обновляем существующую запись
					return await prisma.homepageContent.update({
						where: { id: existing.id },
						data: {
							firstBlockTitle: body.firstBlockTitle.trim(),
							secondBlockTitle: secondBlockTitle,
							callButtonText: body.callButtonText.trim(),
							orderButtonText: body.orderButtonText.trim(),
							formFields: body.formFields as any,
							formSubmitButtonText: body.formSubmitButtonText.trim(),
						},
					});
				} else {
					// Создаём новую запись
					return await prisma.homepageContent.create({
						data: {
							firstBlockTitle: body.firstBlockTitle.trim(),
							secondBlockTitle: secondBlockTitle,
							callButtonText: body.callButtonText.trim(),
							orderButtonText: body.orderButtonText.trim(),
							formFields: body.formFields as any,
							formSubmitButtonText: body.formSubmitButtonText.trim(),
						},
					});
				}
			});

			return NextResponse.json({
				id: result.id,
				firstBlockTitle: result.firstBlockTitle,
				secondBlockTitle: result.secondBlockTitle,
				callButtonText: result.callButtonText,
				orderButtonText: result.orderButtonText,
				formFields: result.formFields,
				formSubmitButtonText: result.formSubmitButtonText,
			});
		} catch (error) {
			console.error("Ошибка при сохранении контента главной страницы:", error);
			return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
		}
	},
	"edit_content", // Право на редактирование контента
	["superadmin"] // Только суперадмин может редактировать контент
);
