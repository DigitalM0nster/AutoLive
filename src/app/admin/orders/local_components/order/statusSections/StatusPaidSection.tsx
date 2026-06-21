"use client";

import React, { useMemo } from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import { getPaidDeliveryNoteReadiness, openPaidDeliveryNoteDocument, type PaidDeliveryNoteDocumentData } from "@/lib/orderPaidDeliveryNote";
import type { OrderFormState, OrderItemClient, User } from "@/lib/types";
import OrderStatusBlock, { OrderStatusFieldGroup } from "../OrderStatusBlock";
import styles from "./StatusPaidSection.module.scss";

type StatusPaidSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	statusDate?: string | null;
	orderId: number | null;
	orderItems: OrderItemClient[];
	orderTotal: number;
	selectedClient: User | null;
	departmentName: string | null;
	managerName: string | null;
	orderCreatedAt?: string | null;
};

function formatClientName(client: User): string {
	return [client.last_name, client.first_name, client.middle_name].filter(Boolean).join(" ").trim() || "Клиент";
}

const StatusPaidSection: React.FC<StatusPaidSectionProps> = ({
	isActive,
	formData,
	setFormData,
	canEdit,
	fieldErrors,
	clearFieldError,
	statusDate,
	orderId,
	orderItems,
	orderTotal,
	selectedClient,
	departmentName,
	managerName,
	orderCreatedAt,
}) => {
	const displayOrderAmount = formData.orderAmount || (orderTotal > 0 ? String(orderTotal) : "");

	const noteReadiness = useMemo(
		() =>
			getPaidDeliveryNoteReadiness({
				orderId,
				clientId: selectedClient?.id ?? (formData.clientId ? parseInt(formData.clientId, 10) : null),
				contactName: formData.contactName,
				contactPhone: formData.contactPhone,
				departmentName,
				orderItemsCount: orderItems.length,
				paymentDate: formData.paymentDate,
				orderAmount: displayOrderAmount,
				prepaymentAmount: formData.prepaymentAmount,
			}),
		[
			orderId,
			selectedClient?.id,
			formData.clientId,
			formData.contactName,
			formData.contactPhone,
			departmentName,
			orderItems.length,
			formData.paymentDate,
			displayOrderAmount,
			formData.prepaymentAmount,
		],
	);

	const handleDownloadNote = () => {
		if (!noteReadiness.canGenerate || !orderId) return;

		const orderAmount = parseFloat(String(displayOrderAmount).replace(",", "."));
		if (Number.isNaN(orderAmount) || orderAmount <= 0) {
			showErrorToast("Укажите корректную сумму заказа");
			return;
		}

		const prepaymentRaw = formData.prepaymentAmount.trim();
		const prepaymentAmount = prepaymentRaw ? parseFloat(prepaymentRaw.replace(",", ".")) : null;

		const payload: PaidDeliveryNoteDocumentData = {
			orderId,
			orderCreatedAt,
			departmentName: departmentName || "—",
			buyerName: selectedClient ? formatClientName(selectedClient) : formData.contactName.trim(),
			buyerPhone: selectedClient?.phone?.trim() || formData.contactPhone.trim(),
			managerName,
			paymentDate: formData.paymentDate,
			orderAmount,
			prepaymentAmount: prepaymentAmount != null && !Number.isNaN(prepaymentAmount) ? prepaymentAmount : null,
			items: orderItems,
		};

		try {
			openPaidDeliveryNoteDocument(payload);
		} catch (error) {
			showErrorToast(error instanceof Error ? error.message : "Не удалось сформировать накладную");
		}
	};

	return (
		<OrderStatusBlock step={5} title="Оплачен" tone="paid" isActive={isActive} statusDate={statusDate}>
			<OrderStatusFieldGroup title="Оплата" hint="Дата оплаты и накладная для выдачи товара клиенту">
				<div className={styles.paymentRow}>
					<div className={styles.fieldBody}>
						<DatePickerField
							label="Дата внесения оплаты"
							value={formData.paymentDate}
							onChange={(date) => {
								setFormData((prev) => ({ ...prev, paymentDate: date }));
								clearFieldError("paymentDate");
							}}
							placeholder="Выберите дату оплаты"
							className={fieldErrors.has("paymentDate") ? `${datePickerFieldStyles.error}` : ""}
							disabled={!canEdit}
						/>
					</div>
					<div className={styles.fieldBody}>
						<label htmlFor="orderAmountPaid">Сумма заказа</label>
						<input id="orderAmountPaid" type="text" value={displayOrderAmount ? `${displayOrderAmount} ₽` : "—"} readOnly disabled />
					</div>
				</div>

				<div className={styles.invoiceBlock}>
					<button type="button" className={styles.downloadBtn} onClick={handleDownloadNote} disabled={!noteReadiness.canGenerate}>
						Скачать накладную
					</button>

					{!noteReadiness.canGenerate ? (
						<div className={styles.invoiceHint} role="status">
							<div className={styles.invoiceHintTitle}>Чтобы скачать накладную, заполните:</div>
							<ul className={styles.invoiceHintList}>
								{noteReadiness.missing.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
					) : (
						<p className={styles.invoiceNote}>Откроется печатная форма накладной — можно сохранить в PDF или распечатать при выдаче.</p>
					)}
				</div>
			</OrderStatusFieldGroup>
		</OrderStatusBlock>
	);
};

export default StatusPaidSection;
