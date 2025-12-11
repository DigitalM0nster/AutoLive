import React, { useState, useEffect } from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";

type StatusCompletedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
};

const StatusCompletedSection: React.FC<StatusCompletedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError }) => {
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
				<h3>6. Выполнен</h3>
			</div>
			<div className={`statusFields`}>
				<div className={`formField`}>
					<DatePickerField
						label="Дата выполнения"
						value={formData.completionDate}
						onChange={(date) => {
							setFormData((prev) => ({ ...prev, completionDate: date }));
							clearFieldError("completionDate");
						}}
						placeholder="Выберите дату выполнения"
						className={fieldErrors.has("completionDate") ? `${datePickerFieldStyles.error}` : ""}
						disabled={!canEdit}
					/>
				</div>
			</div>
		</div>
	);
};

export default StatusCompletedSection;
