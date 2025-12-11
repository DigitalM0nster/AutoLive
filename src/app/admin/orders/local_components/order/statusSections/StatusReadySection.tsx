import React, { useState, useEffect } from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";

type StatusReadySectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
};

const StatusReadySection: React.FC<StatusReadySectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError }) => {
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
				<h3>4. Готов к выдаче</h3>
			</div>
			<div className={`statusFields`}>
				<div className={`formRow`}>
					<div className={`formField`}>
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
					</div>
					<div className={`formField`}>
						<label>Сумма предоплаты</label>
						<input
							type="number"
							value={formData.prepaymentAmount}
							onChange={(e) => setFormData((prev) => ({ ...prev, prepaymentAmount: e.target.value }))}
							placeholder="0.00"
							step="0.01"
							min="0"
							disabled={!canEdit}
						/>
					</div>
				</div>
				<div className={`formField`}>
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
				<div className={`formField`}>
					<button type="button" className={`generateInvoiceButton`}>
						Сформировать счёт
					</button>
				</div>
			</div>
		</div>
	);
};

export default StatusReadySection;
