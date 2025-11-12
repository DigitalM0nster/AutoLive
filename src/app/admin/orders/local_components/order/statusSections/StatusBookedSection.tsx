import React from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";

type StatusBookedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
};

const StatusBookedSection: React.FC<StatusBookedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError }) => {
	return (
		<div className={`statusBlock borderBlock ${isActive ? "active" : ""}`}>
			<div className={`statusHeader`}>
				<h3>3. Забронирован</h3>
			</div>
			<div className={`statusFields`}>
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
			</div>
		</div>
	);
};

export default StatusBookedSection;
