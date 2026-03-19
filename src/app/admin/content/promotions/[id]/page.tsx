"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageUploader from "../imageUploader";
import Loading from "@/components/ui/loading/Loading";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import styles from "../../local_components/styles.module.scss";

type PageParams = {
	params: Promise<{ id: string }>;
};

// Преобразуем дату из API (ISO или null) в значение для input type="date" (YYYY-MM-DD)
function toDateInputValue(value: string | Date | null | undefined): string {
	if (!value) return "";
	const d = typeof value === "string" ? new Date(value) : value;
	if (isNaN(d.getTime())) return "";
	return d.toISOString().slice(0, 10);
}

export default function EditPromotionPage({ params }: PageParams) {
	const router = useRouter();
	const [id, setId] = useState<string>("");

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [buttonText, setButtonText] = useState("");
	const [buttonLink, setButtonLink] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const [initialData, setInitialData] = useState<{
		title: string;
		description: string;
		imageUrl: string;
		buttonText: string;
		buttonLink: string;
		startDate: string;
		endDate: string;
	} | null>(null);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const getParams = async () => {
			const resolvedParams = await params;
			setId(resolvedParams.id);
		};
		getParams();
	}, [params]);

	useEffect(() => {
		if (!id) return;

		const fetchPromo = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/promotions/${id}`);
				if (!res.ok) {
					setLoading(false);
					return;
				}
				const data = await res.json();
				// API возвращает поле image, в форме используем imageUrl
				const img = data.image ?? "";
				const sd = toDateInputValue(data.startDate);
				const ed = toDateInputValue(data.endDate);

				setTitle(data.title ?? "");
				setDescription(data.description ?? "");
				setImageUrl(img);
				setButtonText(data.buttonText ?? "");
				setButtonLink(data.buttonLink ?? "");
				setStartDate(sd);
				setEndDate(ed);

				setInitialData({
					title: data.title ?? "",
					description: data.description ?? "",
					imageUrl: img,
					buttonText: data.buttonText ?? "",
					buttonLink: data.buttonLink ?? "",
					startDate: sd,
					endDate: ed,
				});
			} finally {
				setLoading(false);
			}
		};
		fetchPromo();
	}, [id]);

	const hasChanges = initialData
		? title !== initialData.title ||
		  description !== initialData.description ||
		  imageUrl !== initialData.imageUrl ||
		  buttonText !== initialData.buttonText ||
		  buttonLink !== initialData.buttonLink ||
		  startDate !== initialData.startDate ||
		  endDate !== initialData.endDate
		: false;

	const handleSave = async () => {
		if (!title.trim()) {
			alert("Укажите название акции");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch(`/api/promotions/${id}`, {
				method: "PUT",
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
				throw new Error(err.error || "Ошибка сохранения");
			}
			router.push("/admin/content/promotions");
		} catch (e) {
			alert(e instanceof Error ? e.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!initialData) return;
		setTitle(initialData.title);
		setDescription(initialData.description);
		setImageUrl(initialData.imageUrl);
		setButtonText(initialData.buttonText);
		setButtonLink(initialData.buttonLink);
		setStartDate(initialData.startDate);
		setEndDate(initialData.endDate);
	};

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer">
						<div className="tabTitle">Редактирование акции</div>
					</div>
					<div className="tableContent">
						<Loading />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/content/promotions" className="tabButton">
						Акции
					</Link>
					<div className="tabTitle">Редактирование акции</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Основные данные</h3>
							<div className="formRow">
								<div className="formField fullWidth">
									<label htmlFor="promo-edit-title">Название *</label>
									<input
										id="promo-edit-title"
										type="text"
										placeholder="Название"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
									/>
								</div>
							</div>
							<div className="formRow">
								<div className="formField fullWidth">
									<label htmlFor="promo-edit-description">Описание</label>
									<textarea
										id="promo-edit-description"
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
									<label htmlFor="promo-edit-startDate">Дата начала</label>
									<input
										id="promo-edit-startDate"
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
									/>
								</div>
								<div className="formField">
									<label htmlFor="promo-edit-endDate">Дата окончания</label>
									<input
										id="promo-edit-endDate"
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
									<label htmlFor="promo-edit-buttonText">Текст кнопки</label>
									<input
										id="promo-edit-buttonText"
										type="text"
										placeholder="Текст кнопки"
										value={buttonText}
										onChange={(e) => setButtonText(e.target.value)}
									/>
								</div>
								<div className="formField">
									<label htmlFor="promo-edit-buttonLink">Ссылка кнопки</label>
									<input
										id="promo-edit-buttonLink"
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
					saveText="Сохранить"
				/>
			)}
		</div>
	);
}
