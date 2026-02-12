"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "../imageUploader";
import styles from "../../local_components/styles.module.scss";

export default function CreatePromotionPage() {
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [buttonText, setButtonText] = useState("");
	const [buttonLink, setButtonLink] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await fetch("/api/promotions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title, description, imageUrl, buttonText, buttonLink }),
		});

		router.push("/admin/content/promotions");
	};

	return (
		<div className="screenContent">
			<div className={styles.screenContent}>
				<h1 className={styles.contentTitle}>Создание акции</h1>
				<div className={styles.contentEditorBlock}>
					<form onSubmit={handleSubmit} className={styles.formContainer}>
						<div className={`formFields ${styles.contentEditorFields}`}>
							<div className="formRow">
								<div className="formField fullWidth">
									<label>Название</label>
									<input
										type="text"
										placeholder="Название"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										required
									/>
								</div>
							</div>
							<div className="formRow">
								<div className="formField fullWidth">
									<label>Описание</label>
									<textarea
										placeholder="Описание"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										rows={4}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className="formField fullWidth">
									<label>Изображение</label>
									<ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />
								</div>
							</div>
							<div className="formRow">
								<div className="formField">
									<label>Текст кнопки</label>
									<input
										type="text"
										placeholder="Текст кнопки"
										value={buttonText}
										onChange={(e) => setButtonText(e.target.value)}
									/>
								</div>
								<div className="formField">
									<label>Ссылка кнопки</label>
									<input
										type="text"
										placeholder="Ссылка кнопки"
										value={buttonLink}
										onChange={(e) => setButtonLink(e.target.value)}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className="formField">
									<button type="submit" className="button">
										Создать акцию
									</button>
								</div>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
