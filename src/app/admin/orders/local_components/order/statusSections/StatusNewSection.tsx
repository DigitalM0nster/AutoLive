import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import SearchDropdownInput from "@/components/ui/searchDropdownInput/SearchDropdownInput";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import { Order, OrderFormState, OrderItemClient, ProductListItem } from "@/lib/types";

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
	/** Позиции заказа (у менеджера только в статусе «Новый») */
	canEditOrderItems: boolean;
	/** Связанная запись и адрес доставки: доступны также на «Подтверждён» у менеджера */
	canEditLinkedAndDelivery: boolean;
	statusDate?: string | null;
	selectedBooking: NonNullable<Order["booking"]> | null;
	setSelectedBooking: React.Dispatch<React.SetStateAction<NonNullable<Order["booking"]> | null>>;
	selectedBookingDepartment: { id: number; name: string | null; address: string; phones: string[]; email: string | null } | null;
	setSelectedBookingDepartment: React.Dispatch<
		React.SetStateAction<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>
	>;
	bookingDepartments: { id: number; name: string | null; address: string; phones: string[]; email: string | null }[];
	pickupPoints: { id: number; name: string | null; address: string; phones: string[]; email: string | null }[];
	selectedPickupPoint: { id: number; name: string | null; address: string; phones: string[]; email: string | null } | null;
	setSelectedPickupPoint: React.Dispatch<
		React.SetStateAction<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>
	>;
};

