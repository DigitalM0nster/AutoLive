// src/app/admin/products/categories/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "../imageUploader";

export default function CreateCategoryPage() {
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		await fetch("/api/categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title, description, imageUrl }),
		});

		router.push("/admin/products/categories");
	};

	return (
		<div className="px-6 py-10 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Создание новой категории</h1>

			<form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
				<input type="text" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border px-4 py-2 rounded" required />
				<textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border px-4 py-2 rounded" />
				<ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />

				<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
					Создать категорию
				</button>
			</form>
		</div>
	);
}
