import React from "react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { OrderFormState } from "@/lib/types";
import OrderStatusBlock, { OrderStatusFieldGroup } from "../OrderStatusBlock";

type StatusReturnedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	canEdit: boolean;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	statusDate?: string | null;
};

const StatusReturnedSection: React.FC<StatusReturnedSectionProps> = ({ isActive, formData, setFormData, canEdit, fieldErrors, clearFieldError, statusDate }) => {
	return (
		<OrderStatusBlock step={7} title="Возврат" tone="returned" isActive={isActive} statusDate={statusDate}>
			<OrderStatusFieldGroup title="Причина и позиция">
				<div className={`formField`}>
					<label>Причина возврата позиции</label>
					<textarea
						value={formData.returnReason}
						onChange={(e) => {
							setFormData((prev) => ({ ...prev, returnReason: e.target.value }));
							clearFieldError("returnReason");
						}}
						onFocus={() => clearFieldError("returnReason")}
						placeholder="Укажите причину возврата"
						rows={3}
						className={fieldErrors.has("returnReason") ? "error" : ""}
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
							onChange={(e) => {
								setFormData((prev) => ({ ...prev, returnAmount: e.target.value }));
								clearFieldError("returnAmount");
							}}
							onFocus={() => clearFieldError("returnAmount")}
							placeholder="0.00"
							step="0.01"
							min="0"
							className={fieldErrors.has("returnAmount") ? "error" : ""}
							disabled={!canEdit}
						/>
					</div>
				</div>
			</OrderStatusFieldGroup>

			<OrderStatusFieldGroup title="Возврат средств">
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
							onChange={(e) => {
								setFormData((prev) => ({ ...prev, returnDocumentNumber: e.target.value }));
								clearFieldError("returnDocumentNumber");
							}}
							onFocus={() => clearFieldError("returnDocumentNumber")}
							placeholder="Номер документа"
							className={fieldErrors.has("returnDocumentNumber") ? "error" : ""}
							disabled={!canEdit}
						/>
					</div>
				</div>
			</OrderStatusFieldGroup>
		</OrderStatusBlock>
	);
};

export default StatusReturnedSection;
