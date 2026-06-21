import React from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";
import OrderStatusBlock from "../OrderStatusBlock";

type StatusCompletedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	statusDate?: string | null;
};

const StatusCompletedSection: React.FC<StatusCompletedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError, statusDate }) => {
	return (
		<OrderStatusBlock step={6} title="Выполнен" tone="completed" isActive={isActive} statusDate={statusDate}>
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
		</OrderStatusBlock>
	);
};

export default StatusCompletedSection;
