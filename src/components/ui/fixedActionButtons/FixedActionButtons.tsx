"use client";

import React from "react";

type FixedActionButtonsProps = {
	onCancel: () => void;
	onSave: () => void;
	isSaving?: boolean;
	cancelText?: string;
	saveText?: string;
	disabled?: boolean;
};

/**
 * Универсальный компонент фиксированных кнопок действий формы
 * Кнопки отображаются внизу экрана (fixed position)
 * Используется для создания/редактирования различных сущностей
 */
export default function FixedActionButtons({ onCancel, onSave, isSaving = false, cancelText = "Отменить", saveText = "Сохранить", disabled = false }: FixedActionButtonsProps) {
	return (
		<div className="fixedButtons">
			<button onClick={onCancel} className="secondaryButton" disabled={isSaving || disabled}>
				{cancelText}
			</button>
			<button onClick={onSave} className="primaryButton" disabled={isSaving || disabled}>
				{isSaving ? "Сохранение..." : saveText}
			</button>
		</div>
	);
}
