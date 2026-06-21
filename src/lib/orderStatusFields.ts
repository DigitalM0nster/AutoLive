/** Поля этапов заказа после «Подтверждён» — хранятся в таблице order */

export type OrderStatusFieldsBody = {
	bookedUntil?: string | null;
	readyUntil?: string | null;
	prepaymentAmount?: number | string | null;
	prepaymentDate?: string | null;
	paymentDate?: string | null;
	orderAmount?: number | string | null;
	completionDate?: string | null;
	returnReason?: string | null;
	returnDate?: string | null;
	returnAmount?: number | string | null;
	returnPaymentDate?: string | null;
	returnDocumentNumber?: string | null;
};

export type OrderStatusFieldsRecord = {
	bookedUntil?: Date | string | null;
	readyUntil?: Date | string | null;
	prepaymentAmount?: number | null;
	prepaymentDate?: Date | string | null;
	paymentDate?: Date | string | null;
	orderAmount?: number | null;
	completionDate?: Date | string | null;
	returnReason?: string | null;
	returnDate?: Date | string | null;
	returnAmount?: number | null;
	returnPaymentDate?: Date | string | null;
	returnDocumentNumber?: string | null;
};

/** ISO-строка для DatePickerField или пустая строка */
export function orderDateToFormValue(value: Date | string | null | undefined): string {
	if (value === null || value === undefined) return "";
	const d = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(d.getTime())) return "";
	return d.toISOString();
}

export function orderAmountToFormValue(value: number | null | undefined): string {
	if (value === null || value === undefined || Number.isNaN(value)) return "";
	return String(value);
}

export function orderStatusFieldsToFormState(order: OrderStatusFieldsRecord) {
	return {
		bookedUntil: orderDateToFormValue(order.bookedUntil),
		readyUntil: orderDateToFormValue(order.readyUntil),
		prepaymentAmount: orderAmountToFormValue(order.prepaymentAmount),
		prepaymentDate: orderDateToFormValue(order.prepaymentDate),
		paymentDate: orderDateToFormValue(order.paymentDate),
		orderAmount: orderAmountToFormValue(order.orderAmount),
		completionDate: orderDateToFormValue(order.completionDate),
		returnReason: order.returnReason?.trim() || "",
		returnDate: orderDateToFormValue(order.returnDate),
		returnAmount: orderAmountToFormValue(order.returnAmount),
		returnPaymentDate: orderDateToFormValue(order.returnPaymentDate),
		returnDocumentNumber: order.returnDocumentNumber?.trim() || "",
	};
}

/** Парсинг даты из тела API: undefined — не менять, null — очистить */
export function parseOptionalBodyDate(value: unknown): Date | null | undefined {
	if (value === undefined) return undefined;
	if (value === null || value === "") return null;
	const d = new Date(String(value));
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

export function parseOptionalBodyAmount(value: unknown): number | null | undefined {
	if (value === undefined) return undefined;
	if (value === null || value === "") return null;
	const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
	if (Number.isNaN(n)) return null;
	return n;
}

/** Записывает поля этапов в объект updateData Prisma */
export function applyOrderStatusFieldsToUpdate(body: OrderStatusFieldsBody, updateData: Record<string, unknown>) {
	const dateKeys = ["bookedUntil", "readyUntil", "prepaymentDate", "paymentDate", "completionDate", "returnDate", "returnPaymentDate"] as const;
	for (const key of dateKeys) {
		if (body[key] !== undefined) {
			updateData[key] = parseOptionalBodyDate(body[key]);
		}
	}

	const amountKeys = ["prepaymentAmount", "orderAmount", "returnAmount"] as const;
	for (const key of amountKeys) {
		if (body[key] !== undefined) {
			updateData[key] = parseOptionalBodyAmount(body[key]);
		}
	}

	if (body.returnReason !== undefined) {
		updateData.returnReason = body.returnReason?.trim() || null;
	}
	if (body.returnDocumentNumber !== undefined) {
		updateData.returnDocumentNumber = body.returnDocumentNumber?.trim() || null;
	}
}

/** Для валидации статуса: тело запроса + сохранённые в БД значения */
export function mergeOrderStatusFieldsForValidation(body: OrderStatusFieldsBody, stored: OrderStatusFieldsRecord): OrderStatusFieldsBody {
	const pickDate = (bodyVal: string | null | undefined, storedVal: Date | string | null | undefined) => {
		if (bodyVal !== undefined) return bodyVal;
		if (storedVal === null || storedVal === undefined) return storedVal ?? undefined;
		return storedVal instanceof Date ? storedVal.toISOString() : storedVal;
	};

	return {
		bookedUntil: pickDate(body.bookedUntil, stored.bookedUntil),
		readyUntil: pickDate(body.readyUntil, stored.readyUntil),
		prepaymentAmount: body.prepaymentAmount !== undefined ? body.prepaymentAmount : stored.prepaymentAmount,
		prepaymentDate: pickDate(body.prepaymentDate, stored.prepaymentDate),
		paymentDate: pickDate(body.paymentDate, stored.paymentDate),
		orderAmount: body.orderAmount !== undefined ? body.orderAmount : stored.orderAmount,
		completionDate: pickDate(body.completionDate, stored.completionDate),
		returnReason: body.returnReason !== undefined ? body.returnReason : stored.returnReason,
		returnDate: pickDate(body.returnDate, stored.returnDate),
		returnAmount: body.returnAmount !== undefined ? body.returnAmount : stored.returnAmount,
		returnPaymentDate: pickDate(body.returnPaymentDate, stored.returnPaymentDate),
		returnDocumentNumber: body.returnDocumentNumber !== undefined ? body.returnDocumentNumber : stored.returnDocumentNumber,
	};
}

/** Сборка полей для create */
export function buildOrderStatusFieldsForCreate(body: OrderStatusFieldsBody): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	applyOrderStatusFieldsToUpdate(body, data);
	return data;
}
