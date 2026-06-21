import React from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";
import OrderStatusBlock from "../OrderStatusBlock";

type StatusBookedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	statusDate?: string | null;
};

const StatusBookedSection: React.FC<StatusBookedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError, statusDate }) => {
	return (
		<OrderStatusBlock step={3} title="Забронирован" tone="booked" isActive={isActive} statusDate={statusDate}>
			<div className={`formField`}>
				<DatePickerField
					label="Забронирован до"
					value={formData.bookedUntil}
					onChange={(date) => {
						setFormData((prev) => ({ ...prev, bookedUntil: date }));
						clearFieldError("bookedUntil");
					}}
					placeholder="Выберите дату бронирования"
					className={fieldErrors.has("bookedUntil") ? `${datePickerFieldStyles.error}` : ""}
					disabled={!canEdit}
				/>
			</div>
		</OrderStatusBlock>
	);
};

export default StatusBookedSection;
