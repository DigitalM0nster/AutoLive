"use client";

import React from "react";
import styles from "./styles.module.scss";

type ConfirmVariant = "primary" | "danger";

type ConfirmPopupProps = {
	open: boolean;
	title: string;
	subtitle?: string;
	children?: React.ReactNode;
	message?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: ConfirmVariant;
	confirmButtonClassName?: string;
	cancelButtonClassName?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export default function ConfirmPopup({
	open,
	title,
	subtitle,
	children,
	message,
	confirmText = "Удалить",
	cancelText = "Отмена",
	variant = "primary",
	confirmButtonClassName,
	cancelButtonClassName,
	onConfirm,
	onCancel,
}: ConfirmPopupProps) {
	if (!open) return null;

	const confirmClass =
		confirmButtonClassName ??
		`${styles.confirmButton} ${variant === "danger" ? styles.confirmButtonDanger : styles.confirmButtonPrimary}`;

	return (
		<div className={`popup confirmPopup ${styles.confirmPopup}`} role="dialog" aria-modal="true" aria-labelledby="confirm-popup-title">
			<div className={`background ${styles.background}`} onClick={onCancel} />
			<div className={`contentBlock ${styles.contentBlock}`}>
				<div className={styles.popupHeader}>
					<h2 id="confirm-popup-title" className={styles.title}>
						{title}
					</h2>
					{subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
				</div>

				<div className={styles.popupBody}>
					{children ? <div className={styles.content}>{children}</div> : message ? <p className={styles.message}>{message}</p> : null}
				</div>

				<div className={styles.popupFooter}>
					<div className={styles.buttonsBlock}>
						<button type="button" onClick={onCancel} className={cancelButtonClassName ?? styles.cancelButton}>
							{cancelText}
						</button>
						<button type="button" onClick={onConfirm} className={confirmClass}>
							{confirmText}
						</button>
					</div>
				</div>

				<button type="button" className={styles.closeIcon} onClick={onCancel} aria-label="Закрыть">
					<span className={styles.closeLine} />
					<span className={styles.closeLine} />
				</button>
			</div>
		</div>
	);
}
