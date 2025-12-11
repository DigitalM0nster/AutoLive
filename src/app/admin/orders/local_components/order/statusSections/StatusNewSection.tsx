import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import { OrderFormState, OrderItemClient, ProductListItem } from "@/lib/types";

type StatusNewSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	orderItems: OrderItemClient[];
	setOrderItems: React.Dispatch<React.SetStateAction<OrderItemClient[]>>;
	orderTotal: number;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	canEdit: boolean;
};

export default function StatusNewSection({ isActive, formData, setFormData, orderItems, setOrderItems, orderTotal, fieldErrors, clearFieldError, canEdit }: StatusNewSectionProps) {
	const [productSearch, setProductSearch] = useState("");
	const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const blurTimeout = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		return () => {
			if (blurTimeout.current) {
				clearTimeout(blurTimeout.current);
			}
		};
	}, []);

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

	const handleProductSelect = (product: ProductListItem) => {
		if (!canEdit) {
			return;
		}

		const department = product.department;

		if (!department || !department.id) {
			showErrorToast(`Товар "${product.title}" (${product.sku}) не привязан к отделу. Добавление невозможно.`);
			return;
		}

		setOrderItems((prev) => {
			const existingItem = prev.find((item) => item.product_sku === product.sku);

			if (existingItem) {
				return prev.map((item) => (item.product_sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item));
			}

			return [
				...prev,
				{
					product_sku: product.sku,
					product_title: product.title,
					product_price: product.price,
					product_brand: product.brand,
					product_image: product.image,
					quantity: 1,
					supplierDeliveryDate: "",
					carModel: "",
					vinCode: "",
					department: {
						id: department.id,
						name: department.name,
					},
					productId: product.id,
				},
			];
		});

		setProductSearch("");
		setSearchResults([]);
		setIsSearchFocused(false);
		if (blurTimeout.current) {
			clearTimeout(blurTimeout.current);
		}
	};

	const handleRemoveProduct = (sku: string) => {
		if (!canEdit) {
			return;
		}

		setOrderItems((prev) => prev.filter((item) => item.product_sku !== sku));
	};

	const handleQuantityChange = (sku: string, quantity: number) => {
		if (!canEdit) {
			return;
		}

		if (quantity <= 0) {
			handleRemoveProduct(sku);
			return;
		}

		setOrderItems((prev) => prev.map((item) => (item.product_sku === sku ? { ...item, quantity } : item)));
	};

	const handleProductFieldChange = (productSku: string, field: keyof OrderItemClient, value: string) => {
		if (!canEdit) {
			return;
		}

		setOrderItems((prev) => prev.map((item) => (item.product_sku === productSku ? { ...item, [field]: value } : item)));
	};

	const handleBlur = () => {
		if (blurTimeout.current) {
			clearTimeout(blurTimeout.current);
		}
		blurTimeout.current = setTimeout(() => setIsSearchFocused(false), 120);
	};

	const formatPhoneNumber = (value: string): string => {
		const phoneNumber = value.replace(/\D/g, "");

		let formattedNumber = phoneNumber;
		if (formattedNumber.startsWith("8")) {
			formattedNumber = "7" + formattedNumber.slice(1);
		}

		if (!formattedNumber.startsWith("7") && formattedNumber.length > 0) {
			formattedNumber = "7" + formattedNumber;
		}

		if (formattedNumber.length === 0) return "";
		if (formattedNumber.length <= 1) return `+7`;
		if (formattedNumber.length <= 4) return `+7(${formattedNumber.slice(1)}`;
		if (formattedNumber.length <= 7) return `+7(${formattedNumber.slice(1, 4)})${formattedNumber.slice(4)}`;
		if (formattedNumber.length <= 9) return `+7(${formattedNumber.slice(1, 4)})${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7)}`;

		return `+7(${formattedNumber.slice(1, 4)})${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7, 9)}-${formattedNumber.slice(9, 11)}`;
	};

	const [isExpanded, setIsExpanded] = useState(isActive);

	// Синхронизируем состояние развернутости с активным статусом
	useEffect(() => {
		setIsExpanded(isActive);
	}, [isActive]);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div className={`statusBlock borderBlock ${isExpanded ? "active" : ""}`}>
			<div className={`statusHeader`} onClick={toggleExpand}>
				<h3>1. Новый</h3>
			</div>
			<div className={`statusFields`}>
				<>
					<div className={`formField`}>
						<label htmlFor="contactName">Имя клиента</label>
						<input
							id="contactName"
							type="text"
							value={formData.contactName}
							onChange={(e) => {
								setFormData((prev) => ({ ...prev, contactName: e.target.value }));
								clearFieldError("contactName");
							}}
							onFocus={() => clearFieldError("contactName")}
							placeholder="Иван"
							className={fieldErrors.has("contactName") ? "error" : ""}
							disabled={!canEdit}
						/>
					</div>
					<div className={`formField`}>
						<label htmlFor="contactPhone">Контактный телефон</label>
						<input
							id="contactPhone"
							type="tel"
							value={formData.contactPhone}
							onChange={(e) => {
								const formatted = formatPhoneNumber(e.target.value);
								setFormData((prev) => ({ ...prev, contactPhone: formatted }));
								clearFieldError("contactPhone");
							}}
							onFocus={() => clearFieldError("contactPhone")}
							placeholder="+7(995)123-45-67"
							className={fieldErrors.has("contactPhone") ? "error" : ""}
							disabled={!canEdit}
						/>
					</div>
				</>

				{/* Список товаров в заказе */}
				<div className={`formField`}>
					<div>Товары в заказе ({orderItems.length})</div>
					<div className={`searchContainer`}>
						<input
							id="productSearch"
							type="text"
							value={productSearch}
							onChange={(e) => {
								setProductSearch(e.target.value);
								handleProductSearch(e.target.value);
								clearFieldError("productSearch");
							}}
							onFocus={() => {
								setIsSearchFocused(true);
								if (blurTimeout.current) {
									clearTimeout(blurTimeout.current);
								}
								clearFieldError("productSearch");
							}}
							onBlur={handleBlur}
							placeholder="Поиск товаров по названию, артикулу или бренду"
							className={`${fieldErrors.has("productSearch") ? "error" : ""} ${(isSearchFocused && productSearch.length >= 2) || isSearching ? "activeSearch" : ""}`}
							disabled={!canEdit}
						/>
						{isSearchFocused && isSearching && productSearch && (
							<div className="searchResults loading">
								<Loading />
							</div>
						)}

						{isSearchFocused && !isSearching && productSearch && (
							<div className="searchResults">
								{searchResults.length > 0 ? (
									searchResults.map((product) => {
										if (!product.department) {
											return null; // Товар без отдела пропускаем, такого быть не должно, но на всякий случай защищаемся.
										}

										return (
											<div key={product.id} className={`searchResultItem`} onMouseDown={() => handleProductSelect(product)}>
												<div className="productInfo">
													<span className="productTitle">{product.title}</span>
													<span className="additionalInfoBorderBlock">Артикул: {product.sku}</span>
													<span className="additionalInfoBorderBlock">Бренд: {product.brand}</span>
													<span className="additionalInfoBorderBlock">
														Закупочная стоимость: {product.supplierPrice ? `${product.supplierPrice.toLocaleString()} ₽` : "—"}
													</span>
													<span className="additionalInfoBorderBlock">Стоимость для клиента: {product.price.toLocaleString()} ₽</span>
													<span className="additionalInfoBorderBlock">Отдел: {product.department.name}</span>
												</div>
											</div>
										);
									})
								) : (
									<div className={`searchResultItem`}>Нет результатов</div>
								)}
							</div>
						)}
					</div>
					<div className={`orderItemsList${canEdit ? "" : " readonly"}`}>
						{orderItems.map((item, index) => (
							<div key={index} className={`orderItem borderBlock${canEdit ? "" : " readonly"}`}>
								<div className="itemHeader">
									<div className="itemInfo">
										<span className="itemTitle">
											{item.productId ? (
												<Link href={`/admin/product-management/products/${item.productId}`} className="itemLink" target="_blank">
													{item.product_title}
												</Link>
											) : (
												item.product_title
											)}
										</span>
										<span className="itemSku">Артикул: {item.product_sku}</span>
										<span className="itemBrand">Бренд: {item.product_brand}</span>
										<span className="itemDepartment">
											<Link href={`/admin/departments/${item.department.id}`} className="itemLink" target="_blank">
												{item.department.name}
											</Link>
										</span>
									</div>
								</div>

								<div className="itemFields">
									<div className="formRow">
										<div className="formField">
											<label>Название автомобиля</label>
											<input
												type="text"
												value={item.carModel || ""}
												onChange={(e) => handleProductFieldChange(item.product_sku, "carModel", e.target.value)}
												placeholder="Модель автомобиля"
												className="textInput"
												disabled={!canEdit}
											/>
										</div>
									</div>
									<div className="formRow">
										<div className="formField">
											<label>VIN-код автомобиля</label>
											<input
												type="text"
												value={item.vinCode || ""}
												onChange={(e) => handleProductFieldChange(item.product_sku, "vinCode", e.target.value)}
												placeholder="VIN-код"
												className="textInput"
												disabled={!canEdit}
											/>
										</div>
									</div>

									<div className="formRow">
										<div className="formField">
											<label>Количество</label>
											<div className="quantityControls">
												<button
													type="button"
													onClick={() => handleQuantityChange(item.product_sku, item.quantity - 1)}
													className="quantityButton"
													disabled={!canEdit}
												>
													-
												</button>
												<input
													type="number"
													value={item.quantity}
													onChange={(e) => handleQuantityChange(item.product_sku, parseInt(e.target.value) || 0)}
													min="1"
													className="quantityInput"
													disabled={!canEdit}
												/>
												<button
													type="button"
													onClick={() => handleQuantityChange(item.product_sku, item.quantity + 1)}
													className="quantityButton"
													disabled={!canEdit}
												>
													+
												</button>
											</div>
										</div>
									</div>

									<div className="formRow">
										<div className="formField">
											<label>Цена за ед.</label>
											<input type="text" value={`${item.product_price} ₽`} disabled className="priceInput" />
										</div>
									</div>
									<div className="formRow">
										<div className="formField">
											<label>Сумма</label>
											<input type="text" value={`${(item.product_price * item.quantity).toLocaleString()} ₽`} disabled className="totalInput" />
										</div>
									</div>
								</div>

								<button type="button" onClick={() => handleRemoveProduct(item.product_sku)} className="removeButton" disabled={!canEdit}>
									Удалить товар из заказа ×
								</button>
							</div>
						))}
					</div>
				</div>
				<div className="formField">
					{/* Общая сумма заказа */}
					<div className="orderTotal">
						<div className="totalRow">
							<span className="totalLabel">Общая сумма заказа:</span>
							<span className="totalAmount">{orderTotal.toLocaleString()} ₽</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
