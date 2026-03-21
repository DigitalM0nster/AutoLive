// Подписи статусов для личного кабинета клиента (как в админке)

import type { OrderStatus } from "@/lib/types";

const ORDER_STATUS_RU: Record<OrderStatus, string> = {
	created: "Новый",
	confirmed: "Подтверждён",
	booked: "Забронирован",
	ready: "Готов к выдаче",
	paid: "Оплачен",
	completed: "Выполнен",
	returned: "Возврат",
};

export function orderStatusLabelRu(status: string): string {
	return ORDER_STATUS_RU[status as OrderStatus] ?? status;
}

export function bookingStatusLabelRu(status: string): string {
	switch (status) {
		case "scheduled":
			return "Запланирована";
		case "confirmed":
			return "Подтверждена";
		case "completed":
			return "Выполнена";
		case "cancelled":
			return "Отменена";
		case "no_show":
			return "Не явился";
		default:
			return status;
	}
}
