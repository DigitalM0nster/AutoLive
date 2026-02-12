"use client";

import React from "react";
import styles from "../local_components/styles.module.scss";

export default function AdminContactsContent() {
	return (
		<div className="screenContent">
			<div className={styles.screenContent}>
				<h1 className={styles.contentTitle}>Редактирование страницы контактов</h1>
				<div className={styles.contentEditorBlock}>
					<div className={styles.formContainer}>
						<div className={styles.contentEditorFields}>
							<div className={styles.editorPlaceholder}>
								Здесь будет редактор контактов: адрес, телефон, email, карта, режим работы и т.д.
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