export default function StatusNewSection({
	isActive,
	formData,
	setFormData,
	orderItems,
	setOrderItems,
	orderTotal,
	fieldErrors,
	clearFieldError,
	canEdit,
	canEditOrderItems,
	canEditLinkedAndDelivery,
	statusDate,
	selectedBooking,
	setSelectedBooking,
	selectedBookingDepartment,
	setSelectedBookingDepartment,
	bookingDepartments,
	pickupPoints,
	selectedPickupPoint,
	setSelectedPickupPoint,
}: StatusNewSectionProps) {
	const [productSearch, setProductSearch] = useState("");
	const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isSearchFocused, setIsSearchFocused] = useState(false);
	const [showProductSearch, setShowProductSearch] = useState(false);
	const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
	const blurTimeout = useRef<NodeJS.Timeout | null>(null);

	const bookingBlurTimeout = useRef<NodeJS.Timeout | null>(null);
	const [isBookingSearchFocused, setIsBookingSearchFocused] = useState(false);
	const [bookingSearch, setBookingSearch] = useState("");
	const [bookingSearchResults, setBookingSearchResults] = useState<NonNullable<Order["booking"]>[]>([]);
	const [isSearchingBookings, setIsSearchingBookings] = useState(false);

	useEffect(() => {
		return () => {
			if (blurTimeout.current) {
				clearTimeout(blurTimeout.current);
			}
			if (bookingBlurTimeout.current) {
				clearTimeout(bookingBlurTimeout.current);
			}
		};
	}, []);

	// Ошибка «Состав заказа»: поле поиска скрыто в свёрнутой зоне — раскрываем, чтобы была видна красная подсветка
	useEffect(() => {
		if (fieldErrors.has("productSearch")) {
			setShowProductSearch(true);
		}
	}, [fieldErrors]);

	const handleProductSearch = async (query: string) => {
		const trimmedQuery = query.trim();
		if (trimmedQuery.length < 1) {
			setSearchResults([]);
			return;
		}

		try {
			setIsSearching(true);
			const response = await fetch(`/api/products?search=${encodeURIComponent(trimmedQuery)}&limit=20`, {
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
		if (!canEditOrderItems) {
			return;
		}

		const department = product.department;

		if (!department || !department.id) {
			showErrorToast(`Товар "${product.title}" (${product.sku}) не привязан к отделу. Добавление невозможно.`);
			return;
		}

		let addedNewItem = false;
		setOrderItems((prev) => {
			const existingItem = prev.find((item) => item.product_sku === product.sku);

			if (existingItem) {
				return prev.map((item) => (item.product_sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item));
			}
			addedNewItem = true;

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

		if (addedNewItem) {
			setCollapsedItems((prev) => {
				const newSet = new Set(prev);
				newSet.add(product.sku);
				return newSet;
			});
		}

		clearFieldError("productSearch");
		setProductSearch("");
		setSearchResults([]);
		setIsSearchFocused(false);
		setShowProductSearch(false);
		if (blurTimeout.current) {
			clearTimeout(blurTimeout.current);
		}
	};

	const handleRemoveProduct = (sku: string) => {
		if (!canEditOrderItems) {
			return;
		}

		setOrderItems((prev) => prev.filter((item) => item.product_sku !== sku));
	};

	const handleQuantityChange = (sku: string, quantity: number) => {
		if (!canEditOrderItems) {
			return;
		}

		if (quantity <= 0) {
			handleRemoveProduct(sku);
			return;
		}

		setOrderItems((prev) => prev.map((item) => (item.product_sku === sku ? { ...item, quantity } : item)));
	};

	const handleProductFieldChange = (productSku: string, field: keyof OrderItemClient, value: string) => {
		if (!canEditOrderItems) {
			return;
		}

		setOrderItems((prev) => prev.map((item) => (item.product_sku === productSku ? { ...item, [field]: value } : item)));
	};

	// Функция для переключения видимости товара (скрыть/показать)
	const toggleItemVisibility = (sku: string, e?: React.MouseEvent) => {
		// Если событие передано, предотвращаем переключение, если кликнули на ссылку или кнопку (кроме кнопки expandButton)
		if (e) {
			const target = e.target as HTMLElement;
			// Если кликнули на кнопку expandButton, разрешаем переключение
			if (target.closest(".expandButton")) {
				// Разрешаем переключение для кнопки раскрытия
			} else if (target.tagName === "A" || (target.tagName === "BUTTON" && !target.closest(".expandButton")) || target.closest("a")) {
				return;
			}
		}

		setCollapsedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(sku)) {
				newSet.delete(sku);
			} else {
				newSet.add(sku);
			}
			return newSet;
		});
	};

	const handleBlur = () => {
		if (blurTimeout.current) {
			clearTimeout(blurTimeout.current);
		}
		blurTimeout.current = setTimeout(() => setIsSearchFocused(false), 120);
	};

	const handleBookingSearch = async (query: string) => {
		const bookingId = parseInt(query, 10);
		if (Number.isNaN(bookingId)) {
			setBookingSearchResults([]);
			return;
		}

		try {
			setIsSearchingBookings(true);
			const response = await fetch(`/api/bookings?idSearch=${bookingId}&limit=10`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				if (data.bookings && data.bookings.length > 0) {
					setBookingSearchResults(
						data.bookings.map((b: Record<string, unknown>) => ({
							id: b.id,
							scheduledDate: b.scheduledDate,
							scheduledTime: b.scheduledTime,
							status: b.status,
							contactPhone: b.contactPhone,
							client: b.client ?? null,
							manager: b.manager ?? null,
							bookingDepartment: b.bookingDepartment ?? null,
						})) as NonNullable<Order["booking"]>[],
					);
				} else {
					setBookingSearchResults([]);
				}
			}
		} catch (error) {
			console.error("Ошибка поиска записей:", error);
		} finally {
			setIsSearchingBookings(false);
		}
	};

	const handleBookingSelect = (booking: NonNullable<Order["booking"]>) => {
		if (!canEditLinkedAndDelivery) {
			return;
		}

		setSelectedBooking(booking);
		setBookingSearch("");
		setBookingSearchResults([]);
		setIsBookingSearchFocused(false);
	};

	const handleBookingBlur = () => {
		if (bookingBlurTimeout.current) clearTimeout(bookingBlurTimeout.current);
		bookingBlurTimeout.current = setTimeout(() => setIsBookingSearchFocused(false), 120);
	};

	const handleBookingManualInput = (value: string) => {
		if (!canEditLinkedAndDelivery) {
			return;
		}

		setBookingSearch(value);
		if (value.trim() !== "") {
			void handleBookingSearch(value);
		} else {
			setBookingSearchResults([]);
		}
		clearFieldError("bookingSearch");
	};

	const handleDeliveryAddressSelect = (raw: string) => {
		if (!canEditLinkedAndDelivery) {
			return;
		}

		if (!raw) {
			setSelectedBookingDepartment(null);
			setSelectedPickupPoint(null);
			clearFieldError("bookingDepartmentId");
			return;
		}

		if (raw.startsWith("bd-")) {
			const id = parseInt(raw.slice(3), 10);
			const department = bookingDepartments.find((d) => d.id === id);
			setSelectedPickupPoint(null);
			setSelectedBookingDepartment(department ?? null);
			clearFieldError("bookingDepartmentId");
			return;
		}

		if (raw.startsWith("pp-")) {
			const id = parseInt(raw.slice(3), 10);
			const point = pickupPoints.find((p) => p.id === id);
			setSelectedBookingDepartment(null);
			setSelectedPickupPoint(point ?? null);
			clearFieldError("bookingDepartmentId");
		}
	};

	const deliverySelectValue = selectedPickupPoint
		? `pp-${selectedPickupPoint.id}`
		: selectedBookingDepartment
			? `bd-${selectedBookingDepartment.id}`
			: "";

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

	useEffect(() => {
		setIsExpanded(isActive);
	}, [isActive]);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	const formatDate = (value?: string | Date | null) => {
		if (!value) return "";
		const date = new Date(value);
		if (isNaN(date.getTime())) return "";
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} ${hours}:${minutes}`;
	};

	return (
		<div className={`statusBlock borderBlock ${isExpanded ? "active" : ""}`}>
			<div className={`statusHeader statusToneCreated`} onClick={toggleExpand}>
				<h3>1. Новый</h3>
				{statusDate && <span className={`statusDate`}>Присвоен: {formatDate(statusDate)}</span>}
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

				<div className="formRow" id="orderLinkedBookingForm">
					<div className={`formField`}>
						<label htmlFor="linkedBookingSearchNew">Связанная запись</label>
						<div className={`selectedClient`}>
							<span>
								{selectedBooking ? (
									<Link href={`/admin/bookings/${selectedBooking.id}`} className="itemLink" target="_blank">
										Запись #{selectedBooking.id} —{" "}
										{typeof selectedBooking.scheduledDate === "string"
											? new Date(selectedBooking.scheduledDate).toLocaleDateString("ru-RU")
											: selectedBooking.scheduledDate.toLocaleDateString("ru-RU")}{" "}
										{selectedBooking.scheduledTime}
									</Link>
								) : (
									"Не указана"
								)}
							</span>
							{selectedBooking && canEditLinkedAndDelivery && (
								<button
									type="button"
									onClick={() => {
										setSelectedBooking(null);
										setBookingSearch("");
										clearFieldError("bookingSearch");
									}}
									className={`removeButton`}
								>
									Сбросить ×
								</button>
							)}
						</div>
						{!selectedBooking && (
							<SearchDropdownInput
								id="linkedBookingSearchNew"
								value={bookingSearch}
								onChange={handleBookingManualInput}
								onFocus={() => {
									if (bookingBlurTimeout.current) clearTimeout(bookingBlurTimeout.current);
									setIsBookingSearchFocused(true);
									clearFieldError("bookingSearch");
								}}
								onBlur={handleBookingBlur}
								placeholder="Поиск записи по числовому ID"
								hasError={fieldErrors.has("bookingSearch")}
								isActiveSearch={isBookingSearchFocused && bookingSearch.length > 0}
								showDropdown={isBookingSearchFocused && Boolean(bookingSearch)}
								disabled={!canEditLinkedAndDelivery}
							>
								{isBookingSearchFocused && isSearchingBookings && bookingSearch && (
									<div className="searchResults loading">
										<Loading />
									</div>
								)}

								{isBookingSearchFocused && bookingSearch && !isSearchingBookings && (
									<div className="searchResults">
										{bookingSearchResults.length > 0 ? (
											bookingSearchResults.map((booking) => (
												<div key={booking.id} className={`searchResultItem`} onMouseDown={() => handleBookingSelect(booking)}>
													Запись #{booking.id} —{" "}
													{typeof booking.scheduledDate === "string"
														? new Date(booking.scheduledDate).toLocaleDateString("ru-RU")
														: booking.scheduledDate.toLocaleDateString("ru-RU")}{" "}
													{booking.scheduledTime}
												</div>
											))
										) : (
											<div className={`searchResultItem`}>Нет результатов</div>
										)}
									</div>
								)}
							</SearchDropdownInput>
						)}
					</div>
				</div>

				<div className="formRow">
					<div className={`formField`}>
						<label htmlFor="deliveryAddressSelectNew">Адрес доставки</label>
						<div className={`selectedClient`}>
							<span>
								{selectedPickupPoint ? (
									<>
										Пункт выдачи: {selectedPickupPoint.name || "Без названия"} — {selectedPickupPoint.address}
									</>
								) : selectedBookingDepartment ? (
									<>
										Адрес для записей: {selectedBookingDepartment.name || "Адрес"} — {selectedBookingDepartment.address}
									</>
								) : (
									"Не указан"
								)}
							</span>
						</div>
						<select
							id="deliveryAddressSelectNew"
							name="deliveryAddressNew"
							value={deliverySelectValue}
							onChange={(e) => handleDeliveryAddressSelect(e.target.value)}
							onFocus={() => clearFieldError("bookingDepartmentId")}
							className={fieldErrors.has("bookingDepartmentId") ? "error" : ""}
							disabled={!canEditLinkedAndDelivery}
						>
							<option value="">— Не выбран —</option>
							{bookingDepartments.length > 0 && (
								<optgroup label="Адреса для записей">
									{bookingDepartments.map((dept) => (
										<option key={`bd-${dept.id}`} value={`bd-${dept.id}`}>
											{dept.name || "Адрес"} — {dept.address}
										</option>
									))}
								</optgroup>
							)}
							{pickupPoints.length > 0 && (
								<optgroup label="Пункты выдачи">
									{pickupPoints.map((pt) => (
										<option key={`pp-${pt.id}`} value={`pp-${pt.id}`}>
											{pt.name || "Пункт"} — {pt.address}
										</option>
									))}
								</optgroup>
							)}
						</select>
					</div>
				</div>

				{/* Список товаров только для активного шага «Новый» — иначе дублируется блок «Подтверждён» */}
				{isActive && (
				<div className={`formField`}>
					<div>Товары в заказе ({orderItems.length})</div>
					<div className="productItemsList">
						{orderItems.map((item, index) => {
							const isExpanded = collapsedItems.has(item.product_sku);
							const skuKey = `supplierDeliveryDate_${item.product_sku}`;
							const lineReadonly = !canEditOrderItems;
							return (
								<div key={index} className={`productItem borderBlock${isExpanded ? " active" : ""}`}>
									<div
										className={`productItemMain${lineReadonly ? " productItemReadonlySegment" : ""}`}
										onClick={(e) => toggleItemVisibility(item.product_sku, e)}
									>
										<span className="productItemIndex">№{index + 1}</span>
										<div className="productItemImageWrap">
											{item.product_image ? (
												<img src={item.product_image} alt={item.product_title} className="productItemImage" loading="lazy" />
											) : (
												<div className="productItemNoImage">Нет фото</div>
											)}
										</div>
										<div className="productItemDetails">
											<div className="productItemTitleText productItemTitleRow">
												{item.productId ? (
													<Link href={`/admin/product-management/products/${item.productId}`} className="itemLink" target="_blank">
														{item.product_title}
													</Link>
												) : (
													item.product_title
												)}
												<span className="productItemQtyBadge" title={`Количество: ${item.quantity}`}>
													x{item.quantity}
												</span>
												<span className="productItemTotalBadge" title="Общая стоимость позиции">
													{(item.product_price * item.quantity).toLocaleString("ru-RU")} ₽
												</span>
											</div>
											<div className="productItemMeta">
												<div className="productItemMetaLine">
													<span className="productItemMetaRow">
														<span className="productItemLabel">Артикул:</span> {item.product_sku}
													</span>
													{item.product_brand && (
														<span className="productItemMetaRow">
															<span className="productItemLabel">Бренд:</span> {item.product_brand}
														</span>
													)}
													<span className="productItemMetaRow">
														<span className="productItemLabel">Цена за 1шт:</span> {item.product_price.toLocaleString("ru-RU")} ₽
													</span>
												</div>
												<div className="productItemMetaLine">
													<span className="productItemMetaRow">
														<span className="productItemLabel">Отдел:</span> {item.department?.name || "Не указана"}
													</span>
													<span className="productItemMetaRow">
														<span className="productItemLabel">Модель авто:</span> {item.carModel?.trim() ? item.carModel : "Не указана"}
													</span>
												</div>
											</div>
										</div>
										<div className="buttonsBlock">
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleRemoveProduct(item.product_sku);
												}}
												className="removeProductButton"
												disabled={!canEditOrderItems}
											>
												Удалить товар из заказа ×
											</button>
										</div>
									</div>
									<div
										className={`formField${lineReadonly ? " productItemReadonlySegment" : ""}`}
										onClick={(e) => e.stopPropagation()}
										onKeyDown={(e) => e.stopPropagation()}
										role="presentation"
									>
										<DatePickerField
											label="Дата поставки поставщиком"
											value={item.supplierDeliveryDate || ""}
											onChange={(date) => {
												handleProductFieldChange(item.product_sku, "supplierDeliveryDate", date || "");
												clearFieldError("supplierDeliveryDate");
												clearFieldError(skuKey);
											}}
											onFocus={() => {
												clearFieldError("supplierDeliveryDate");
												clearFieldError(skuKey);
											}}
											placeholder="Необязательно"
											className={
												fieldErrors.has("supplierDeliveryDate") || fieldErrors.has(skuKey) ? `${datePickerFieldStyles.error}` : ""
											}
											disabled={!canEditOrderItems}
										/>
									</div>
									<div className="analogsBlock productItemAnalogs">
										<div
											className="analogsHeader"
											onClick={(e) => toggleItemVisibility(item.product_sku, e)}
											role="button"
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													toggleItemVisibility(item.product_sku);
												}
											}}
										>
											<div className="analogsTitleGroup">
												<span className="productItemInfoTitle">Подробная информация</span>
											</div>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													toggleItemVisibility(item.product_sku);
												}}
												className={`expandButton ${isExpanded ? "active" : ""}`}
											>
												{isExpanded ? "Свернуть" : "Развернуть"}
											</button>
										</div>
										<div className={`itemInfoBlock${lineReadonly ? " productItemReadonlySegment" : ""}`}>
										<div className="formField formFieldGroup">
											<div className="formField">
												<div className="formFieldTitle">Данные о товаре</div>
												<div className="formFieldInfo">
													<div className="itemInfoFields">
														<div className="infoField">
															<span className="infoLabel">Артикул:</span>
															<div className="text">{item.product_sku}</div>
														</div>
														<div className="infoField">
															<span className="infoLabel">Бренд:</span>
															<div className="text">{item.product_brand}</div>
														</div>
														<div className="infoField">
															<span className="infoLabel">Отдел:</span>
															<div className="text">
																<Link href={`/admin/departments/${item.department.id}`} className="itemLink" target="_blank">
																	{item.department.name}
																</Link>
															</div>
														</div>
													</div>
												</div>
											</div>
											<div className="formField">
												<input
													type="text"
													value={item.carModel || ""}
													onChange={(e) => {
														handleProductFieldChange(item.product_sku, "carModel", e.target.value);
														clearFieldError(`carModel_${item.product_sku}`);
													}}
													onFocus={() => clearFieldError(`carModel_${item.product_sku}`)}
													placeholder="Модель автомобиля"
													className={`textInput${fieldErrors.has(`carModel_${item.product_sku}`) ? " error" : ""}`}
													disabled={!canEditOrderItems}
												/>
												<input
													type="text"
													value={item.vinCode || ""}
													onChange={(e) => {
														handleProductFieldChange(item.product_sku, "vinCode", e.target.value);
														clearFieldError(`vinCode_${item.product_sku}`);
													}}
													onFocus={() => clearFieldError(`vinCode_${item.product_sku}`)}
													placeholder="VIN-код"
													className={`textInput${fieldErrors.has(`vinCode_${item.product_sku}`) ? " error" : ""}`}
													disabled={!canEditOrderItems}
												/>
											</div>
										</div>

										<div className="formField formFieldGroup">
											<div className="formField">
												<div className="formFieldTitle">Количество</div>
												<div className="quantityControls">
													<button
														type="button"
														onClick={() => handleQuantityChange(item.product_sku, item.quantity - 1)}
														className="quantityButton"
														disabled={!canEditOrderItems}
													>
														-
													</button>
													<input
														type="number"
														value={item.quantity}
														onChange={(e) => handleQuantityChange(item.product_sku, parseInt(e.target.value) || 0)}
														min="1"
														className="quantityInput"
														disabled={!canEditOrderItems}
													/>
													<button
														type="button"
														onClick={() => handleQuantityChange(item.product_sku, item.quantity + 1)}
														className="quantityButton"
														disabled={!canEditOrderItems}
													>
														+
													</button>
												</div>
											</div>

											<div className="formField">
												<label>Цена за ед.</label>
												<input type="text" value={`${item.product_price} ₽`} disabled className="priceInput" />
											</div>
										</div>
										<div className="formField">
											<label>Сумма</label>
											<input type="text" value={`${(item.product_price * item.quantity).toLocaleString()} ₽`} disabled className="totalInput" />
										</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
					<div className="orderTotal">
						<div className="totalRow">
							<span className="totalLabel">Общая сумма заказа:</span>
							<span className="totalAmount">{orderTotal.toLocaleString()} ₽</span>
						</div>
					</div>
					{canEditOrderItems && (
						<div
							className={`addProductZone ${showProductSearch ? "addProductZoneOpen" : ""}${
								fieldErrors.has("productSearch") ? " addProductZoneValidationError" : ""
							}`}
							onClick={() => !showProductSearch && setShowProductSearch(true)}
						>
							{!showProductSearch ? (
								<div className="addProductZonePlaceholder">
									<span className="addProductZonePlus">+</span>
									<span className="addProductZoneText">Добавить товар</span>
								</div>
							) : (
								<div className="addProductZoneSearch" onClick={(e) => e.stopPropagation()}>
									<div className="addProductZoneSearchHeader">
										<span className="addProductZoneSearchTitle">Поиск товара</span>
										<button
											type="button"
											onClick={() => {
												setShowProductSearch(false);
												setProductSearch("");
												setSearchResults([]);
												setIsSearchFocused(false);
												if (blurTimeout.current) {
													clearTimeout(blurTimeout.current);
												}
											}}
											className="addProductZoneClose"
										>
											×
										</button>
									</div>
									<SearchDropdownInput
										id="productSearch"
										value={productSearch}
										onChange={(value) => {
											setProductSearch(value);
											handleProductSearch(value);
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
										inputClassName="searchInput"
										hasError={fieldErrors.has("productSearch")}
										isActiveSearch={(isSearchFocused && productSearch.trim().length >= 1) || isSearching}
										showDropdown={isSearchFocused && Boolean(productSearch)}
										disabled={!canEditOrderItems}
										autoFocus
									>
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
															return null;
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
									</SearchDropdownInput>
								</div>
							)}
						</div>
					)}
				</div>
				)}
			</div>
		</div>
	);
}
