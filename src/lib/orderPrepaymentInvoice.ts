import type { OrderItemClient } from "@/lib/types";

/** Данные для проверки, можно ли сформировать счёт на предоплату */
export type PrepaymentInvoiceReadinessInput = {
	orderId: number | null;
	clientId: number | null;
	contactName: string;
	contactPhone: string;
	departmentName: string | null;
	orderItemsCount: number;
	prepaymentAmount: string;
	prepaymentDate: string;
};

export type PrepaymentInvoiceReadiness = {
	canGenerate: boolean;
	missing: string[];
};

function hasText(value: string | null | undefined): boolean {
	return Boolean(value && String(value).trim());
}

function parsePositiveNumber(value: string | null | undefined): number | null {
	if (value === null || value === undefined || value === "") return null;
	const n = parseFloat(String(value).replace(",", "."));
	if (Number.isNaN(n) || n <= 0) return null;
	return n;
}

/** Какие поля нужно заполнить, чтобы стала доступна кнопка «Сформировать счёт» */
export function getPrepaymentInvoiceReadiness(input: PrepaymentInvoiceReadinessInput): PrepaymentInvoiceReadiness {
	const missing: string[] = [];

	if (!input.orderId) {
		missing.push("Сохраните заказ — счёт формируется только для сохранённого заказа");
	}

	const hasClient = Boolean(input.clientId);
	const hasLeadContact = hasText(input.contactName) && hasText(input.contactPhone);
	if (!hasClient && !hasLeadContact) {
		missing.push("Клиент или контактные данные (имя и телефон)");
	}

	if (!input.orderItemsCount) {
		missing.push("Состав заказа — добавьте хотя бы одну позицию");
	}

	if (!hasText(input.departmentName)) {
		missing.push("Отдел заказа");
	}

	if (parsePositiveNumber(input.prepaymentAmount) == null) {
		missing.push("Сумма предоплаты больше 0");
	}

	if (!hasText(input.prepaymentDate)) {
		missing.push("Дата внесения предоплаты");
	}

	return {
		canGenerate: missing.length === 0,
		missing,
	};
}

export type PrepaymentInvoiceDocumentData = {
	orderId: number;
	orderCreatedAt?: string | null;
	departmentName: string;
	buyerName: string;
	buyerPhone: string;
	managerName?: string | null;
	prepaymentAmount: number;
	prepaymentDate: string;
	orderTotal: number;
	items: OrderItemClient[];
};

function formatMoney(value: number): string {
	return `${value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

function formatRuDate(value: string): string {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString("ru-RU");
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Печатная HTML-страница счёта на предоплату */
export function buildPrepaymentInvoiceHtml(data: PrepaymentInvoiceDocumentData): string {
	const rows = data.items
		.map((item, index) => {
			const lineTotal = item.product_price * item.quantity;
			return `<tr>
				<td>${index + 1}</td>
				<td>${escapeHtml(item.product_title)}</td>
				<td>${escapeHtml(item.product_sku)}</td>
				<td>${escapeHtml(item.product_brand || "—")}</td>
				<td class="num">${item.quantity}</td>
				<td class="num">${formatMoney(item.product_price)}</td>
				<td class="num">${formatMoney(lineTotal)}</td>
			</tr>`;
		})
		.join("");

	const issuedAt = new Date().toLocaleDateString("ru-RU");
	const orderDate = data.orderCreatedAt ? formatRuDate(data.orderCreatedAt) : "—";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Счёт на предоплату №${data.orderId}</title>
	<style>
		* { box-sizing: border-box; }
		body { font-family: Arial, sans-serif; color: #111; margin: 32px; font-size: 14px; line-height: 1.45; }
		h1 { margin: 0 0 8px; font-size: 22px; }
		.meta { margin-bottom: 24px; color: #444; }
		.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin-bottom: 24px; }
		.block { border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; }
		.blockTitle { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; margin-bottom: 6px; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
		th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; vertical-align: top; }
		th { background: #f5f5f5; font-size: 12px; }
		td.num, th.num { text-align: right; white-space: nowrap; }
		.totals { margin-left: auto; width: min(360px, 100%); }
		.totalsRow { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid #eee; }
		.totalsRow strong { font-size: 16px; }
		.note { margin-top: 24px; font-size: 13px; color: #555; }
		@media print { body { margin: 16px; } }
	</style>
</head>
<body>
	<h1>Счёт на предоплату №${data.orderId}</h1>
	<div class="meta">Дата формирования: ${issuedAt} · Заказ от ${orderDate}</div>

	<div class="grid">
		<div class="block">
			<div class="blockTitle">Поставщик</div>
			<div><strong>${escapeHtml(data.departmentName)}</strong></div>
			${data.managerName ? `<div>Ответственный: ${escapeHtml(data.managerName)}</div>` : ""}
		</div>
		<div class="block">
			<div class="blockTitle">Плательщик</div>
			<div><strong>${escapeHtml(data.buyerName)}</strong></div>
			<div>${escapeHtml(data.buyerPhone)}</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование</th>
				<th>Артикул</th>
				<th>Бренд</th>
				<th class="num">Кол-во</th>
				<th class="num">Цена</th>
				<th class="num">Сумма</th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>

	<div class="totals">
		<div class="totalsRow"><span>Сумма заказа</span><span>${formatMoney(data.orderTotal)}</span></div>
		<div class="totalsRow"><span>Дата предоплаты</span><span>${escapeHtml(formatRuDate(data.prepaymentDate))}</span></div>
		<div class="totalsRow"><strong>К оплате (предоплата)</strong><strong>${formatMoney(data.prepaymentAmount)}</strong></div>
	</div>

	<p class="note">Документ сформирован в админ-панели AutoLive для передачи клиенту. Реквизиты организации добавляются отдельно при необходимости.</p>
	<script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}

/** Открывает счёт в новой вкладке и запускает печать / сохранение в PDF */
export function openPrepaymentInvoiceDocument(data: PrepaymentInvoiceDocumentData): void {
	const html = buildPrepaymentInvoiceHtml(data);
	const blob = new Blob([html], { type: "text/html;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const win = window.open(url, "_blank", "noopener,noreferrer");
	if (!win) {
		URL.revokeObjectURL(url);
		throw new Error("Не удалось открыть окно печати. Разрешите всплывающие окна в браузере.");
	}
	win.addEventListener("load", () => {
		URL.revokeObjectURL(url);
	});
}
