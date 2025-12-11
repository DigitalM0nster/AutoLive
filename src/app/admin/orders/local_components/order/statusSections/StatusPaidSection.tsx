import React, { useState } from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";

type StatusPaidSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	statusDate?: string | null;
};

const StatusPaidSection: React.FC<StatusPaidSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError, statusDate }) => {
	const formatDate = (value?: string | Date | null) => {
		if (!value) return "";
		const date = new Date(value);
		if (isNaN(date.getTime())) return "";
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} ${hours}:${minutes}`;
	};
	const [isExpanded, setIsExpanded] = useState(isActive);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div className={`statusBlock borderBlock ${isExpanded ? "active" : ""}`}>
			<div className={`statusHeader`} onClick={toggleExpand}>
				<h3>5. Оплачен</h3>
				{statusDate && <span className={`statusDate`}>Присвоен: {formatDate(statusDate)}</span>}
			</div>
			<div className={`statusFields`}>
				<div className={`formRow`}>
					<div className={`formField`}>
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
					<div className={`formField`}>
						<label>Сумма заказа</label>
						<input
							type="number"
							value={formData.orderAmount}
							onChange={(e) => setFormData((prev) => ({ ...prev, orderAmount: e.target.value }))}
							placeholder="0.00"
							step="0.01"
							min="0"
							readOnly
							className={`readonlyField`}
						/>
					</div>
				</div>
				<div className={`formField`}>
					<button type="button" className={`downloadInvoiceButton`}>
						Скачать накладную
					</button>
				</div>
			</div>
		</div>
	);
};

export default StatusPaidSection;
