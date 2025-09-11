// src/lib/simpleFileUpload.ts
// Простая система загрузки файлов без внешних зависимостей

// Типы для работы с файлами
export interface UploadResult {
	url: string;
	originalName: string;
	size: number;
	type: string;
}

export interface UploadOptions {
	prefix?: string; // Префикс для имени файла
	entityId?: number; // ID сущности для уникальности имени
}

/**
 * Загружает файл (Base64 для Vercel, файлы для собственного сервера)
 * @param file - Файл для загрузки
 * @param options - Опции загрузки
 * @returns Promise<UploadResult> - Результат загрузки
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
	const { prefix = "file", entityId } = options;

	// Проверяем, работаем ли мы на Vercel (serverless)
	const isVercel = process.env.VERCEL === "1";

	if (isVercel) {
		// На Vercel используем Base64
		console.log(`✅ SimpleFileUpload - Vercel detected, using Base64 for: ${file.name}`);

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const base64 = buffer.toString("base64");
		const mimeType = file.type || "image/jpeg";
		const dataUrl = `data:${mimeType};base64,${base64}`;

		return {
			url: dataUrl,
			originalName: file.name,
			size: file.size,
			type: file.type,
		};
	} else {
		// На собственном сервере используем файловую систему
		console.log(`✅ SimpleFileUpload - Own server detected, using file system for: ${file.name}`);

		const fs = await import("fs/promises");
		const path = await import("path");

		// Создаем уникальное имя файла
		const timestamp = Date.now();
		const randomId = Math.random().toString(36).substring(2, 15);
		const fileExtension = file.name.split(".").pop() || "bin";

		let fileName: string;
		if (entityId) {
			fileName = `${prefix}_${entityId}_${timestamp}_${randomId}.${fileExtension}`;
		} else {
			fileName = `${prefix}_${timestamp}_${randomId}.${fileExtension}`;
		}

		const filePath = path.join(process.cwd(), "public", "uploads", fileName);

		// Создаем директорию если не существует
		await fs.mkdir(path.dirname(filePath), { recursive: true });

		// Сохраняем файл
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		await fs.writeFile(filePath, buffer);

		const url = `/uploads/${fileName}`;

		return {
			url,
			originalName: file.name,
			size: file.size,
			type: file.type,
		};
	}
}

/**
 * Удаляет файл
 * @param url - URL файла для удаления
 * @returns Promise<boolean> - Успешность удаления
 */
export async function deleteFile(url: string): Promise<boolean> {
	try {
		// Если это Base64 data URL, нечего удалять
		if (url.startsWith("data:")) {
			console.log("⚠️ SimpleFileUpload - Base64 data URL, nothing to delete");
			return true;
		}

		// Если это файл на собственном сервере
		if (url.startsWith("/uploads/")) {
			const fs = await import("fs/promises");
			const path = await import("path");

			const fileName = url.replace("/uploads/", "");
			const filePath = path.join(process.cwd(), "public", "uploads", fileName);

			try {
				await fs.unlink(filePath);
				console.log(`✅ SimpleFileUpload - Файл удален: ${filePath}`);
				return true;
			} catch (error) {
				console.log(`⚠️ SimpleFileUpload - Файл не найден: ${filePath}`);
				return true; // Не считаем ошибкой, если файл уже удален
			}
		}

		console.log("⚠️ SimpleFileUpload - Неизвестный тип URL, пропускаем удаление:", url);
		return true;
	} catch (error) {
		console.error("❌ SimpleFileUpload - Ошибка удаления файла:", error);
		return false;
	}
}

/**
 * Валидирует файл перед загрузкой
 * @param file - Файл для валидации
 * @param maxSize - Максимальный размер в байтах (по умолчанию 5MB)
 * @param allowedTypes - Разрешенные типы файлов
 * @returns { isValid: boolean; error?: string } - Результат валидации
 */
export function validateFile(
	file: File,
	maxSize: number = 5 * 1024 * 1024, // 5MB
	allowedTypes: string[] = ["image/jpeg", "image/png", "image/gif", "image/webp"]
): { isValid: boolean; error?: string } {
	// Проверяем размер файла
	if (file.size > maxSize) {
		return {
			isValid: false,
			error: `Размер файла не должен превышать ${Math.round(maxSize / 1024 / 1024)}MB`,
		};
	}

	// Проверяем тип файла
	if (!allowedTypes.includes(file.type)) {
		return {
			isValid: false,
			error: `Разрешенные типы файлов: ${allowedTypes.join(", ")}`,
		};
	}

	return { isValid: true };
}

/**
 * Создает превью изображения из файла
 * @param file - Файл изображения
 * @returns Promise<string> - Data URL для превью
 */
export function createImagePreview(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			resolve(e.target?.result as string);
		};
		reader.onerror = () => {
			reject(new Error("Ошибка чтения файла"));
		};
		reader.readAsDataURL(file);
	});
}
