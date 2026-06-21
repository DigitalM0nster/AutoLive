"use client";

import React, { useMemo } from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { getPrepaymentInvoiceReadiness, openPrepaymentInvoiceDocument, type PrepaymentInvoiceDocumentData } from "@/lib/orderPrepaymentInvoice";
import type { OrderFormState, OrderItemClient, User } from "@/lib/types";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import OrderStatusBlock, { OrderStatusFieldGroup } from "../OrderStatusBlock";
import styles from "./StatusReadySection.module.scss";

type StatusReadySectionProps = {
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

const StatusReadySection: React.FC<StatusReadySectionProps> = ({
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
	const invoiceReadiness = useMemo(
		() =>
			getPrepaymentInvoiceReadiness({
				orderId,
				clientId: selectedClient?.id ?? (formData.clientId ? parseInt(formData.clientId, 10) : null),
				contactName: formData.contactName,
				contactPhone: formData.contactPhone,
				departmentName,
				orderItemsCount: orderItems.length,
				prepaymentAmount: formData.prepaymentAmount,
				prepaymentDate: formData.prepaymentDate,
			}),
		[
			orderId,
			selectedClient?.id,
			formData.clientId,
			formData.contactName,
			formData.contactPhone,
			departmentName,
			orderItems.length,
			formData.prepaymentAmount,
			formData.prepaymentDate,
		],
	);

	const handleGenerateInvoice = () => {
		if (!invoiceReadiness.canGenerate || !orderId) {
			return;
		}

		const prepaymentAmount = parseFloat(String(formData.prepaymentAmount).replace(",", "."));
		if (Number.isNaN(prepaymentAmount) || prepaymentAmount <= 0) {
			showErrorToast("Укажите корректную сумму предоплаты");
			return;
		}

		const buyerName = selectedClient ? formatClientName(selectedClient) : formData.contactName.trim();
		const buyerPhone = selectedClient?.phone?.trim() || formData.contactPhone.trim();

		const payload: PrepaymentInvoiceDocumentData = {
			orderId,
			orderCreatedAt,
			departmentName: departmentName || "—",
			buyerName,
			buyerPhone,
			managerName,
			prepaymentAmount,
			prepaymentDate: formData.prepaymentDate,
			orderTotal,
			items: orderItems,
		};

		try {
			openPrepaymentInvoiceDocument(payload);
		} catch (error) {
			showErrorToast(error instanceof Error ? error.message : "Не удалось сформировать счёт");
		}
	};

	return (
		<OrderStatusBlock step={4} title="Готов к выдаче" tone="ready" isActive={isActive} statusDate={statusDate}>
			<OrderStatusFieldGroup title="Выдача и предоплата" hint="Срок отложенной выдачи и данные для счёта на предоплату">
				<DatePickerField
					label="Отложен до"
					value={formData.readyUntil}
					onChange={(date) => {
						setFormData((prev) => ({ ...prev, readyUntil: date }));
						clearFieldError("readyUntil");
					}}
					placeholder="Выберите дату отложения"
					className={fieldErrors.has("readyUntil") ? `${datePickerFieldStyles.error}` : ""}
					disabled={!canEdit}
				/>

				<div className={styles.prepaymentRow}>
					<div className={styles.fieldBody}>
						<label htmlFor="prepaymentAmount">Сумма предоплаты</label>
						<input
							id="prepaymentAmount"
							type="number"
							value={formData.prepaymentAmount}
							onChange={(e) => {
								setFormData((prev) => ({ ...prev, prepaymentAmount: e.target.value }));
								clearFieldError("prepaymentAmount");
							}}
							onFocus={() => clearFieldError("prepaymentAmount")}
							placeholder="0.00"
							step="0.01"
							min="0"
							className={fieldErrors.has("prepaymentAmount") ? "error" : ""}
							disabled={!canEdit}
						/>
					</div>
					<div className={styles.fieldBody}>
						<DatePickerField
							label="Дата внесения предоплаты"
							value={formData.prepaymentDate}
							onChange={(date) => {
								setFormData((prev) => ({ ...prev, prepaymentDate: date }));
								clearFieldError("prepaymentDate");
							}}
							placeholder="Выберите дату предоплаты"
							className={fieldErrors.has("prepaymentDate") ? `${datePickerFieldStyles.error}` : ""}
							disabled={!canEdit}
						/>
					</div>
				</div>

				<div className={styles.invoiceBlock}>
					<button type="button" className={styles.generateBtn} onClick={handleGenerateInvoice} disabled={!invoiceReadiness.canGenerate}>
						Сформировать счёт
					</button>

					{!invoiceReadiness.canGenerate ? (
						<div className={styles.invoiceHint} role="status">
							<div className={styles.invoiceHintTitle}>Чтобы сформировать счёт, заполните:</div>
							<ul className={styles.invoiceHintList}>
								{invoiceReadiness.missing.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
					) : (
						<p className={styles.invoiceNote}>
							Откроется печатная форма счёта на предоплату — её можно сохранить в PDF или распечатать для клиента.
						</p>
					)}
				</div>
			</OrderStatusFieldGroup>
		</OrderStatusBlock>
	);
};

export default StatusReadySection;
