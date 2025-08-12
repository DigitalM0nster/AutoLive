// src\components\ui\confirmModal\ConfirmPopup.tsx

"use client";

import React from "react";
import styles from "./styles.module.scss";

type ConfirmPopupProps = {
	open: boolean;
	title: string;
	children?: React.ReactNode; // Новый пропс для React элементов
	message?: string; // Оставляем для обратной совместимости
	confirmText?: string;
	cancelText?: string;
	confirmButtonClassName?: string;
	cancelButtonClassName?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export default function ConfirmPopup({
	open,
	title,
	children,
	message,
	confirmText = "Удалить",
	cancelText = "Отмена",
	confirmButtonClassName,
	cancelButtonClassName,
	onConfirm,
	onCancel,
}: ConfirmPopupProps) {
	if (!open) return null;

	return (
		<div className={`popup confirmPopup ${styles.confirmPopup}`}>
			<div className={`background ${styles.background}`} onClick={onCancel} />
			<div className={`contentBlock ${styles.contentBlock}`}>
				<div className="popupHeader">
					<h2 className={`title ${styles.title}`}>{title}</h2>
				</div>
				<div className="popupBody">
					{children ? <div className={`content ${styles.content}`}>{children}</div> : <p className={`message ${styles.message}`}>{message}</p>}
				</div>
				<div className="popupFooter">
					<div className={`buttonsBlock ${styles.buttonsBlock}`}>
						<button onClick={onCancel} className={`${cancelButtonClassName ?? `cancelButton ${styles.cancelButton}`}`}>
							{cancelText}
						</button>
						<button
							onClick={onConfirm}
							// если передали класс — используем его, иначе — дефолтный "красный"
							className={`button ${confirmButtonClassName ?? ""}`}
						>
							{confirmText}
						</button>
					</div>
				</div>
				<div className="closeIcon" onClick={onCancel}>
					<div className="line" />
					<div className="line" />
				</div>
			</div>
		</div>
	);
}
