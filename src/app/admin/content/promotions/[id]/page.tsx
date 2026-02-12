"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "../imageUploader";
import Loading from "@/components/ui/loading/Loading";
import styles from "../../local_components/styles.module.scss";

type PageParams = {
	params: Promise<{ id: string }>;
};

export default function EditPromotionPage({ params }: PageParams) {
	const router = useRouter();
	const [id, setId] = useState<string>("");

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [buttonText, setButtonText] = useState("");
	const [buttonLink, setButtonLink] = useState("");

	const [loading, setLoading] = useState(true);

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
			const res = await fetch(`/api/promotions/${id}`);
			const data = await res.json();
			setTitle(data.title);
			setDescription(data.description);
			setImageUrl(data.imageUrl || "");
			setButtonText(data.buttonText || "");
			setButtonLink(data.buttonLink || "");
			setLoading(false);
		};
		fetchPromo();
	}, [id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await fetch(`/api/promotions/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title, description, imageUrl, buttonText, buttonLink }),
		});

		router.push("/admin/content/promotions");
	};

	return (
		<div className="screenContent">
			<div className={styles.screenContent}>
				<h1 className={styles.contentTitle}>Редактирование акции</h1>
				<div className={styles.contentEditorBlock}>
					<div className={styles.formContainer}>
						{loading ? (
							<div className={styles.contentEditorFields}>
								<Loading />
							</div>
						) : (
							<form onSubmit={handleSubmit}>
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
												required
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
												Сохранить
											</button>
										</div>
									</div>
								</div>
							</form>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
