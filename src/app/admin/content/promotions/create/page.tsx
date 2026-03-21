"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUploader from "../imageUploader";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import styles from "../../local_components/styles.module.scss";

export default function CreatePromotionPage() {
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [buttonText, setButtonText] = useState("");
	const [buttonLink, setButtonLink] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const [saving, setSaving] = useState(false);

	// Есть ли изменения (хотя бы одно поле заполнено) — показываем панель сохранения
	const hasChanges =
		!!title.trim() ||
		!!description.trim() ||
		!!imageUrl ||
		!!buttonText.trim() ||
		!!buttonLink.trim() ||
		!!startDate ||
		!!endDate;

	const handleSave = async () => {
		if (!title.trim()) {
			alert("Укажите название акции");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch("/api/promotions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || null,
					imageUrl: imageUrl || null,
					buttonText: buttonText.trim() || null,
					buttonLink: buttonLink.trim() || null,
					startDate: startDate || null,
					endDate: endDate || null,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Ошибка создания акции");
			}
			router.push("/admin/content/promotions");
		} catch (e) {
			alert(e instanceof Error ? e.message : "Ошибка создания акции");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		router.back();
	};

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer column">
					<Link href="/admin/content" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						Редактор контента
					</Link>
					<div className="rowBlock">
						<Link href="/admin/content/promotions" className="tabButton">
							Акции
						</Link>
						<div className="tabTitle">Создание акции</div>
					</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Основные данные</h3>
							<div className="formRow">
								<div className="formField fullWidth">
									<label htmlFor="promo-title">Название *</label>
									<input
										id="promo-title"
										type="text"
										placeholder="Название"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className="formField fullWidth">
									<label htmlFor="promo-description">Описание</label>
									<textarea
										id="promo-description"
										placeholder="Описание"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										rows={4}
									/>
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Изображение</h3>
							<div className="formRow">
								<div className="formField fullWidth">
									<label>Изображение акции</label>
									<ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Даты акции</h3>
							<div className="formRow">
								<div className="formField">
									<label htmlFor="promo-startDate">Дата начала</label>
									<input
										id="promo-startDate"
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
									/>
								</div>
								<div className="formField">
									<label htmlFor="promo-endDate">Дата окончания</label>
									<input
										id="promo-endDate"
										type="date"
										value={endDate}
										onChange={(e) => setEndDate(e.target.value)}
									/>
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Кнопка</h3>
							<div className="formRow">
								<div className="formField">
									<label htmlFor="promo-buttonText">Текст кнопки</label>
									<input
										id="promo-buttonText"
										type="text"
										placeholder="Текст кнопки"
										value={buttonText}
										onChange={(e) => setButtonText(e.target.value)}
									/>
								</div>
								<div className="formField">
									<label htmlFor="promo-buttonLink">Ссылка кнопки</label>
									<input
										id="promo-buttonLink"
										type="text"
										placeholder="Ссылка кнопки"
										value={buttonLink}
										onChange={(e) => setButtonLink(e.target.value)}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{hasChanges && (
				<FixedActionButtons
					onCancel={handleCancel}
					onSave={handleSave}
					isSaving={saving}
					cancelText="Отменить"
					saveText="Создать акцию"
				/>
			)}
		</div>
	);
}
