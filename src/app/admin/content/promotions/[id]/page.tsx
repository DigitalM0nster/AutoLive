// src/app/admin/content/promotions/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ImageUploader from "../imageUploader";
import Loading from "@/components/loading/Loading";

export default function EditPromotionPage() {
	const router = useRouter();
	const { id } = useParams();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [buttonText, setButtonText] = useState("");
	const [buttonLink, setButtonLink] = useState("");

	const [loading, setLoading] = useState(true);

	useEffect(() => {
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
		<div className="px-6 py-10 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">Редактирование акции</h1>
			{loading ? (
				<div className="space-y-4 bg-white p-6 rounded shadow">
					<Loading />
				</div>
			) : (
				<form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
					<input type="text" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border px-4 py-2 rounded" required />
					<textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border px-4 py-2 rounded" required />
					<ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} />
					<input type="text" placeholder="Текст кнопки" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="w-full border px-4 py-2 rounded" />
					<input type="text" placeholder="Ссылка кнопки" value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} className="w-full border px-4 py-2 rounded" />
					<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
						Сохранить
					</button>
				</form>
			)}
		</div>
	);
}
