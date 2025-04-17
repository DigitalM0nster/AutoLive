// src\app\admin\product-management\products\local_components\productsList\productsTable\productRow\ImageCell.tsx

import { useState, useEffect } from "react";

export default function ImageCell({
	image,
	imageFile,
	setImageFile,
	setImagePreview,
	onRemove,
	productId,
}: {
	image: string | null;
	imageFile: File | null;
	setImageFile: (file: File | null) => void;
	setImagePreview: (url: string | null) => void;
	onRemove: () => void;
	productId: string | number;
}) {
	const [preview, setPreview] = useState<string | null>(image);

	useEffect(() => {
		if (imageFile) {
			const url = URL.createObjectURL(imageFile);
			setPreview(url);
		} else {
			setPreview(image);
		}
	}, [imageFile, image]);

	return (
		<div className="relative w-10 h-10 mx-auto group">
			<label
				htmlFor={`image-upload-${productId}`}
				className="absolute inset-0 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white text-[10px] rounded cursor-pointer z-10 opacity-0 group-hover:opacity-100"
			>
				Изменить
			</label>

			<input
				id={`image-upload-${productId}`}
				type="file"
				accept="image/*"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) {
						setImageFile(file);
						setImagePreview(URL.createObjectURL(file));
					}
				}}
				className="hidden"
			/>

			{preview ? (
				<>
					<img src={preview} alt="preview" className="w-full h-full object-cover rounded border transition-all duration-200 group-hover:scale-150 group-hover:z-20" />
					<button
						type="button"
						onClick={onRemove}
						className="absolute -top-2 -right-2 bg-white text-red-600 border border-red-400 rounded-full w-4 h-4 text-[10px] flex items-center justify-center z-30 shadow hover:scale-110 transition"
						title="Удалить изображение"
					>
						×
					</button>
				</>
			) : (
				<div className="w-full h-full bg-gray-100 border rounded flex items-center justify-center text-[10px] text-gray-400">Нет</div>
			)}
		</div>
	);
}
