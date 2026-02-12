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

		// Если записи нет, возвращаем дефолтные значения
		if (!content) {
			const defaultContent: HomepageContentData = {
				firstBlockTitle: "Выбрать запчасти с менеджером:",
				callButtonText: "Позвонить в магазин",
				orderButtonText: "Оставить заказ",
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

			// Валидация данных
			if (!body.firstBlockTitle || !body.firstBlockTitle.trim()) {
				return NextResponse.json({ error: "Заголовок первого блока обязателен" }, { status: 400 });
			}

			if (!body.callButtonText || !body.callButtonText.trim()) {
				return NextResponse.json({ error: "Текст кнопки звонка обязателен" }, { status: 400 });
			}

			if (!body.orderButtonText || !body.orderButtonText.trim()) {
				return NextResponse.json({ error: "Текст кнопки заказа обязателен" }, { status: 400 });
			}

			if (!body.formSubmitButtonText || !body.formSubmitButtonText.trim()) {
				return NextResponse.json({ error: "Текст кнопки отправки формы обязателен" }, { status: 400 });
			}

			if (!Array.isArray(body.formFields)) {
				return NextResponse.json({ error: "Поля формы должны быть массивом" }, { status: 400 });
			}

			// Валидация полей формы
			for (const field of body.formFields) {
				if (!field.id || !field.type || !field.placeholder) {
					return NextResponse.json({ error: "Каждое поле формы должно иметь id, type и placeholder" }, { status: 400 });
				}

				if (field.type === "custom") {
					if (!field.firstFieldType || !field.secondFieldType) {
						return NextResponse.json({ error: "Кастомное поле должно иметь firstFieldType и secondFieldType" }, { status: 400 });
					}
					if (!field.firstFieldPlaceholder || !field.secondFieldPlaceholder) {
						return NextResponse.json({ error: "Кастомное поле должно иметь firstFieldPlaceholder и secondFieldPlaceholder" }, { status: 400 });
					}
					if (!field.separatorText) {
						return NextResponse.json({ error: "Кастомное поле должно иметь separatorText" }, { status: 400 });
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
