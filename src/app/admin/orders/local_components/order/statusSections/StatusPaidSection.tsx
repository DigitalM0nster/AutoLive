import React, { useState, useEffect } from "react";
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
};

const StatusPaidSection: React.FC<StatusPaidSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError }) => {
	const [isExpanded, setIsExpanded] = useState(isActive);

	// Синхронизируем состояние развернутости с активным статусом
	useEffect(() => {
		setIsExpanded(isActive);
	}, [isActive]);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div className={`statusBlock borderBlock ${isExpanded ? "active" : ""}`}>
			<div className={`statusHeader`} onClick={toggleExpand}>
				<h3>5. Оплачен</h3>
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
