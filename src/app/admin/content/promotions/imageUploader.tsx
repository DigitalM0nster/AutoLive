"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

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
		<div className="w-full">
			{imageUrl ? (
				<div className="relative group">
					<img
						src={imageUrl}
						alt="Загруженное изображение"
						className="w-full h-64 object-cover rounded-xl shadow-md border transition-transform group-hover:scale-[1.01]"
					/>
					<button
						type="button"
						onClick={removeImage}
						className="absolute top-3 right-3 bg-white text-red-600 border border-red-300 p-2 rounded-full shadow hover:bg-red-50 transition"
					>
						<Trash2 size={18} />
					</button>
				</div>
			) : (
				<div
					onClick={() => fileInputRef.current?.click()}
					className="h-64 w-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition group"
				>
					{uploading ? (
						<p className="text-sm">Загрузка...</p>
					) : (
						<>
							<ImagePlus size={32} className="mb-2 group-hover:scale-110 transition" />
							<p className="text-sm">Нажмите, чтобы загрузить изображение</p>
						</>
					)}
				</div>
			)}
			<input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
		</div>
	);
}
