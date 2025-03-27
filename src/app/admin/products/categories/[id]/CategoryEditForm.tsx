// src\app\admin\categories\[id]\edit\CategoryEditForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Image, Heading, AlignLeft, Hash, UploadCloud } from "lucide-react";

type Props = {
	category: {
		id: number;
		title: string;
		slug: string;
		description?: string;
		image?: string;
	};
};

export default function CategoryEditForm({ category }: Props) {
	const router = useRouter();
	const [form, setForm] = useState({ ...category });
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (imageFile) {
			const url = URL.createObjectURL(imageFile);
			setPreviewUrl(url);
			return () => URL.revokeObjectURL(url);
		}
	}, [imageFile]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const formData = new FormData();
		formData.append("id", form.id.toString());
		formData.append("title", form.title);
		formData.append("slug", form.slug);
		formData.append("description", form.description || "");

		if (imageFile) {
			formData.append("image", imageFile);
		}

		const res = await fetch("/api/categories/edit-category", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();

		if (res.ok) {
			setMessage("Категория обновлена");
			if (data.category?.image) {
				setForm((prev) => ({ ...prev, image: data.category.image }));
			}
			setTimeout(() => {
				router.push("/admin/dashboard");
			}, 1000);
		} else {
			setMessage(data.error || "Ошибка при сохранении");
		}
	};

	return (
		<>
			<div>
				<h2 className="text-2xl font-bold text-gray-900 mb-1">Редактирование категории</h2>
				<p className="text-gray-500 text-sm">Измените основную информацию и изображение категории</p>
			</div>

			<form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
					<div className="relative">
						<Heading className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
						<input
							type="text"
							value={form.title}
							onChange={(e) => setForm({ ...form, title: e.target.value })}
							required
							className="pl-10 pr-4 py-2 w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Slug (ЧПУ)</label>
					<div className="relative">
						<Hash className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
						<input
							type="text"
							value={form.slug}
							onChange={(e) => setForm({ ...form, slug: e.target.value })}
							required
							className="pl-10 pr-4 py-2 w-full rounded-lg border shadow-sm focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
					<div className="relative">
						<AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
						<textarea
							value={form.description || ""}
							onChange={(e) => setForm({ ...form, description: e.target.value })}
							className="pl-10 pr-4 py-2 w-full rounded-lg border shadow-sm min-h-[100px] resize-y focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Изображение категории</label>
					<label className="flex items-center gap-3 border border-dashed border-gray-300 hover:border-blue-500 cursor-pointer rounded-lg p-4 transition">
						<UploadCloud className="w-6 h-6 text-blue-500" />
						<span className="text-sm text-gray-700">Выбрать изображение</span>
						<input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="hidden" />
					</label>
				</div>

				{(previewUrl || form.image) && (
					<div>
						<p className="text-sm text-gray-500 mb-2">Предпросмотр изображения:</p>
						<div className="w-48 overflow-hidden border rounded-xl shadow">
							<img src={previewUrl || form.image!} alt="Категория" className="w-full h-auto object-cover" />
						</div>
					</div>
				)}

				<div className="pt-4">
					<button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow transition">
						💾 Сохранить изменения
					</button>
					{message && <p className="text-green-700 text-sm text-center mt-2">{message}</p>}
				</div>
			</form>
		</>
	);
}
