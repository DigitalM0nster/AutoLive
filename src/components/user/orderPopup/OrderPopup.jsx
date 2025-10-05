import { useState, useRef } from "react";
import styles from "@/components/user/loginPopup/styles.module.scss";
import { useUiStore } from "@/store/uiStore";

export default function OrderPopup() {
	const { isActiveOrderPopup, deactivateOrderPopup } = useUiStore();
	const [comment, setComment] = useState(""); // Состояние для textarea
	const textareaRef = useRef(null); // Реф для textarea

	// Функция для автоувеличения высоты textarea
	const handleInput = (e) => {
		setComment(e.target.value);
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto"; // Сбрасываем высоту
			requestAnimationFrame(() => {
				textarea.style.height = `${textarea.scrollHeight}px`; // Устанавливаем корректную высоту
			});
		}
	};

	return (
		<>
			<div className={`${styles.background} ${isActiveOrderPopup ? styles.active : ""}`} onClick={deactivateOrderPopup} />
			<div className={`${styles.orderPopup} ${styles.popup} ${isActiveOrderPopup ? styles.active : ""}`}>
				<div className={styles.inputsBlock}>
					<div className={styles.inputGroup}>
						<input type="text" placeholder="Vin код" />
						<div className="orText">или приложите фото</div>
						<input type="file" />
					</div>
					<input type="text" placeholder="Наименование детали" />
					<input type="phone" placeholder="Телефон для связи" />
					<textarea ref={textareaRef} value={comment} onInput={handleInput} placeholder="Комментарий (не обязательно)" className={styles.autoExpandTextarea} />
					<div className={`button ${styles.button}`} onClick={() => login(deactivateOrderPopup)}>
						Оставить заказ
					</div>
				</div>
				<div className={styles.closeIcon} onClick={deactivateOrderPopup}>
					<div className={styles.line} />
					<div className={styles.line} />
				</div>
			</div>
		</>
	);
}
