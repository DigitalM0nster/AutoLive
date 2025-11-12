import React from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";

type StatusReturnedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
};

const StatusReturnedSection: React.FC<StatusReturnedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError }) => {
	return (
		<div className={`statusBlock borderBlock ${isActive ? "active" : ""}`}>
			<div className={`statusHeader`}>
				<h3>7. Возврат</h3>
			</div>
			<div className={`statusFields`}>
				<div className={`formField`}>
					<label>Причина возврата позиции</label>
					<textarea
						value={formData.returnReason}
						onChange={(e) => setFormData((prev) => ({ ...prev, returnReason: e.target.value }))}
						placeholder="Укажите причину возврата"
						rows={3}
						disabled={!canEdit}
					/>
				</div>
				<div className={`formRow`}>
					<div className={`formField`}>
						<DatePickerField
							label="Дата возврата позиции"
							value={formData.returnDate}
							onChange={(date) => {
								setFormData((prev) => ({ ...prev, returnDate: date }));
								clearFieldError("returnDate");
							}}
							placeholder="Выберите дату возврата"
							className={fieldErrors.has("returnDate") ? `${datePickerFieldStyles.error}` : ""}
							disabled={!canEdit}
						/>
					</div>
					<div className={`formField`}>
						<label>Сумма возврата</label>
						<input
							type="number"
							value={formData.returnAmount}
							onChange={(e) => setFormData((prev) => ({ ...prev, returnAmount: e.target.value }))}
							placeholder="0.00"
							step="0.01"
							min="0"
							disabled={!canEdit}
						/>
					</div>
				</div>
				<div className={`formRow`}>
					<div className={`formField`}>
						<DatePickerField
							label="Дата возврата денежных средств"
							value={formData.returnPaymentDate}
							onChange={(date) => {
								setFormData((prev) => ({ ...prev, returnPaymentDate: date }));
								clearFieldError("returnPaymentDate");
							}}
							placeholder="Выберите дату возврата средств"
							className={fieldErrors.has("returnPaymentDate") ? `${datePickerFieldStyles.error}` : ""}
							disabled={!canEdit}
						/>
					</div>
					<div className={`formField`}>
						<label>Номер документа возврата средств</label>
						<input
							type="text"
							value={formData.returnDocumentNumber}
							onChange={(e) => setFormData((prev) => ({ ...prev, returnDocumentNumber: e.target.value }))}
							placeholder="Номер документа"
							disabled={!canEdit}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StatusReturnedSection;
