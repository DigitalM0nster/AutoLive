"use client";

import React, { useState, useEffect } from "react";
import { Upload, Trash2 } from "lucide-react";
import styles from "./styles.module.scss";

type ImageUploadProps = {
	label?: string;
	imageUrl?: string; // URL существующего изображения
	onImageChange?: (file: File | null) => void; // Колбэк при изменении файла
	onImageRemove?: () => void; // Колбэк при удалении изображения
	disabled?: boolean; // Заблокирован ли компонент
	className?: string; // Дополнительные CSS классы
	accept?: string; // Типы файлов (по умолчанию "image/*")
	maxSize?: number; // Максимальный размер файла в байтах (по умолчанию 5MB)
};

export default function ImageUpload({
	label = "Изображение",
	imageUrl = "",
	onImageChange,
	onImageRemove,
	disabled = false,
	className = "",
	accept = "image/*",
	maxSize = 5 * 1024 * 1024, // 5MB по умолчанию
}: ImageUploadProps) {
	const [imagePreview, setImagePreview] = useState<string>("");
	const [formImage, setFormImage] = useState<File | null>(null);
	const [error, setError] = useState<string>("");

	// Инициализируем превью из переданного URL
	useEffect(() => {
		setImagePreview(imageUrl);
	}, [imageUrl]);

	// Обработчик изменения файла
	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Проверяем размер файла
		if (file.size > maxSize) {
			setError(`Размер файла не должен превышать ${Math.round(maxSize / 1024 / 1024)}MB`);
			return;
		}

		// Проверяем тип файла
		if (!file.type.startsWith("image/")) {
			setError("Выберите файл изображения");
			return;
		}

		setError("");
		setFormImage(file);

		// Создаем превью
		const reader = new FileReader();
		reader.onload = (e) => {
			setImagePreview(e.target?.result as string);
		};
		reader.readAsDataURL(file);

		// Вызываем колбэк
		if (onImageChange) {
			onImageChange(file);
		}
	};

	// Обработчик удаления изображения
	const handleRemoveImage = () => {
		setFormImage(null);
		setImagePreview("");
		setError("");

		// Вызываем колбэк
		if (onImageRemove) {
			onImageRemove();
		}
	};

	// Очищаем ошибку при изменении файла
	useEffect(() => {
		if (formImage) {
			setError("");
		}
	}, [formImage]);

	return (
		<div className={`${styles.imageUploadBlock} ${className}`}>
			<label htmlFor="imageInput" className={styles.imagePreview}>
				{imagePreview ? <img src={imagePreview} alt="Предварительный просмотр" /> : <div className={styles.noImage}>Нет изображения</div>}

				{!disabled && (
					<div className={styles.imageActions}>
						<div className={`button ${styles.imageActionButton} ${styles.changeButton}`}>
							<Upload size={12} />
							Изменить
						</div>
						{imagePreview && (
							<button
								type="button"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleRemoveImage();
								}}
								className={`button cancelButton ${styles.imageActionButton}`}
							>
								<Trash2 size={12} />
								Удалить
							</button>
						)}
					</div>
				)}
			</label>
			{!disabled && <input id="imageInput" type="file" accept={accept} onChange={handleImageChange} style={{ display: "none" }} />}
			{error && <div className={styles.errorMessage}>{error}</div>}
		</div>
	);
}
