"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import styles from "../local_components/styles.module.scss";

type Props = {
	imageUrl: string;
	setImageUrl: (url: string) => void;
};

export default function ImageUploader({ imageUrl, setImageUrl }: Props) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(false);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);

		const formData = new FormData();
		formData.append("image", file);

		try {
			const res = await fetch("/api/upload", {
				method: "POST",
				credentials: "include",
				body: formData,
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.url) {
				throw new Error(typeof data.error === "string" ? data.error : "Ошибка загрузки изображения");
			}
			setImageUrl(data.url);
		} catch (e) {
			alert(e instanceof Error ? e.message : "Ошибка загрузки изображения");
		} finally {
			setUploading(false);
		}
	};

	const removeImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		setImageUrl("");
	};

	const openFileDialog = () => {
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
			fileInputRef.current.click();
		}
	};

	return (
		<div className={styles.imageUploadWrap}>
			{imageUrl ? (
				<div className={styles.imagePreviewBox}>
					<button
						type="button"
						className={styles.imagePreviewReplace}
						onClick={openFileDialog}
						title="Заменить изображение"
						aria-label="Заменить изображение"
					>
						<img src={imageUrl} alt="Загруженное изображение" />
						<span className={styles.imagePreviewReplaceLabel}>Заменить</span>
					</button>
					<button type="button" onClick={removeImage} className={styles.imagePreviewRemove} aria-label="Удалить изображение">
						<Trash2 size={18} />
					</button>
				</div>
			) : (
				<div
					className={styles.imageUploadEmpty}
					onClick={() => fileInputRef.current?.click()}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
				>
					{uploading ? (
						<span>Загрузка...</span>
					) : (
						<>
							<div className={styles.imageUploadIcon}>
								<ImagePlus size={32} />
							</div>
							<span>Нажмите, чтобы загрузить изображение</span>
						</>
					)}
				</div>
			)}
			<input
				type="file"
				accept="image/*"
				onChange={handleFileChange}
				ref={fileInputRef}
				className={styles.inputHidden}
				aria-hidden
			/>
		</div>
	);
}
