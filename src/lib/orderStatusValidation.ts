import type { OrderStatus } from "@/lib/types";

/** Позиция заказа для проверки обязательных полей по статусам */
export type OrderItemValidationShape = {
	product_sku: string;
	supplierDeliveryDate?: string | Date | null;
	carModel?: string | null;
	vinCode?: string | null;
};

export type OrderMergedValidationInput = {
	targetStatus: OrderStatus;
	/** Суперадмин назначил себя ответственным — отдел не обязателен */
	isSuperadminSelfResponsible: boolean;
	clientId: number | null;
	contactName: string | null | undefined;
	contactPhone: string | null | undefined;
	departmentId: number | null;
	managerId: number | null;
	managerDepartmentId: number | null;
	orderItems: OrderItemValidationShape[];
	finalDeliveryDate: string | Date | null | undefined;
	bookingId: number | null;
	bookingDepartmentId: number | null;
	deliveryPickupPointId: number | null;
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

export type OrderStatusIssue = { message: string; field: string };

const STATUS_ORDER: OrderStatus[] = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];

function parsePositiveNumber(value: number | string | null | undefined): number | null {
	if (value === null || value === undefined || value === "") return null;
	const n = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
	if (Number.isNaN(n) || n <= 0) return null;
	return n;
}

function hasText(value: string | null | undefined): boolean {
	return Boolean(value && String(value).trim());
}

function isMissingFinalDeliveryDate(value: string | Date | null | undefined): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string" && !value.trim()) return true;
	if (value instanceof Date && Number.isNaN(value.getTime())) return true;
	return false;
}

/** Начало календарного дня в локальной таймзоне (для сравнения дат поставки) */
function startOfLocalDayMs(value: string | Date): number | null {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	d.setHours(0, 0, 0, 0);
	return d.getTime();
}

/**
 * Проверяет, что для целевого статуса заполнены все поля по цепочке статусов (created → … → target).
 * Используется в админ-форме и в API при сохранении заказа.
 */
export function validateOrderMergedStateForStatus(input: OrderMergedValidationInput): OrderStatusIssue[] {
	const issues: OrderStatusIssue[] = [];
	const idx = STATUS_ORDER.indexOf(input.targetStatus);
	if (idx < 0) {
		return [{ message: "Некорректный статус заказа", field: "status" }];
	}

	const push = (message: string, field: string) => issues.push({ message, field });

	// --- 1. Новый ---
	if (idx >= 0) {
		if (!input.clientId) {
			if (!hasText(input.contactName)) push("Имя клиента (лида)", "contactName");
			if (!hasText(input.contactPhone)) push("Контактный телефон", "contactPhone");
		}
		if (!input.orderItems || input.orderItems.length === 0) {
			push("Состав заказа", "productSearch");
		} else {
			for (const item of input.orderItems) {
				if (!hasText(item.carModel)) {
					push(`Модель автомобиля (позиция ${item.product_sku})`, `carModel_${item.product_sku}`);
				}
				if (!hasText(item.vinCode)) {
					push(`VIN-код (позиция ${item.product_sku})`, `vinCode_${item.product_sku}`);
				}
			}
		}

		// Дата поставки поставщиком по позиции не может быть позже даты финальной поставки клиенту
		if (!isMissingFinalDeliveryDate(input.finalDeliveryDate) && input.finalDeliveryDate != null && input.orderItems?.length) {
			const finalMs = startOfLocalDayMs(input.finalDeliveryDate as string | Date);
			if (finalMs != null) {
				for (const item of input.orderItems) {
					if (!item.supplierDeliveryDate) continue;
					const supplierMs = startOfLocalDayMs(item.supplierDeliveryDate as string | Date);
					if (supplierMs == null) continue;
					if (supplierMs > finalMs) {
						push(
							`Дата поставки поставщиком не может быть позже даты финальной поставки клиенту (позиция ${item.product_sku})`,
							`supplierDeliveryDate_${item.product_sku}`,
						);
					}
				}
			}
		}
	}

	// --- 2. Подтверждён ---
	if (idx >= 1) {
		if (!input.clientId) push("Клиент", "clientSearch");

		if (!input.isSuperadminSelfResponsible) {
			if (input.departmentId == null) push("Отдел", "departmentId");
		} else if (input.departmentId != null) {
			push("При назначении себя ответственным отдел должен быть пустым", "departmentId");
		}

		if (!input.managerId) {
			push("Ответственный менеджер", "managerSearch");
		} else if (input.departmentId != null && input.managerDepartmentId != null && input.managerDepartmentId !== input.departmentId) {
			push("Ответственный менеджер должен быть из выбранного отдела", "managerSearch");
		}

		if (!input.orderItems || input.orderItems.length === 0) {
			push("Состав заказа", "productSearch");
		} else {
			for (const item of input.orderItems) {
				if (!hasText(item.supplierDeliveryDate as string | undefined)) {
					push(`Дата поставки поставщиком (позиция ${item.product_sku})`, "supplierDeliveryDate");
				}
			}
		}

		if (isMissingFinalDeliveryDate(input.finalDeliveryDate)) {
			push("Дата финальной поставки клиенту", "finalDeliveryDate");
		}

		// Связанная запись и адрес доставки — в блоке «Новый», не обязательны для «Подтверждён»
	}

	// --- 3. Забронирован ---
	if (idx >= 2) {
		if (!hasText(input.bookedUntil)) push("Забронирован до", "bookedUntil");
	}

	// --- 4. Готов к выдаче ---
	if (idx >= 3) {
		if (!hasText(input.readyUntil)) push("Отложен до", "readyUntil");
		if (parsePositiveNumber(input.prepaymentAmount) == null) push("Сумма предоплаты", "prepaymentAmount");
		if (!hasText(input.prepaymentDate)) push("Дата внесения предоплаты", "prepaymentDate");
	}

	// --- 5. Оплачен ---
	if (idx >= 4) {
		if (!hasText(input.paymentDate)) push("Дата внесения оплаты", "paymentDate");
		if (parsePositiveNumber(input.orderAmount) == null) push("Сумма заказа", "orderAmount");
	}

	// --- 6. Выполнен ---
	if (idx >= 5) {
		if (!hasText(input.completionDate)) push("Дата выполнения", "completionDate");
	}

	// --- 7. Возврат ---
	if (idx >= 6) {
		if (!hasText(input.returnReason)) push("Причина возврата позиции", "returnReason");
		if (!hasText(input.returnDate)) push("Дата возврата позиции", "returnDate");
		if (parsePositiveNumber(input.returnAmount) == null) push("Сумма возврата", "returnAmount");
		if (!hasText(input.returnPaymentDate)) push("Дата возврата денежных средств", "returnPaymentDate");
		if (!hasText(input.returnDocumentNumber)) push("Номер документа возврата средств", "returnDocumentNumber");
	}

	return issues;
}
