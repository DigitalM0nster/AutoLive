// src/app/admin/product-management/products/local_components/productsList/productsTable/productRow/ImageCell.tsx

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";

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
		if (!imageFile) return;
		const url = URL.createObjectURL(imageFile);
		setPreview(url);
		setImagePreview(url);
		return () => URL.revokeObjectURL(url);
	}, [imageFile, setImagePreview]);

	useEffect(() => {
		if (imageFile) return;
		setPreview(image);
		setImagePreview(image);
	}, [image, imageFile, setImagePreview]);

	return (
		<div className="flex flex-col items-center">
			{/* Квадратик с синим dashed бордером и group-классом для hover */}
			<div className="relative w-16 h-16 border-2 border-dashed border-gray-400 rounded-md overflow-hidden flex items-center justify-center group hover:border-blue-500">
				{/* Скрытый файл-инпут */}
				<input id={`image-upload-${productId}`} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="hidden" />

				{preview ? (
					<>
						{/* label охватывает картинку и overlay */}
						<label htmlFor={`image-upload-${productId}`} className="block w-full h-full cursor-pointer">
							<img src={preview} alt="preview" className="w-full h-full object-cover" />
							{/* затемнение фона при hover */}
							<div className="absolute inset-0 bg-black/0 group-hover:bg-white/50 transition" />
							{/* иконка загрузки поверх превью при hover */}
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
								<Upload className="w-6 h-6 text-blue-500" />
							</div>
						</label>
					</>
				) : (
					<label htmlFor={`image-upload-${productId}`} className="w-full h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer transition">
						<Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
						<span className="text-[10px] group-hover:text-blue-500">Загрузить</span>
					</label>
				)}
			</div>

			{/* Отдельная кнопка удалить под квадратиком */}
			{preview && (
				<button
					type="button"
					onClick={() => {
						onRemove();
						setImageFile(null);
					}}
					className="mt-1 flex items-center text-red-600 text-xs hover:underline focus:outline-none"
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-1 12H6L5 7" />
						<path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6M9 7V4h6v3" />
					</svg>
					Удалить
				</button>
			)}
		</div>
	);
}
