"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../styles.module.scss";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import Pagination from "@/components/ui/pagination/Pagination";
import FiltersBlock from "@/components/ui/filtersBlock/FiltersBlock";
import PriceRangeFilter from "./PriceRangeFilter";
import type { ProductListItem, ActiveFilter } from "@/lib/types";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import { useAuthStore } from "@/store/authStore";
import ImageUpload from "@/components/ui/imageUpload/ImageUpload";

export default function AllProductsTable() {
	const { user } = useAuthStore();
	const [products, setProducts] = useState<ProductListItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);

	// Фильтры
	const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
	const [departmentFilter, setDepartmentFilter] = useState<number | "all" | "none">("all");
	const [brandFilter, setBrandFilter] = useState<string>("all");

	// Фильтры по ценам (для отображения в UI)
	const [supplierPriceFilter, setSupplierPriceFilter] = useState<{ min: number; max: number }>({ min: 0, max: 10000000 });
	const [sitePriceFilter, setSitePriceFilter] = useState<{ min: number; max: number }>({ min: 0, max: 10000000 });

	// Активные фильтры по ценам (используются в запросах к БД)
	const [activeSupplierPriceFilter, setActiveSupplierPriceFilter] = useState<{ min: number; max: number }>({ min: 0, max: 100000 });
	0;
	const [activeSitePriceFilter, setActiveSitePriceFilter] = useState<{ min: number; max: number }>({ min: 0, max: 10000000 });

	// Реальные границы цен (загружаются с сервера)
	const [priceBounds, setPriceBounds] = useState<{
		supplierPrice: { min: number; max: number };
		sitePrice: { min: number; max: number };
	}>({
		supplierPrice: { min: 0, max: 10000000 },
		sitePrice: { min: 0, max: 10000000 },
	});

	// Состояние для дропдаунов
	const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
	const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
	const [showBrandDropdown, setShowBrandDropdown] = useState(false);

	// Данные для фильтров
	const [categories, setCategories] = useState<{ id: number; title: string }[]>([]);
	const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
	const [brands, setBrands] = useState<string[]>([]);

	// Поиск
	const [search, setSearch] = useState("");

	// Сортировка
	const [sortBy, setSortBy] = useState<"id" | "title" | "sku" | "price" | "supplierPrice" | "createdAt" | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

	// Редактирование
	const [editingProduct, setEditingProduct] = useState<number | null>(null);
	const [editForm, setEditForm] = useState({
		title: "",
		sku: "",
		price: "",
		supplierPrice: "",
		brand: "",
		description: "",
		departmentId: "",
		categoryId: "",
	});

	// Редактирование изображения
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imageToDelete, setImageToDelete] = useState<boolean>(false);
	const [showDescription, setShowDescription] = useState<number | null>(null);
	const [availableCategories, setAvailableCategories] = useState<{ id: number; title: string }[]>([]);

	const limit = 10;
	const categoryDropdownRef = useRef<HTMLDivElement>(null);
	const departmentDropdownRef = useRef<HTMLDivElement>(null);
	const brandDropdownRef = useRef<HTMLDivElement>(null);

	// Закрытие дропдаунов при клике вне их
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
				setShowCategoryDropdown(false);
			}
			if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(e.target as Node)) {
				setShowDepartmentDropdown(false);
			}
			if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
				setShowBrandDropdown(false);
			}
		};
		document.addEventListener("click", handleClickOutside);
		return () => document.removeEventListener("click", handleClickOutside);
	}, []);

	// Загрузка товаров
	useEffect(() => {
		const fetchProducts = async () => {
			setLoading(true);
			try {
				const params = new URLSearchParams({
					page: page.toString(),
					limit: limit.toString(),
				});

				// Добавляем параметр поиска
				if (search) params.append("search", search);

				// Фильтры
				if (categoryFilter !== "all") params.append("categoryId", categoryFilter.toString());
				if (departmentFilter !== "all") {
					params.append("departmentId", departmentFilter.toString());
				}
				if (brandFilter !== "all") params.append("brand", brandFilter);

				// Фильтры по ценам
				params.append("supplierPriceMin", activeSupplierPriceFilter.min.toString());
				params.append("supplierPriceMax", activeSupplierPriceFilter.max.toString());
				params.append("priceMin", activeSitePriceFilter.min.toString());
				params.append("priceMax", activeSitePriceFilter.max.toString());

				// Сортировка
				if (sortBy && sortOrder) {
					params.append("sortBy", sortBy);
					params.append("sortOrder", sortOrder);
				}

				const res = await fetch(`/api/products?${params.toString()}`);
				const data = await res.json();

				setProducts(data.products || []);
				setTotal(data.total || 0);
			} catch (e) {
				console.error("Ошибка загрузки товаров");
			} finally {
				setLoading(false);
			}
		};

		fetchProducts();
	}, [page, categoryFilter, departmentFilter, brandFilter, sortBy, sortOrder, search, activeSupplierPriceFilter, activeSitePriceFilter]);

	// Загрузка границ цен
	useEffect(() => {
		const fetchPriceBounds = async () => {
			try {
				const res = await fetch("/api/products/price-bounds");
				const data = await res.json();

				if (data.success) {
					setPriceBounds({
						supplierPrice: { min: data.supplierPrice.min, max: data.supplierPrice.max },
						sitePrice: { min: data.sitePrice.min, max: data.sitePrice.max },
					});

					// Устанавливаем начальные значения фильтров на основе реальных границ
					setSupplierPriceFilter({ min: data.supplierPrice.min, max: data.supplierPrice.max });
					setSitePriceFilter({ min: data.sitePrice.min, max: data.sitePrice.max });
					setActiveSupplierPriceFilter({ min: data.supplierPrice.min, max: data.supplierPrice.max });
					setActiveSitePriceFilter({ min: data.sitePrice.min, max: data.sitePrice.max });
				}
			} catch (e) {
				console.error("Ошибка загрузки границ цен");
			}
		};

		fetchPriceBounds();
	}, []);

	// Загрузка данных для фильтров
	useEffect(() => {
		const fetchFilterData = async () => {
			try {
				// Загружаем категории
				const categoriesRes = await fetch("/api/categories");
				const categoriesData = await categoriesRes.json();
				setCategories(Array.isArray(categoriesData) ? categoriesData : []);

				// Загружаем отделы
				const departmentsRes = await fetch("/api/departments");
				const departmentsData = await departmentsRes.json();
				setDepartments(Array.isArray(departmentsData) ? departmentsData : []);

				// Загружаем бренды из существующего API
				const brandsRes = await fetch("/api/products?limit=1000");
				const brandsData = await brandsRes.json();
				const uniqueBrands = [...new Set(brandsData.products.map((p: any) => p.brand).filter(Boolean))] as string[];
				setBrands(uniqueBrands.sort());
			} catch (e) {
				console.error("Ошибка загрузки данных для фильтров");
			}
		};

		fetchFilterData();
	}, []);

	const totalPages = Math.ceil(total / limit);

	// Обработчики изменения фильтров
	const handleCategoryChange = (value: string) => {
		setCategoryFilter(value === "all" ? "all" : parseInt(value));
		setPage(1);
	};

	const handleDepartmentChange = (value: string) => {
		if (value === "all") {
			setDepartmentFilter("all");
		} else if (value === "none") {
			setDepartmentFilter("none");
		} else {
			setDepartmentFilter(parseInt(value));
		}
		setPage(1);
	};

	const handleBrandChange = (value: string) => {
		setBrandFilter(value);
		setPage(1);
	};

	// Обработчики для фильтров по ценам с debounce
	const handleSupplierPriceChange = (value: { min: number; max: number }) => {
		// Обновляем только UI состояние (ползунок)
		setSupplierPriceFilter(value);
	};

	const handleSupplierPriceChangeComplete = (value: { min: number; max: number }) => {
		// Обновляем активное состояние (для запросов к БД)
		setSupplierPriceFilter(value);
		setActiveSupplierPriceFilter(value);
		setPage(1);
	};

	const handleSitePriceChange = (value: { min: number; max: number }) => {
		// Обновляем только UI состояние (ползунок)
		setSitePriceFilter(value);
	};

	const handleSitePriceChangeComplete = (value: { min: number; max: number }) => {
		// Обновляем активное состояние (для запросов к БД)
		setSitePriceFilter(value);
		setActiveSitePriceFilter(value);
		setPage(1);
	};

	// Сброс всех фильтров
	const resetFilters = () => {
		setCategoryFilter("all");
		setDepartmentFilter("all");
		setBrandFilter("all");
		setSupplierPriceFilter({ min: priceBounds.supplierPrice.min, max: priceBounds.supplierPrice.max });
		setSitePriceFilter({ min: priceBounds.sitePrice.min, max: priceBounds.sitePrice.max });
		setSortBy(null);
		setSortOrder(null);
		setSearch("");
		setPage(1);
	};

	// Функции редактирования
	const startEditing = async (product: ProductListItem) => {
		setEditingProduct(product.id);
		setEditForm({
			title: product.title || "",
			sku: product.sku || "",
			price: product.price.toString(),
			supplierPrice: product.supplierPrice?.toString() || "",
			brand: product.brand || "",
			description: product.description || "",
			departmentId: product.department?.id?.toString() || "",
			categoryId: product.category?.id?.toString() || "",
		});

		// Загружаем доступные категории для отдела товара
		if (product.department?.id) {
			try {
				const response = await fetch(`/api/categories?departmentId=${product.department.id}`);
				if (response.ok) {
					const departmentCategories = await response.json();
					setAvailableCategories(departmentCategories);
				}
			} catch (error) {
				console.error("Ошибка при загрузке категорий отдела:", error);
				setAvailableCategories([]);
			}
		} else {
			setAvailableCategories([]);
		}

		// Скрываем описание при начале редактирования
		setShowDescription(null);
	};

	const cancelEditing = () => {
		setEditingProduct(null);
		setEditForm({
			title: "",
			sku: "",
			price: "",
			supplierPrice: "",
			brand: "",
			description: "",
			departmentId: "",
			categoryId: "",
		});
		setAvailableCategories([]);
		// Сбрасываем состояние изображения
		setImageFile(null);
		setImageToDelete(false);
		// Скрываем описание при отмене редактирования
		setShowDescription(null);
	};

	const saveProduct = async (productId: number) => {
		try {
			// Находим исходный товар для сравнения
			const originalProduct = products.find((p) => p.id === productId);
			if (!originalProduct) {
				console.error("Товар не найден");
				return;
			}

			// Валидация цены поставщика
			const supplierPrice = editForm.supplierPrice ? parseFloat(editForm.supplierPrice) : null;
			const sitePrice = parseFloat(editForm.price);

			if (supplierPrice !== null && supplierPrice > sitePrice) {
				alert("Цена поставщика не может быть больше цены на сайте!");
				return;
			}

			// Проверяем, есть ли изменения
			const hasChanges =
				editForm.title !== (originalProduct.title || "") ||
				editForm.sku !== (originalProduct.sku || "") ||
				parseFloat(editForm.price) !== originalProduct.price ||
				(editForm.supplierPrice ? parseFloat(editForm.supplierPrice) : null) !== (originalProduct.supplierPrice || null) ||
				editForm.brand !== (originalProduct.brand || "") ||
				editForm.description !== (originalProduct.description || "") ||
				parseInt(editForm.departmentId) !== (originalProduct.departmentId || 0) ||
				(editForm.categoryId ? parseInt(editForm.categoryId) : null) !== (originalProduct.categoryId || null) ||
				imageFile !== null || // Есть новое изображение
				imageToDelete === true; // Или изображение нужно удалить

			console.log("🔍 Frontend Debug - hasChanges:", hasChanges);
			console.log("🔍 Frontend Debug - imageFile:", imageFile);
			console.log("🔍 Frontend Debug - imageToDelete:", imageToDelete);

			// Если изменений нет, просто закрываем редактирование
			if (!hasChanges) {
				setEditingProduct(null);
				setEditForm({
					title: "",
					sku: "",
					price: "",
					supplierPrice: "",
					brand: "",
					description: "",
					departmentId: "",
					categoryId: "",
				});
				setAvailableCategories([]);
				return;
			}

			// Создаем FormData для отправки данных
			const formData = new FormData();
			formData.append("title", editForm.title);
			formData.append("sku", editForm.sku);
			formData.append("price", editForm.price);
			if (editForm.supplierPrice) {
				formData.append("supplierPrice", editForm.supplierPrice);
			}
			formData.append("brand", editForm.brand);
			formData.append("description", editForm.description);
			formData.append("departmentId", editForm.departmentId);
			if (editForm.categoryId) {
				formData.append("categoryId", editForm.categoryId);
			}

			// Добавляем изображение если есть
			if (imageFile) {
				formData.append("imageFile", imageFile);
				console.log("🔍 Frontend Debug - Добавляем imageFile:", imageFile.name, imageFile.size);
			}

			// Добавляем флаг удаления изображения
			if (imageToDelete) {
				formData.append("deleteImage", "true");
				console.log("🔍 Frontend Debug - Добавляем deleteImage: true");
			}

			console.log("🔍 Frontend Debug - imageFile state:", imageFile);
			console.log("🔍 Frontend Debug - imageToDelete state:", imageToDelete);

			console.log("🔍 Frontend Debug - Отправляем запрос на:", `/api/products/${productId}`);

			const response = await fetch(`/api/products/${productId}`, {
				method: "PATCH",
				credentials: "include",
				body: formData,
			});

			console.log("🔍 Frontend Debug - Ответ сервера:", response.status, response.statusText);

			if (response.ok) {
				const data = await response.json();
				console.log("🔍 Frontend Debug - Ответ от сервера:", data);
				console.log("🔍 Frontend Debug - Новое изображение:", data.product?.image);

				// Обновляем список товаров
				const updatedProducts = products.map((p) => {
					if (p.id === productId) {
						const updatedProduct = {
							...p,
							title: editForm.title,
							sku: editForm.sku,
							price: parseFloat(editForm.price),
							supplierPrice: editForm.supplierPrice ? parseFloat(editForm.supplierPrice) : null,
							brand: editForm.brand,
							description: editForm.description,
							departmentId: parseInt(editForm.departmentId),
							categoryId: editForm.categoryId ? parseInt(editForm.categoryId) : null,
							// Обновляем изображение если оно изменилось
							image: data.product?.image !== undefined ? data.product.image : p.image,
						};
						// Обновляем отдел в товаре
						const selectedDepartment = departments.find((d) => d.id.toString() === editForm.departmentId);
						updatedProduct.department = selectedDepartment ? { id: selectedDepartment.id, name: selectedDepartment.name } : undefined;
						// Обновляем категорию в товаре
						if (editForm.categoryId) {
							const selectedCategory = availableCategories.find((c) => c.id.toString() === editForm.categoryId);
							updatedProduct.category = selectedCategory ? { id: selectedCategory.id, title: selectedCategory.title } : undefined;
						} else {
							updatedProduct.category = undefined;
						}
						return updatedProduct;
					}
					return p;
				});
				setProducts(updatedProducts);
				setEditingProduct(null);
				setEditForm({
					title: "",
					sku: "",
					price: "",
					supplierPrice: "",
					brand: "",
					description: "",
					departmentId: "",
					categoryId: "",
				});
				setAvailableCategories([]);
				// Сбрасываем состояние изображения после успешного сохранения
				setImageFile(null);
				setImageToDelete(false);
			} else {
				const errorData = await response.text();
				console.error("❌ Frontend Debug - Ошибка при сохранении товара:", response.status, response.statusText, errorData);
			}
		} catch (error) {
			console.error("Ошибка при сохранении товара:", error);
		}
	};

	const toggleDescription = (productId: number) => {
		setShowDescription(showDescription === productId ? null : productId);
	};

	// Создание массива активных фильтров
	const getActiveFilters = (): ActiveFilter[] => {
		const filters: ActiveFilter[] = [];

		if (categoryFilter !== "all") {
			const category = categories.find((c) => c.id === categoryFilter);
			filters.push({
				key: "category",
				label: "Категория",
				value: category?.title || "",
			});
		}

		if (departmentFilter !== "all") {
			filters.push({
				key: "department",
				label: "Отдел",
				value: departments.find((d) => d.id === departmentFilter)?.name || "",
			});
		}

		if (brandFilter !== "all") {
			filters.push({
				key: "brand",
				label: "Бренд",
				value: brandFilter,
			});
		}

		// Фильтры по ценам
		if (activeSupplierPriceFilter.min > priceBounds.supplierPrice.min || activeSupplierPriceFilter.max < priceBounds.supplierPrice.max) {
			filters.push({
				key: "supplierPrice",
				label: "Цена поставщика",
				value: `${activeSupplierPriceFilter.min} - ${activeSupplierPriceFilter.max} ₽`,
			});
		}

		if (activeSitePriceFilter.min > priceBounds.sitePrice.min || activeSitePriceFilter.max < priceBounds.sitePrice.max) {
			filters.push({
				key: "sitePrice",
				label: "Цена на сайте",
				value: `${activeSitePriceFilter.min} - ${activeSitePriceFilter.max} ₽`,
			});
		}

		if (sortBy) {
			filters.push({
				key: "sort",
				label: "Сортировка",
				value: `${
					sortBy === "id"
						? "ID"
						: sortBy === "title"
						? "Название"
						: sortBy === "sku"
						? "SKU"
						: sortBy === "price"
						? "Цена"
						: sortBy === "supplierPrice"
						? "Цена поставщика"
						: "Дата создания"
				} ${sortOrder === "asc" ? "↑" : "↓"}`,
			});
		}

		return filters;
	};

	// Опции для фильтров
	const categoryOptions = [{ value: "all", label: "Все категории" }, ...categories.map((cat) => ({ value: cat.id.toString(), label: cat.title }))];

	const departmentOptions = [{ value: "all", label: "Все отделы" }, ...departments.map((dept) => ({ value: dept.id.toString(), label: dept.name }))];

	const brandOptions = [{ value: "all", label: "Все бренды" }, ...brands.map((brand) => ({ value: brand, label: brand }))];

	return (
		<div className={`tableContent ${styles.tableContent}`}>
			{/* Блок фильтров */}
			<FiltersBlock
				activeFilters={getActiveFilters()}
				onResetFilters={resetFilters}
				searchValue={search}
				onSearchChange={setSearch}
				searchPlaceholder="Поиск по названию, SKU, бренду или ID..."
				showSearch={true}
			>
				{/* Фильтры по ценам */}
				<PriceRangeFilter
					label="Цена на сайте (₽)"
					minValue={priceBounds.sitePrice.min}
					maxValue={priceBounds.sitePrice.max}
					value={sitePriceFilter}
					onChange={handleSitePriceChange}
					onChangeComplete={handleSitePriceChangeComplete}
					step={100}
				/>
				<PriceRangeFilter
					label="Цена поставщика (₽)"
					minValue={priceBounds.supplierPrice.min}
					maxValue={priceBounds.supplierPrice.max}
					value={supplierPriceFilter}
					onChange={handleSupplierPriceChange}
					onChangeComplete={handleSupplierPriceChangeComplete}
					step={100}
				/>
			</FiltersBlock>

			<div className={styles.tableContainer}>
				<table>
					<thead className={`centerTableHeader`}>
						<tr>
							<th
								className={`${styles.tableHeaderCell} idCell sortableHeader ${sortBy === "id" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "id") {
										setSortBy("id");
										setSortOrder("asc");
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								ID
							</th>
							<th
								className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "title" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "title") {
										setSortBy("title");
										setSortOrder("asc");
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								Название
							</th>
							<th
								className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "sku" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "sku") {
										setSortBy("sku");
										setSortOrder("asc");
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								SKU
							</th>
							<th
								className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "price" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "price") {
										setSortBy("price");
										setSortOrder("asc");
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								Цена на сайте
							</th>
							<th
								className={`${styles.tableHeaderCell} sortableHeader ${sortBy === "supplierPrice" ? (sortOrder === "asc" ? "↑" : "↓") : ""}`}
								onClick={() => {
									if (sortBy !== "supplierPrice") {
										setSortBy("supplierPrice");
										setSortOrder("asc");
										setPage(1);
									} else if (sortOrder === "asc") {
										setSortOrder("desc");
										setPage(1);
									} else {
										setSortBy(null);
										setSortOrder(null);
										setPage(1);
									}
								}}
							>
								Цена поставщика
							</th>
							<th className={styles.tableHeaderCell}>Изображение</th>
							<th className={styles.tableHeaderCell}>Описание</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={categoryOptions}
									value={categoryFilter === "all" ? "all" : categoryFilter.toString()}
									onChange={handleCategoryChange}
									placeholder="Выберите категорию"
									className={styles.categorySelect}
									showSearch={true}
									searchPlaceholder="Поиск по категории..."
								/>
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={departmentOptions}
									value={departmentFilter === "all" ? "all" : departmentFilter === "none" ? "none" : departmentFilter.toString()}
									onChange={handleDepartmentChange}
									placeholder="Выберите отдел"
									className={styles.departmentSelect}
									showSearch={true}
									searchPlaceholder="Поиск по отделу..."
								/>
							</th>
							<th className={styles.tableHeaderCell}>
								<CustomSelect
									options={brandOptions}
									value={brandFilter}
									onChange={handleBrandChange}
									placeholder="Выберите бренд"
									className={styles.brandSelect}
									showSearch={true}
									searchPlaceholder="Поиск по бренду..."
								/>
							</th>
							<th className={styles.tableHeaderCell}>Действия</th>
						</tr>
					</thead>
					<tbody className={styles.tableBody}>
						{loading ? (
							<tr>
								<td colSpan={11} className={styles.loadingCell}>
									<Loading />
								</td>
							</tr>
						) : products.length === 0 ? (
							<tr>
								<td colSpan={11} className={styles.emptyCell}>
									Нет товаров
								</td>
							</tr>
						) : (
							products.map((product) => {
								const isEditing = editingProduct === product.id;

								return (
									<tr key={product.id}>
										<td className={`idCell`}>{product.id}</td>
										<td>
											{isEditing ? (
												<input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
											) : (
												<Link href={`/admin/product-management/products/${product.id}`} className={`itemLink`}>
													{product.title || "—"}
												</Link>
											)}
										</td>
										<td>
											{isEditing ? (
												<input type="text" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
											) : (
												product.sku
											)}
										</td>
										<td>
											{isEditing ? (
												<input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} step="0.01" />
											) : (
												`${product.price} ₽`
											)}
										</td>
										<td>
											{isEditing ? (
												<input
													type="number"
													value={editForm.supplierPrice}
													onChange={(e) => setEditForm({ ...editForm, supplierPrice: e.target.value })}
													step="0.01"
												/>
											) : product.supplierPrice ? (
												`${product.supplierPrice} ₽`
											) : (
												"—"
											)}
										</td>
										<td>
											{isEditing ? (
												<div className={styles.imageEditCell}>
													<ImageUpload
														imageUrl={product.image || ""}
														onImageChange={(file) => {
															// Сохраняем файл в состояние для последующего сохранения
															setImageFile(file);
															// Сбрасываем флаг удаления при выборе нового файла
															setImageToDelete(false);
														}}
														onImageRemove={() => {
															setImageFile(null);
															// Устанавливаем флаг удаления
															setImageToDelete(true);
														}}
														disabled={false}
													/>
												</div>
											) : product.image ? (
												<div className="imageBlock">
													<img src={product.image} alt={product.title} className={`image`} />
												</div>
											) : (
												<div className={`imageBlock`}>
													<div className="noImage">Нет изображения</div>
												</div>
											)}
										</td>
										<td>
											{isEditing ? (
												<textarea
													value={editForm.description}
													onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
													rows={3}
													placeholder="Описание товара..."
												/>
											) : (
												<div className={`description`}>
													{product.description ? (
														<>
															<div className={`descriptionPreview`}>
																{product.description.length > 50 ? `${product.description.substring(0, 50)}...` : product.description}
															</div>
															{product.description.length > 50 && (
																<button onClick={() => toggleDescription(product.id)} className={styles.showMoreButton}>
																	{showDescription === product.id ? "Скрыть" : "Показать"}
																</button>
															)}
															{showDescription === product.id && <div className={styles.fullDescription}>{product.description}</div>}
														</>
													) : (
														"—"
													)}
												</div>
											)}
										</td>
										<td>
											{isEditing ? (
												<select
													value={editForm.categoryId}
													onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
													className={styles.categorySelect}
												>
													<option value="">Без категории</option>
													{availableCategories.length > 0 ? (
														availableCategories.map((category) => (
															<option key={category.id} value={category.id.toString()}>
																{category.title}
															</option>
														))
													) : (
														<option value="" disabled>
															Нет доступных категорий для этого отдела
														</option>
													)}
												</select>
											) : product.category ? (
												<Link href={`/admin/categories/${product.category.id}`}>{product.category.title}</Link>
											) : (
												"—"
											)}
										</td>
										<td>
											{isEditing ? (
												<select
													value={editForm.departmentId}
													onChange={async (e) => {
														const newDepartmentId = e.target.value;
														setEditForm({ ...editForm, departmentId: newDepartmentId, categoryId: "" });

														// Загружаем категории для нового отдела
														if (newDepartmentId) {
															try {
																const response = await fetch(`/api/categories?departmentId=${newDepartmentId}`);
																if (response.ok) {
																	const departmentCategories = await response.json();
																	setAvailableCategories(departmentCategories);
																}
															} catch (error) {
																console.error("Ошибка при загрузке категорий отдела:", error);
																setAvailableCategories([]);
															}
														} else {
															setAvailableCategories([]);
														}
													}}
													className={styles.departmentSelect}
												>
													{departments.map((dept) => (
														<option key={dept.id} value={dept.id.toString()}>
															{dept.name}
														</option>
													))}
												</select>
											) : product.department ? (
												<Link href={`/admin/departments/${product.department.id}`}>{product.department.name}</Link>
											) : (
												"—"
											)}
										</td>
										<td>
											{isEditing ? (
												<input type="text" value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} />
											) : (
												product.brand
											)}
										</td>
										<td>
											{isEditing ? (
												<div className={styles.editActions}>
													<button onClick={() => saveProduct(product.id)} title="Сохранить">
														💾
													</button>
													<button onClick={cancelEditing} title="Отменить">
														❌
													</button>
												</div>
											) : (
												<div className={`actionButtons`}>
													{["admin", "superadmin"].includes(user?.role || "") && (
														<button onClick={() => startEditing(product)} title="Редактировать">
															✏️
														</button>
													)}
													<Link href={`/admin/product-management/products/${product.id}/logs`} title="Логи">
														📋
													</Link>
												</div>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
				<Link href="/admin/product-management/products/create" className={`createButton`}>
					+ Создать товар
				</Link>
			</div>

			{/* Пагинация */}
			<Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className={styles.productsPagination} />
		</div>
	);
}
