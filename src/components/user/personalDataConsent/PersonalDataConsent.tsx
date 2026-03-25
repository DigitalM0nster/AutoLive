"use client";

import Link from "next/link";
import { PRIVACY_POLICY_PATH } from "@/lib/consentConstants";
import styles from "./PersonalDataConsent.module.scss";

type Props = {
	checked: boolean;
	onChange: (next: boolean) => void;
	/** Показать ошибку, если пытались отправить форму без галочки */
	showError?: boolean;
	id?: string;
	/** Доп. класс к обёртке (отступы в формах) */
	wrapperClassName?: string;
};

/**
 * Единый блок: согласие на обработку персональных данных + ссылка на политику.
 */
export default function PersonalDataConsent({ checked, onChange, showError, id = "personal-data-consent", wrapperClassName }: Props) {
	return (
		<div className={`${styles.wrap} ${wrapperClassName ?? ""}`.trim()}>
			<div className={styles.row}>
				<input
					id={id}
					type="checkbox"
					className={styles.checkbox}
					checked={checked}
					onChange={(e) => onChange(e.target.checked)}
					aria-invalid={showError && !checked}
				/>
				<label htmlFor={id} className={styles.label}>
					Я согласен на{" "}
					<Link href={PRIVACY_POLICY_PATH} className={styles.link} target="_blank" rel="noopener noreferrer">
						обработку персональных данных
					</Link>
				</label>
			</div>
			{showError && !checked && <div className={styles.errorText}>Отметьте согласие, чтобы продолжить.</div>}
		</div>
	);
}
