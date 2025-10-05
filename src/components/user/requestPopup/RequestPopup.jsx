import { useState } from "react";
import styles from "../loginPopup/styles.module.scss";

export default function RequestPopup({ requestPopupActive, handleCloseRequestPopup, handleRequestSubmit }) {
	const [file, setFile] = useState(null);

	const handleFileChange = (event) => {
		const selectedFile = event.target.files[0];
		if (selectedFile) {
			setFile(selectedFile);
		}
	};

	return (
		<>
			<div className={`${styles.background} ${requestPopupActive ? styles.active : ""}`} onClick={handleCloseRequestPopup} />
			<div className={`${styles.requestPopup} ${styles.popup} ${requestPopupActive ? styles.active : ""}`}>
				<div className={styles.inputsBlock}>
					<input type="text" placeholder="Введите ваш телефон" />
					<input type="text" placeholder="Введите ваше имя" />
					<textarea type="text" placeholder="Введите комментарий" />
					<div className={styles.photoBlock} onClick={() => document.getElementById("fileUpload").click()}>
						<div className={styles.photoIcon} />
						<div className={styles.photoText}>{file ? file.name : "Загрузить фото вин кода"}</div>
						<input id="fileUpload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
					</div>
					<div className={`button ${styles.button}`} onClick={() => handleRequestSubmit(file)}>
						Оставить заказ
					</div>
				</div>
				<div className={styles.closeIcon} onClick={handleCloseRequestPopup}>
					<div className={styles.line} />
					<div className={styles.line} />
				</div>
			</div>
		</>
	);
}
