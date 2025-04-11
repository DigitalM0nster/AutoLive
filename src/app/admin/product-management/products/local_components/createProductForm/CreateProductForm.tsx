"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Category } from "@/lib/types";
import CategorySelect from "../productList/CategorySelect";
import Link from "next/link";

type ProductFormProps = {
	productId?: string; // если передано – редактирование, иначе – создание
};

export default function CreateProductForm({ productId }: ProductFormProps) {
	const router = useRouter();
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(!!productId);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [form, setForm] = useState({
		title: "",
		sku: "",
		price: "",
		brand: "",
		categoryId: "",
		image: "",
	});

	// Загрузка категорий
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const res = await fetch("/api/categories");
				const data = await res.json();
				setCategories(data);
			} catch (error) {
				console.error("Ошибка загрузки категорий", error);
			}
		};
		fetchCategories();
	}, []);

	// Если есть productId – загружаем данные товара для редактирования
	useEffect(() => {
		if (productId) {
			const fetchProduct = async () => {
				try {
					const res = await fetch(`/api/products/${productId}`);
					if (res.ok) {
						const { product } = await res.json();
						setForm({
							title: product.title,
							sku: product.sku,
							price: product.price.toString(),
							brand: product.brand,
							categoryId: product.category?.id.toString() || "",
							image: product.image || "",
						});
					} else {
						alert("Продукт не найден");
						router.push("/admin/product-management");
					}
				} catch (error) {
					console.error("Ошибка получения продукта", error);
				} finally {
					setLoading(false);
				}
			};
			fetchProduct();
		}
	}, [productId, router]);

	// Обработчик отправки формы
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		const method = productId ? "PUT" : "POST";
		const url = productId ? `/api/products/${productId}` : "/api/products";

		try {
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: form.title,
					sku: form.sku,
					price: parseFloat(form.price),
					brand: form.brand,
					categoryId: parseInt(form.categoryId),
					image: form.image,
				}),
			});

			if (res.ok) {
				router.push("/admin/product-management/products");
			} else {
				alert("Ошибка сохранения продукта");
			}
		} catch (error) {
			console.error("Ошибка при сохранении продукта", error);
			alert("Ошибка сохранения продукта");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading) return <p>Загрузка...</p>;

	return (
		<div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
			<div className="bg-white shadow-xl rounded-2xl w-full max-w-3xl p-8 relative">
				<Link href="/admin/product-management/products" className="absolute top-4 left-4 text-gray-500 hover:text-blue-500 text-sm">
					← Назад
				</Link>

				<h1 className="text-3xl font-bold text-center mb-8">{productId ? "Редактирование товара" : "Создание нового товара"}</h1>

				<form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<div className="col-span-1 sm:col-span-2">
						<label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
							Название
						</label>
						<input
							id="title"
							type="text"
							value={form.title}
							onChange={(e) => setForm({ ...form, title: e.target.value })}
							className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
							required
						/>
					</div>

					<div>
						<label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
							Артикул
						</label>
						<input
							id="sku"
							type="text"
							value={form.sku}
							onChange={(e) => setForm({ ...form, sku: e.target.value })}
							className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
							required
						/>
					</div>

					<div>
						<label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
							Цена
						</label>
						<input
							id="price"
							type="number"
							value={form.price}
							onChange={(e) => setForm({ ...form, price: e.target.value })}
							className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
							required
						/>
					</div>

					<div>
						<label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
							Бренд
						</label>
						<input
							id="brand"
							type="text"
							value={form.brand}
							onChange={(e) => setForm({ ...form, brand: e.target.value })}
							className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
							required
						/>
					</div>

					<div>
						<label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
							Категория
						</label>
						<CategorySelect categories={categories} value={form.categoryId} onChange={(val) => setForm({ ...form, categoryId: val })} />
					</div>

					<div className="sm:col-span-2">
						<label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
							Ссылка на изображение
						</label>
						<input
							id="image"
							type="text"
							value={form.image}
							onChange={(e) => setForm({ ...form, image: e.target.value })}
							className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
						/>

						{form.image && (
							<div className="mt-4">
								<p className="text-sm text-gray-600 mb-1">Предпросмотр:</p>
								<img src={form.image} alt="Превью" className="w-40 h-40 object-cover rounded-lg border" />
							</div>
						)}
					</div>

					<div className="col-span-1 sm:col-span-2">
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
						>
							{isSubmitting ? "Сохраняем..." : "Сохранить"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
