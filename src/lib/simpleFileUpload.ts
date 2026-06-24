// Единая загрузка файлов: локально и на Vercel — только Vercel Blob (один токен, одни URL)

import { put, del } from "@vercel/blob";

export interface UploadResult {
	url: string;
	originalName: string;
	size: number;
	type: string;
}

export interface UploadOptions {
	prefix?: string;
	entityId?: number;
}

/** Нет BLOB_READ_WRITE_TOKEN в .env.local / Vercel */
export class BlobStorageNotConfiguredError extends Error {
	constructor() {
		super(
			"Не настроено хранилище файлов: задайте BLOB_READ_WRITE_TOKEN в .env.local (локально) и в Vercel → Environment Variables. Инструкция: VERCEL_BLOB_SETUP.md",
		);
		this.name = "BlobStorageNotConfiguredError";
	}
}

/** Сообщение и HTTP-код для API при ошибке загрузки */
export function uploadErrorToJson(error: unknown): { message: string; status: number } {
	if (error instanceof BlobStorageNotConfiguredError) {
		return { message: error.message, status: 503 };
	}
	return { message: "Ошибка загрузки файла", status: 500 };
}

function buildObjectName(file: File, prefix: string, entityId?: number): string {
	const timestamp = Date.now();
	const randomId = Math.random().toString(36).substring(2, 15);
	const fileExtension = file.name.split(".").pop() || "bin";

	if (entityId) {
		return `${prefix}/${entityId}_${timestamp}_${randomId}.${fileExtension}`;
	}

	return `${prefix}/${timestamp}_${randomId}.${fileExtension}`;
}

function getBlobToken(): string {
	const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
	if (!token) {
		throw new BlobStorageNotConfiguredError();
	}
	return token;
}

async function uploadToBlob(file: File, options: UploadOptions): Promise<UploadResult> {
	const objectName = buildObjectName(file, options.prefix ?? "upload", options.entityId);
	const bytes = await file.arrayBuffer();

	const blob = await put(objectName, Buffer.from(bytes), {
		access: "public",
		contentType: file.type || "application/octet-stream",
		addRandomSuffix: false,
		token: getBlobToken(),
	});

	return {
		url: blob.url,
		originalName: file.name,
		size: file.size,
		type: file.type,
	};
}

/**
 * Загружает файл в Vercel Blob — одинаково на локалке и production.
 * Требует BLOB_READ_WRITE_TOKEN в окружении.
 */
export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
	return uploadToBlob(file, options);
}

export async function deleteFile(url: string): Promise<boolean> {
	try {
		if (url.startsWith("data:")) {
			return true;
		}

		if (url.includes(".public.blob.vercel-storage.com") || url.includes("blob.vercel-storage.com")) {
			await del(url, { token: getBlobToken() });
			return true;
		}

		// Старые записи: /uploads/ с локальной разработки до перехода на Blob
		if (url.startsWith("/uploads/")) {
			const fs = await import("fs/promises");
			const path = await import("path");

			const fileName = url.replace("/uploads/", "");
			const filePath = path.join(process.cwd(), "public", "uploads", fileName);

			try {
				await fs.unlink(filePath);
			} catch {
				// файл уже удалён или на production его нет
			}

			return true;
		}

		return true;
	} catch (error) {
		if (error instanceof BlobStorageNotConfiguredError) {
			throw error;
		}
		console.error("❌ SimpleFileUpload - ошибка удаления:", error);
		return false;
	}
}

export function validateFile(
	file: File,
	maxSize: number = 5 * 1024 * 1024,
	allowedTypes: string[] = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
): { isValid: boolean; error?: string } {
	if (file.size > maxSize) {
		return {
			isValid: false,
			error: `Размер файла не должен превышать ${Math.round(maxSize / 1024 / 1024)}MB`,
		};
	}

	if (!allowedTypes.includes(file.type)) {
		return {
			isValid: false,
			error: `Разрешенные типы файлов: ${allowedTypes.join(", ")}`,
		};
	}

	return { isValid: true };
}

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
