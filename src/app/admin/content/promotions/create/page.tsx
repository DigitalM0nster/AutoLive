"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUploader from "../imageUploader";
import PromotionButtonsEditor from "../PromotionButtonsEditor";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import styles from "../../local_components/styles.module.scss";
import { type PromotionButton, validatePromotionButtons } from "@/lib/promotionButtons";

export default function CreatePromotionPage() {
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [buttons, setButtons] = useState<PromotionButton[]>([]);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const [saving, setSaving] = useState(false);

	// Есть ли изменения (хотя бы одно поле заполнено) — показываем панель сохранения
	const hasChanges =
		!!title.trim() ||
		!!description.trim() ||
		!!imageUrl ||
		buttons.length > 0 ||
		!!startDate ||
		!!endDate;

	const handleSave = async () => {
		if (!title.trim()) {
			alert("Укажите название акции");
			return;
		}
		if (startDate && endDate && endDate < startDate) {
			alert("Дата окончания не может быть раньше даты начала");
			return;
		}
		const buttonsError = validatePromotionButtons(buttons);
		if (buttonsError) {
			alert(buttonsError);
			return;
		}

		setSaving(true);
		try {
			const res = await fetch("/api/promotions", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					description: description.trim() || null,
					imageUrl: imageUrl || null,
					buttons,
					startDate: startDate || null,
					endDate: endDate || null,
				}),
			});
			if (!res.ok) {
				const text = await res.text();
				let message = "Ошибка создания акции";
				try {
					const err = JSON.parse(text) as { error?: string };
					if (err?.error) message = err.error;
				} catch {
					if (text) message = text;
				}
				throw new Error(message);
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
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
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
							<p className={styles.sectionNote}>
								Даты необязательны. Можно указать только начало, только окончание, обе или не указывать вовсе — на баннере
								отобразится только то, что заполнено.
							</p>
							<div className="formRow">
								<div className="formField">
									<label htmlFor="promo-startDate">
										Дата начала <span className={styles.labelHint}>(необязательно)</span>
									</label>
									<div className={styles.dateFieldRow}>
										<input
											id="promo-startDate"
											type="date"
											value={startDate}
											onChange={(e) => setStartDate(e.target.value)}
										/>
										{startDate ? (
											<button type="button" className={styles.clearDateButton} onClick={() => setStartDate("")}>
												Очистить
											</button>
										) : null}
									</div>
								</div>
								<div className="formField">
									<label htmlFor="promo-endDate">
										Дата окончания <span className={styles.labelHint}>(необязательно)</span>
									</label>
									<div className={styles.dateFieldRow}>
										<input
											id="promo-endDate"
											type="date"
											value={endDate}
											onChange={(e) => setEndDate(e.target.value)}
										/>
										{endDate ? (
											<button type="button" className={styles.clearDateButton} onClick={() => setEndDate("")}>
												Очистить
											</button>
										) : null}
									</div>
								</div>
							</div>
						</div>

						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Кнопки на баннере</h3>
							<PromotionButtonsEditor buttons={buttons} onChange={setButtons} />
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
