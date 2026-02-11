"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { ServiceKit, Product, ProductListItem, ServiceKitItem } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import ConfirmPopup from "@/components/ui/confirmPopup/ConfirmPopup";
import ImageUpload from "@/components/ui/imageUpload/ImageUpload";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import styles from "./ServiceKitComponent.module.scss";

type ServiceKitPageProps = {
	kitId?: string | number; // Если не указан, значит создаем новый комплект
	isCreating?: boolean;
	userRole?: string;
};

// Тип для товара в комплекте
type KitItem = {
	productId: number;
	product: Product;
	analogProductIds: number[]; // Массив ID аналогов
};

export default function ServiceKitComponent({ kitId, isCreating = false, userRole }: ServiceKitPageProps) {
	const { user } = useAuthStore();
	const router = useRouter();
	const [kitData, setKitData] = useState<ServiceKit | null>(null);
	const [loading, setLoading] = useState(!isCreating);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Состояние для формы
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		price: "",
	});
	const [initialFormData, setInitialFormData] = useState({
		title: "",
		description: "",
		price: "",
	});

	// Состояние для товаров в комплекте
	const [kitItems, setKitItems] = useState<KitItem[]>([]);
	const [initialKitItems, setInitialKitItems] = useState<KitItem[]>([]);

	// Состояния для работы с изображением
	const [formImage, setFormImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string>("");
	const [originalImage, setOriginalImage] = useState<string>("");

	// Состояния для поиска товаров
	const [productSearch, setProductSearch] = useState("");
	const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [showProductSearch, setShowProductSearch] = useState(false);
	const blurTimeout = useRef<NodeJS.Timeout | null>(null);

	// Определяем режим редактирования
	const canEdit = userRole === "superadmin" || userRole === "admin";

	// Загрузка данных комплекта
	useEffect(() => {
		const fetchKitData = async () => {
			if (isCreating) return;

			try {
				setLoading(true);
				const response = await fetch(`/api/service-kits/${kitId}`, {
					credentials: "include",
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Ошибка при загрузке данных комплекта");
				}

				const kit: ServiceKit = await response.json();
				setKitData(kit);

				setFormData({
					title: kit.title || "",
					description: kit.description || "",
					price: kit.price?.toString() || "",
				});
				setInitialFormData({
					title: kit.title || "",
					description: kit.description || "",
					price: kit.price?.toString() || "",
				});

				setImagePreview(kit.image || "");
				setOriginalImage(kit.image || "");

				// Преобразуем kitItems в формат KitItem
				const items: KitItem[] = (kit.kitItems || []).map((item) => ({
					productId: item.productId,
					product: item.product!,
					analogProductIds: item.analogs.map((analog) => analog.analogProductId),
				}));
				setKitItems(items);
				setInitialKitItems(JSON.parse(JSON.stringify(items))); // Глубокое копирование
			} catch (error: any) {
				console.error("Ошибка при загрузке комплекта:", error);
				showErrorToast(error.message || "Ошибка при загрузке комплекта");
			} finally {
				setLoading(false);
			}
		};

		fetchKitData();
	}, [isCreating, kitId]);

	// Проверка изменений
	useEffect(() => {
		const formChanged =
			formData.title !== initialFormData.title ||
			formData.description !== initialFormData.description ||
			formData.price !== initialFormData.price ||
			formImage !== null ||
			JSON.stringify(kitItems) !== JSON.stringify(initialKitItems);

		setHasChanges(formChanged);
	}, [formData, initialFormData, formImage, kitItems, initialKitItems]);

	// Поиск товаров
	const handleProductSearch = async (query: string) => {
		if (query.length < 2) {
			setSearchResults([]);
			return;
		}

		try {
			setIsSearching(true);
			const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				setSearchResults(data.products || []);
			}
		} catch (error) {
			console.error("Ошибка поиска товаров:", error);
		} finally {
			setIsSearching(false);
		}
	};

	// Добавление товара в комплект
	const handleProductSelect = async (product: ProductListItem) => {
		if (!canEdit) return;

		// Проверяем, не добавлен ли уже этот товар
		if (kitItems.some((item) => item.productId === product.id)) {
			showErrorToast("Этот товар уже добавлен в комплект");
			return;
		}

		// Получаем аналоги товара из ProductAnalog
		let analogs: Product[] = [];
		try {
			const analogsResponse = await fetch(`/api/service-kits/product-analogs?productId=${product.id}`, {
				credentials: "include",
			});
			if (analogsResponse.ok) {
				analogs = await analogsResponse.json();
			}
		} catch (error) {
			console.error("Ошибка при загрузке аналогов:", error);
		}

		// Добавляем товар в комплект
		const newItem: KitItem = {
			productId: product.id,
			product: {
				id: product.id,
				title: product.title,
				sku: product.sku,
				brand: product.brand,
				price: product.price,
				image: product.image,
			} as Product,
			analogProductIds: analogs.map((analog) => analog.id), // Автоматически подтягиваем аналоги
		};

		setKitItems([...kitItems, newItem]);
		setProductSearch("");
		setSearchResults([]);
		setIsSearchFocused(false);
		setShowProductSearch(false);
	};

	// Состояния для поиска аналогов (для каждого товара)
	const [analogSearchStates, setAnalogSearchStates] = useState<
		Map<number, { query: string; results: ProductListItem[]; isSearching: boolean; isFocused: boolean; isOpen: boolean }>
	>(new Map());

	// Поиск товаров для добавления в качестве аналога
	const handleAnalogSearch = async (productId: number, query: string) => {
		if (query.length < 2) {
			setAnalogSearchStates((prev) => {
				const newMap = new Map(prev);
				const state = newMap.get(productId) || { query: "", results: [], isSearching: false, isFocused: false, isOpen: false };
				newMap.set(productId, { ...state, query, results: [] });
				return newMap;
			});
			return;
		}

		setAnalogSearchStates((prev) => {
			const newMap = new Map(prev);
			const state = newMap.get(productId) || { query: "", results: [], isSearching: false, isFocused: false, isOpen: false };
			newMap.set(productId, { ...state, query, isSearching: true });
			return newMap;
		});

		try {
			const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				setAnalogSearchStates((prev) => {
					const newMap = new Map(prev);
					const state = newMap.get(productId) || { query: "", results: [], isSearching: false, isFocused: false, isOpen: false };
					newMap.set(productId, { ...state, query, results: data.products || [], isSearching: false });
					return newMap;
				});
			}
		} catch (error) {
			console.error("Ошибка поиска товаров:", error);
			setAnalogSearchStates((prev) => {
				const newMap = new Map(prev);
				const state = newMap.get(productId) || { query: "", results: [], isSearching: false, isFocused: false, isOpen: false };
				newMap.set(productId, { ...state, query, isSearching: false });
				return newMap;
			});
		}
	};

	// Добавление аналога через поиск
	const handleAddAnalogFromSearch = (productId: number, analogProduct: ProductListItem) => {
		if (!canEdit) return;

		// Проверяем, не является ли аналогом сам товар
		if (analogProduct.id === productId) {
			showErrorToast("Товар не может быть аналогом самому себе");
			return;
		}

		// Проверяем, не добавлен ли уже этот аналог
		const item = kitItems.find((item) => item.productId === productId);
		if (item && item.analogProductIds.includes(analogProduct.id)) {
			showErrorToast("Этот товар уже добавлен в качестве аналога");
			return;
		}

		setKitItems(
			kitItems.map((item) => {
				if (item.productId === productId) {
					return { ...item, analogProductIds: [...item.analogProductIds, analogProduct.id] };
				}
				return item;
			}),
		);

		// Очищаем поиск
		setAnalogSearchStates((prev) => {
			const newMap = new Map(prev);
			const state = newMap.get(productId) || { query: "", results: [], isSearching: false, isFocused: false, isOpen: false };
			newMap.set(productId, { ...state, query: "", results: [], isFocused: false, isOpen: false });
			return newMap;
		});
	};

	// Удаление товара из комплекта
	const handleRemoveProduct = (productId: number) => {
		if (!canEdit) return;
		setKitItems(kitItems.filter((item) => item.productId !== productId));
		// Очищаем состояние поиска аналогов для этого товара
		setAnalogSearchStates((prev) => {
			const newMap = new Map(prev);
			newMap.delete(productId);
			return newMap;
		});
	};

	// Состояние для загрузки данных об аналогах
	const [analogProductsData, setAnalogProductsData] = useState<Map<number, Product>>(new Map());

	// Загрузка данных об аналогах
	useEffect(() => {
		const loadAnalogProducts = async () => {
			const allAnalogIds = new Set<number>();
			kitItems.forEach((item) => {
				item.analogProductIds.forEach((id) => allAnalogIds.add(id));
			});

			// Загружаем только те товары, которых еще нет в analogProductsData
			const idsToLoad = Array.from(allAnalogIds).filter((id) => !analogProductsData.has(id));

			if (idsToLoad.length === 0) return;

			try {
				// Загружаем данные о товарах-аналогах через API
				const productsPromises = idsToLoad.map(async (id) => {
					try {
						const response = await fetch(`/api/products/${id}`, {
							credentials: "include",
						});
						if (response.ok) {
							const data = await response.json();
							const product = data.product; // API возвращает { product: {...} }
							if (product) {
								return { id, product: product as Product };
							}
						}
					} catch (error) {
						console.error(`Ошибка загрузки товара ${id}:`, error);
					}
					return null;
				});

				const results = await Promise.all(productsPromises);
				setAnalogProductsData((prev) => {
					const newMap = new Map(prev);
					results.forEach((result) => {
						if (result) {
							newMap.set(result.id, result.product);
						}
					});
					return newMap;
				});
			} catch (error) {
				console.error("Ошибка при загрузке данных об аналогах:", error);
			}
		};

		loadAnalogProducts();
	}, [kitItems, analogProductsData]);

	// Удаление аналога у товара
	const handleRemoveAnalog = (productId: number, analogProductId: number) => {
		if (!canEdit) return;
		setKitItems(
			kitItems.map((item) => {
				if (item.productId === productId) {
					return { ...item, analogProductIds: item.analogProductIds.filter((id) => id !== analogProductId) };
				}
				return item;
			}),
		);
	};

	// Сохранение комплекта
	const handleSave = async () => {
		if (!canEdit) return;

		if (!formData.title.trim()) {
			showErrorToast("Название комплекта обязательно");
			return;
		}

		if (!formData.price || parseFloat(formData.price) < 0) {
			showErrorToast("Цена должна быть неотрицательной");
			return;
		}

		if (kitItems.length === 0) {
			showErrorToast("Комплект должен содержать хотя бы один товар");
			return;
		}

		setIsSaving(true);
		try {
			const kitDataToSend = {
				title: formData.title.trim(),
				description: formData.description.trim() || null,
				price: parseFloat(formData.price),
				image: imagePreview || null,
				kitItems: kitItems.map((item) => ({
					productId: item.productId,
					analogProductIds: item.analogProductIds,
				})),
			};

			// Если есть новое изображение, загружаем его
			if (formImage) {
				const formDataImage = new FormData();
				formDataImage.append("file", formImage);
				const uploadResponse = await fetch("/api/upload", {
					method: "POST",
					body: formDataImage,
					credentials: "include",
				});

				if (uploadResponse.ok) {
					const uploadData = await uploadResponse.json();
					kitDataToSend.image = uploadData.url;
				}
			}

			const url = isCreating ? "/api/service-kits" : `/api/service-kits/${kitId}`;
			const method = isCreating ? "POST" : "PUT";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(kitDataToSend),
				credentials: "include",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при сохранении комплекта");
			}

			const savedKit = await response.json();
			showSuccessToast(isCreating ? "Комплект ТО успешно создан" : "Комплект ТО успешно обновлен");
			router.push(`/admin/product-management/kits/${savedKit.id}`);
		} catch (error: any) {
			console.error("Ошибка при сохранении комплекта:", error);
			showErrorToast(error.message || "Ошибка при сохранении комплекта");
		} finally {
			setIsSaving(false);
		}
	};

	// Отмена изменений
	const handleCancel = () => {
		if (isCreating) {
			router.push("/admin/product-management/kits");
		} else {
			setFormData(initialFormData);
			setKitItems(JSON.parse(JSON.stringify(initialKitItems)));
			setFormImage(null);
			setImagePreview(originalImage);
		}
	};

	// Удаление комплекта
	const handleDelete = async () => {
		if (!canEdit || !kitId) return;

		setIsDeleting(true);
		try {
			const response = await fetch(`/api/service-kits/${kitId}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при удалении комплекта");
			}

			showSuccessToast("Комплект ТО успешно удален");
			router.push("/admin/product-management/kits");
		} catch (error: any) {
			console.error("Ошибка при удалении комплекта:", error);
			showErrorToast(error.message || "Ошибка при удалении комплекта");
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	if (loading) {
		return <Loading />;
	}

	return (
		<div className="tableContent productComponent kitContent">
			<div className="formContainer">
				<div className="formHeader">
					<h2>{isCreating ? "Создание комплекта ТО" : kitData ? `Комплект ТО: ${kitData.title}` : "Загрузка комплекта ТО..."}</h2>
					{!isCreating && canEdit && (
						<div className="formActions">
							<button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className="dangerButton">
								{isDeleting ? "Удаление..." : "Удалить комплект ТО"}
							</button>
						</div>
					)}
				</div>

				<div className="formSections">
					{/* Основная информация */}
					<div className="formSection borderBlock">
						<h2 className="sectionTitle">Основная информация</h2>
						<div className="formRow">
							<div className="formField fullWidth">
								<label htmlFor="title">
									Название комплекта <span className="required">*</span>
								</label>
								<input
									id="title"
									type="text"
									value={formData.title}
									onChange={(e) => setFormData({ ...formData, title: e.target.value })}
									disabled={!canEdit}
									placeholder="Введите название комплекта ТО"
								/>
							</div>
						</div>

						<div className="formRow">
							<div className="formField">
								<label htmlFor="image">Изображение</label>
								<ImageUpload
									imageUrl={imagePreview}
									onImageChange={(file) => {
										setFormImage(file);
										if (file) {
											const reader = new FileReader();
											reader.onloadend = () => {
												setImagePreview(reader.result as string);
											};
											reader.readAsDataURL(file);
										}
									}}
									onImageRemove={() => {
										setFormImage(null);
										setImagePreview("");
									}}
									disabled={!canEdit}
								/>
							</div>
						</div>

						<div className="formRow">
							<div className="formField fullWidth">
								<label htmlFor="description">Описание</label>
								<textarea
									id="description"
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									disabled={!canEdit}
									rows={4}
									placeholder="Введите описание комплекта ТО"
								/>
							</div>
						</div>

						<div className="formRow">
							<div className="formField">
								<label htmlFor="price">
									Цена <span className="required">*</span>
								</label>
								<input
									id="price"
									type="number"
									value={formData.price}
									onChange={(e) => setFormData({ ...formData, price: e.target.value })}
									disabled={!canEdit}
									placeholder="0"
									min="0"
									step="0.01"
								/>
							</div>
						</div>
					</div>

					{/* Товары в комплекте */}
					<div className="formSection borderBlock">
						<div className="formField fullWidth">
							<h2 className="sectionTitle">Товары в комплекте</h2>
							{kitItems.length === 0 ? (
								<div className="emptyState">Товары не добавлены</div>
							) : (
								<div className={`${styles.kitItemsList} kitItemsList`}>
									{kitItems.map((item) => (
										<div key={item.productId} className={`${styles.kitItemCard} kitItem`}>
											<div className={`${styles.kitItemHeader} kitItemHeader`}>
												<div className={`${styles.kitItemProduct} kitItemProduct`}>
													<div className="imageBlock">
														{item.product.image ? (
															<img src={item.product.image} alt={item.product.title} className="image" loading="lazy" />
														) : (
															<div className="noImage">Нет изображения</div>
														)}
													</div>
													<span className={`${styles.productTitle} productTitle`}>{item.product.title}</span>
													<span className={`${styles.productSku} productSku`}>({item.product.sku})</span>
												</div>
												{canEdit && (
													<button
														type="button"
														onClick={() => handleRemoveProduct(item.productId)}
														className={`${styles.deleteProductButton} deleteButton`}
													>
														× Удалить
													</button>
												)}
											</div>
											{/* Управление аналогами */}
											<div className={`${styles.analogsBlock} kitItemAnalogs`}>
												<div className={`${styles.analogsHeader} analogsHeader`}>
													<div className={styles.analogsTitleGroup}>
														<span className={styles.analogBadge}>Аналоги</span>
														<span className={styles.analogsCount}>({item.analogProductIds.length})</span>
													</div>
												</div>

												{/* Список аналогов */}
												{item.analogProductIds.length === 0 ? (
													<div className="emptyState small">Аналоги не добавлены</div>
												) : (
													<div className={`${styles.analogsList} analogsList`}>
														{item.analogProductIds.map((analogId) => {
															const analogProduct = analogProductsData.get(analogId);
															return (
																<div key={analogId} className={`${styles.analogItem} analogItem`}>
																	<div className={`${styles.analogInfo} analogInfo`}>
																		{analogProduct ? (
																			<>
																				<div className="imageBlock">
																					{analogProduct.image ? (
																						<img src={analogProduct.image} alt={analogProduct.title} className="image" loading="lazy" />
																					) : (
																						<div className="noImage">Нет изображения</div>
																					)}
																				</div>
																				<span className={`${styles.productTitle} productTitle`}>{analogProduct.title}</span>
																				<span className={`${styles.productSku} productSku`}>({analogProduct.sku || "N/A"})</span>
																			</>
																		) : (
																			<span>Товар ID: {analogId} (загрузка...)</span>
																		)}
																	</div>
																	{canEdit && (
																		<button
																			type="button"
																			onClick={() => handleRemoveAnalog(item.productId, analogId)}
																			className="deleteButton small"
																		>
																			Удалить
																		</button>
																	)}
																</div>
															);
														})}
													</div>
												)}

												{canEdit && !analogSearchStates.get(item.productId)?.isOpen && (
													<div className={styles.analogsActions}>
														<button
															type="button"
															onClick={() => {
																setAnalogSearchStates((prev) => {
																	const newMap = new Map(prev);
																	const state = newMap.get(item.productId) || {
																		query: "",
																		results: [],
																		isSearching: false,
																		isFocused: false,
																		isOpen: false,
																	};
																	newMap.set(item.productId, { ...state, isOpen: !state.isOpen });
																	return newMap;
																});
															}}
															className="primaryButton small"
														>
															Добавить аналог
														</button>
													</div>
												)}

												{/* Поиск товаров для добавления аналога */}
												{canEdit && analogSearchStates.get(item.productId)?.isOpen && (
													<div className="searchContainer">
														<div className="searchHeader">
															<span>Поиск товаров для добавления в качестве аналога</span>
															<button
																type="button"
																onClick={() => {
																	setAnalogSearchStates((prev) => {
																		const newMap = new Map(prev);
																		const state = newMap.get(item.productId) || {
																			query: "",
																			results: [],
																			isSearching: false,
																			isFocused: false,
																			isOpen: false,
																		};
																		newMap.set(item.productId, { ...state, query: "", results: [], isFocused: false, isOpen: false });
																		return newMap;
																	});
																}}
																className="closeSearchButton"
															>
																×
															</button>
														</div>
														<input
															type="text"
															value={analogSearchStates.get(item.productId)?.query || ""}
															onChange={(e) => {
																const query = e.target.value;
																setAnalogSearchStates((prev) => {
																	const newMap = new Map(prev);
																	const state = newMap.get(item.productId) || {
																		query: "",
																		results: [],
																		isSearching: false,
																		isFocused: false,
																		isOpen: false,
																	};
																	newMap.set(item.productId, { ...state, query });
																	return newMap;
																});
																handleAnalogSearch(item.productId, query);
															}}
															onFocus={() => {
																setAnalogSearchStates((prev) => {
																	const newMap = new Map(prev);
																	const state = newMap.get(item.productId) || {
																		query: "",
																		results: [],
																		isSearching: false,
																		isFocused: false,
																		isOpen: false,
																	};

																	newMap.set(item.productId, { ...state, isFocused: true });
																	return newMap;
																});
															}}
															placeholder="Поиск товаров по названию, артикулу или бренду"
															className="searchInput"
															autoFocus
														/>
														{analogSearchStates.get(item.productId)?.isSearching && (
															<div className="searchResults loading">
																<Loading />
															</div>
														)}
														{!analogSearchStates.get(item.productId)?.isSearching &&
															analogSearchStates.get(item.productId)?.isFocused &&
															(analogSearchStates.get(item.productId)?.query || "").length >= 2 && (
																<div className="searchResults">
																	{analogSearchStates.get(item.productId)?.results.length === 0 ? (
																		<div className="searchResultItem">Товары не найдены</div>
																	) : (
																		analogSearchStates
																			.get(item.productId)
																			?.results.filter(
																				(product) => product.id !== item.productId && !item.analogProductIds.includes(product.id),
																			)
																			.map((product) => (
																				<div
																					key={product.id}
																					className="searchResultItem"
																					onClick={() => handleAddAnalogFromSearch(item.productId, product)}
																				>
																					<div className="productInfo">
																						<span className="productTitle">{product.title}</span>
																						<span className="productSku">({product.sku})</span>
																					</div>
																				</div>
																			))
																	)}
																</div>
															)}
													</div>
												)}
											</div>
										</div>
									))}
								</div>
							)}
							{canEdit && (
								<div className="addProductSection">
									{!showProductSearch ? (
										<button type="button" onClick={() => setShowProductSearch(true)} className="primaryButton" disabled={!canEdit}>
											Добавить товар
										</button>
									) : (
										<div className="searchContainer">
											<div className="searchHeader">
												<span>Поиск товаров</span>
												<button
													type="button"
													onClick={() => {
														setShowProductSearch(false);
														setProductSearch("");
														setSearchResults([]);
														setIsSearchFocused(false);
													}}
													className="closeSearchButton"
												>
													×
												</button>
											</div>
											<input
												type="text"
												value={productSearch}
												onChange={(e) => {
													setProductSearch(e.target.value);
													handleProductSearch(e.target.value);
												}}
												onFocus={() => setIsSearchFocused(true)}
												placeholder="Поиск товаров по названию, артикулу или бренду"
												className="searchInput"
												autoFocus
											/>
											{isSearching && (
												<div className="searchResults loading">
													<Loading />
												</div>
											)}
											{!isSearching && isSearchFocused && productSearch.length >= 2 && (
												<div className="searchResults">
													{searchResults.length === 0 ? (
														<div className="searchResultItem">Товары не найдены</div>
													) : (
														searchResults.map((product) => (
															<div key={product.id} className="searchResultItem" onClick={() => handleProductSelect(product)}>
																<div className="productInfo">
																	<span className="productTitle">{product.title}</span>
																	<span className="productSku">({product.sku})</span>
																</div>
															</div>
														))
													)}
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{showDeleteConfirm && (
				<ConfirmPopup
					open={showDeleteConfirm}
					title="Подтверждение удаления"
					message={`Вы уверены, что хотите удалить комплект ТО "${formData.title}"? Это действие нельзя отменить.`}
					onConfirm={handleDelete}
					onCancel={() => setShowDeleteConfirm(false)}
					confirmText="Удалить"
					cancelText="Отмена"
				/>
			)}

			{canEdit && hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={isSaving} saveText="Сохранить" />}
		</div>
	);
}
