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

		const res = await fetch("/api/upload", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();
		setImageUrl(data.url);
		setUploading(false);
	};

	const removeImage = () => setImageUrl("");

	return (
		<div className={styles.imageUploadWrap}>
			{imageUrl ? (
				<div className={styles.imagePreviewBox}>
					<img src={imageUrl} alt="Загруженное изображение" />
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
