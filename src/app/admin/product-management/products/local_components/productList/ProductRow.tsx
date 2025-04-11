import { useState } from "react";
import { EditableProduct, Category } from "@/lib/types";

export default function ProductRow({
	product,
	categories,
	onUpdate,
	onDelete,
}: {
	product: EditableProduct;
	categories: Category[];
	onUpdate: (updated: EditableProduct) => void;
	onDelete: (id: string | number) => void;
}) {
	const [isEditing, setIsEditing] = useState(product.id === "new" || (product as any).isEditing);
	const [form, setForm] = useState({
		title: product.title,
		description: product.description || "",
		sku: product.sku,
		price: product.price.toString(),
		brand: product.brand,
		categoryId: product.categoryId?.toString() || "",
		image: product.image || "",
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(product.image || null);

	const [isSaving, setIsSaving] = useState(false);

	const isStale = (updatedAt: string) => {
		const daysDiff = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
		return daysDiff > 30;
	};

	const handleSave = async () => {
		setIsSaving(true);

		let imageUrl = form.image;

		if (imageFile) {
			const imageData = new FormData();
			imageData.append("image", imageFile);

			try {
				const uploadRes = await fetch("/api/upload", {
					method: "POST",
					body: imageData,
				});
				const uploadJson = await uploadRes.json();
				imageUrl = uploadJson.url;
			} catch (uploadErr) {
				alert("Ошибка загрузки изображения");
				setIsSaving(false);
				return;
			}
		}

		const productData = {
			sku: form.sku,
			title: form.title,
			description: form.description,
			price: parseFloat(form.price),
			brand: form.brand,
			categoryId: form.categoryId ? parseInt(form.categoryId) : null,
			image: imageUrl,
		};

		try {
			const res = await fetch(product.id === "new" ? `/api/products` : `/api/products/${product.id}`, {
				method: product.id === "new" ? "POST" : "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(productData),
			});

			if (res.ok) {
				const json = await res.json();
				const savedProduct = product.id === "new" ? json.product : { ...json.product, id: product.id };

				const selectedCategory = categories.find((c) => c.id === savedProduct.categoryId);
				const updatedProduct: EditableProduct = {
					...product,
					...form,
					id: savedProduct.id,
					image: imageUrl,
					price: parseFloat(form.price),
					categoryId: savedProduct.categoryId,
					categoryTitle: selectedCategory?.title || "—",
					updatedAt: new Date().toISOString(),
				};

				onUpdate(updatedProduct);
				setIsEditing(false);
				setImageFile(null);
				setImagePreview(imageUrl);
			} else {
				alert("Ошибка при сохранении товара");
			}
		} catch (err) {
			alert("Ошибка сети");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!confirm("Удалить этот товар?")) return;

		try {
			const res = await fetch(`/api/products/${product.id}`, {
				method: "DELETE",
			});

			if (res.ok) {
				onDelete(product.id);
			} else {
				alert("Ошибка при удалении товара");
			}
		} catch (err) {
			alert("Ошибка сети");
		}
	};

	return (
		<tr className={isStale(product.updatedAt) ? "bg-yellow-50" : ""}>
			<td className="border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border px-1 py-0.5 text-sm rounded" />
				) : (
					product.brand
				)}
			</td>
			<td className="border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border px-1 py-0.5 text-sm rounded" />
				) : (
					product.sku
				)}
			</td>

			<td className="border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border px-1 py-0.5 text-sm rounded" />
				) : (
					product.title
				)}
			</td>

			<td className="border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<textarea
						value={form.description}
						onChange={(e) => setForm({ ...form, description: e.target.value })}
						className="w-full border px-1 py-0.5 text-sm rounded resize-none h-[60px]"
					/>
				) : (
					<p className="text-xs text-gray-600 line-clamp-2">{product.description || "—"}</p>
				)}
			</td>

			<td className="border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border px-1 py-0.5 text-sm rounded" />
				) : (
					`${product.price} ₽`
				)}
			</td>

			<td className="border border-black/10 px-2 py-1 w-1/6">
				{isEditing ? (
					<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border px-1 py-0.5 text-sm rounded">
						<option value="">Выбрать...</option>
						{Array.isArray(categories) &&
							categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.title}
								</option>
							))}
					</select>
				) : (
					product.categoryTitle
				)}
			</td>

			<td className="border border-black/10 px-2 py-1 w-1/6 text-center">
				{isEditing ? (
					<div className="relative w-10 h-10 mx-auto group">
						<label
							htmlFor={`image-upload-${product.id}`}
							className="absolute inset-0 bg-black/40 hover:bg-black/60 transition flex items-center justify-center text-white text-[10px] rounded cursor-pointer z-10 opacity-0 group-hover:opacity-100"
						>
							Изменить
						</label>

						<input
							id={`image-upload-${product.id}`}
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

						{imagePreview ? (
							<>
								<img
									src={imagePreview}
									alt="preview"
									className="w-full h-full object-cover rounded border transition-all duration-200 group-hover:scale-150 group-hover:z-20"
								/>
								<button
									type="button"
									onClick={() => {
										setImageFile(null);
										setImagePreview(null);
										setForm((prev) => ({ ...prev, image: "" }));
									}}
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
				) : product.image ? (
					<div className="relative group w-10 h-10 mx-auto">
						<img
							src={product.image}
							alt="img"
							className="w-full h-full object-cover rounded border transition-all duration-200 group-hover:scale-150 group-hover:z-20"
						/>
					</div>
				) : (
					<span className="text-[10px] text-gray-400">Нет</span>
				)}
			</td>

			<td className="border border-black/10 px-2 py-1 text-center w-1/6">
				{isEditing ? (
					<>
						<button onClick={handleSave} disabled={isSaving} className="text-green-600 hover:underline text-xs mr-2">
							{isSaving ? "Сохраняем..." : "Сохранить"}
						</button>
						<button
							onClick={() => {
								if (product.id === "new") {
									onDelete("new");
								} else {
									setIsEditing(false);
									setForm({
										title: product.title,
										description: product.description,
										sku: product.sku,
										price: product.price.toString(),
										brand: product.brand,
										categoryId: product.categoryId?.toString() || "",
										image: product.image || "",
									});
									setImageFile(null);
									setImagePreview(product.image || null);
								}
							}}
							className="text-gray-600 hover:underline text-xs"
						>
							{product.id === "new" ? "Удалить" : "Отмена"}
						</button>
					</>
				) : (
					<>
						<button onClick={() => setIsEditing(true)} className="text-blue-600 hover:underline text-xs mr-2">
							Редактировать
						</button>
						<button
							onClick={() => {
								if (product.id === "new") {
									onDelete("new");
								} else {
									handleDelete();
								}
							}}
							className="text-red-600 hover:underline text-xs"
						>
							Удалить
						</button>
					</>
				)}
			</td>
		</tr>
	);
}
