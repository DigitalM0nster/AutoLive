import React, { useEffect, useRef, useState } from "react";
import SearchDropdownInput from "@/components/ui/searchDropdownInput/SearchDropdownInput";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import { Order, OrderFormState, OrderItemClient, ProductListItem } from "@/lib/types";
import OrderStatusBlock, { OrderStatusFieldGroup } from "../OrderStatusBlock";
import { BookingSearchResultsPanel, BookingSelectedSummary } from "../BookingSearchDropdownItems";
import { OrderCompositionItem, OrderCompositionToolbar, orderCompositionStyles } from "../OrderCompositionItem";
import { ProductSearchResultsPanel } from "../ProductSearchDropdownItems";
import sectionStyles from "./StatusNewSection.module.scss";
import type { BookingSearchListRow } from "@/lib/bookingSearchForOrderDisplay";

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
	setSelectedBookingDepartment: React.Dispatch<React.SetStateAction<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>>;
	bookingDepartments: { id: number; name: string | null; address: string; phones: string[]; email: string | null }[];
	pickupPoints: { id: number; name: string | null; address: string; phones: string[]; email: string | null }[];
	selectedPickupPoint: { id: number; name: string | null; address: string; phones: string[]; email: string | null } | null;
	setSelectedPickupPoint: React.Dispatch<React.SetStateAction<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>>;
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
	const [bookingSearchResults, setBookingSearchResults] = useState<BookingSearchListRow[]>([]);
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
					setBookingSearchResults(data.bookings as BookingSearchListRow[]);
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

	const handleBookingSelect = (booking: BookingSearchListRow) => {
		if (!canEditLinkedAndDelivery) {
			return;
		}

		setSelectedBooking(booking as NonNullable<Order["booking"]>);
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

	const deliverySelectValue = selectedPickupPoint ? `pp-${selectedPickupPoint.id}` : selectedBookingDepartment ? `bd-${selectedBookingDepartment.id}` : "";

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

	return (
		<OrderStatusBlock step={1} title="Новый" tone="created" isActive={isActive} statusDate={statusDate}>
			<OrderStatusFieldGroup title="Контакт лида" hint="Кто обратился — до выбора профиля клиента в системе">
				<div className="formRow">
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
				</div>
			</OrderStatusFieldGroup>

			{/* Список товаров только для активного шага «Новый» — иначе дублируется блок «Подтверждён» */}
			{isActive && (
				<OrderStatusFieldGroup title="Состав заказа" hint="Что входит в заказ на этапе нового лида">
					<div className={sectionStyles.fieldBody}>
						<OrderCompositionToolbar count={orderItems.length} total={orderTotal} />
						<div className={orderCompositionStyles.list}>
							{orderItems.map((item, index) => {
								const isExpanded = collapsedItems.has(item.product_sku);
								const skuKey = `supplierDeliveryDate_${item.product_sku}`;
								return (
									<OrderCompositionItem
										key={`${item.product_sku}-${index}`}
										item={item}
										index={index}
										isExpanded={isExpanded}
										canEditOrderItems={canEditOrderItems}
										canEditSupplierDates={canEditOrderItems}
										fieldErrors={fieldErrors}
										skuKey={skuKey}
										onToggleExpand={toggleItemVisibility}
										onRemove={handleRemoveProduct}
										onProductFieldChange={handleProductFieldChange}
										onQuantityChange={handleQuantityChange}
										clearFieldError={clearFieldError}
									/>
								);
							})}
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
											{isSearchFocused && productSearch ? (
												<ProductSearchResultsPanel
													loading={isSearching}
													results={searchResults.filter((p) => Boolean(p.department))}
													onSelect={(product) => handleProductSelect(product as ProductListItem)}
												/>
											) : null}
										</SearchDropdownInput>
									</div>
								)}
							</div>
						)}
					</div>
				</OrderStatusFieldGroup>
			)}

			<OrderStatusFieldGroup title="Адрес получения" hint="Куда клиент заберёт или получит товары — не связано с записью на сервис">
				<div className={sectionStyles.fieldBody}>
					<label htmlFor="deliveryAddressSelectNew">Пункт выдачи или адрес отдела</label>
					<select
						id="deliveryAddressSelectNew"
						name="deliveryAddressNew"
						value={deliverySelectValue}
						onChange={(e) => handleDeliveryAddressSelect(e.target.value)}
						onFocus={() => clearFieldError("bookingDepartmentId")}
						className={[sectionStyles.fieldControl, fieldErrors.has("bookingDepartmentId") ? sectionStyles.fieldControlError : ""]
							.filter(Boolean)
							.join(" ")}
						disabled={!canEditLinkedAndDelivery}
					>
						<option value="">— Не выбран —</option>
						{pickupPoints.length > 0 && (
							<optgroup label="Пункты выдачи">
								{pickupPoints.map((pt) => (
									<option key={`pp-${pt.id}`} value={`pp-${pt.id}`}>
										{pt.name || "Пункт"} — {pt.address}
									</option>
								))}
							</optgroup>
						)}
						{bookingDepartments.length > 0 && (
							<optgroup label="Адреса отделов">
								{bookingDepartments.map((dept) => (
									<option key={`bd-${dept.id}`} value={`bd-${dept.id}`}>
										{dept.name || "Адрес"} — {dept.address}
									</option>
								))}
							</optgroup>
						)}
					</select>
				</div>
			</OrderStatusFieldGroup>

			<OrderStatusFieldGroup title="Связанная запись" hint="Визит на сервис в CRM — привяжите по ID, если заказ оформляется по уже существующей записи" optional>
				<div className={sectionStyles.fieldBody} id="orderLinkedBookingForm">
					{selectedBooking ? (
						<div className={sectionStyles.bookingSelectedBlock}>
							<BookingSelectedSummary booking={selectedBooking as BookingSearchListRow} />
							{canEditLinkedAndDelivery ? (
								<button
									type="button"
									onClick={() => {
										setSelectedBooking(null);
										setBookingSearch("");
										clearFieldError("bookingSearch");
									}}
									className="removeButton"
								>
									Сбросить ×
								</button>
							) : null}
						</div>
					) : (
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
							placeholder="ID свободной записи без привязанного заказа"
							hasError={fieldErrors.has("bookingSearch")}
							isActiveSearch={isBookingSearchFocused && bookingSearch.length > 0}
							showDropdown={isBookingSearchFocused && Boolean(bookingSearch)}
							disabled={!canEditLinkedAndDelivery}
						>
							{isBookingSearchFocused && bookingSearch ? (
								<BookingSearchResultsPanel loading={isSearchingBookings} results={bookingSearchResults} onSelect={handleBookingSelect} />
							) : null}
						</SearchDropdownInput>
					)}
				</div>
			</OrderStatusFieldGroup>
		</OrderStatusBlock>
	);
}
