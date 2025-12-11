import React, { useState } from "react";
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
	statusDate?: string | null;
};

const StatusBookedSection: React.FC<StatusBookedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError, statusDate }) => {
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
				<h3>3. Забронирован</h3>
				{statusDate && <span className={`statusDate`}>Присвоен: {formatDate(statusDate)}</span>}
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
