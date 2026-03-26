"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Order, User, ProductListItem, OrderStatus, OrderItemClient, OrderFormState, DepartmentForLog } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import SearchDropdownInput from "@/components/ui/searchDropdownInput/SearchDropdownInput";
import LinkedRelationCard from "@/components/admin/linkedRelationCard/LinkedRelationCard";
import StatusNewSection from "./statusSections/StatusNewSection";
import StatusConfirmedSection from "./statusSections/StatusConfirmedSection";
import StatusBookedSection from "./statusSections/StatusBookedSection";
import StatusReadySection from "./statusSections/StatusReadySection";
import StatusPaidSection from "./statusSections/StatusPaidSection";
import StatusCompletedSection from "./statusSections/StatusCompletedSection";
import StatusReturnedSection from "./statusSections/StatusReturnedSection";
type OrderPageProps = {
	orderId?: string | number; // Если не указан, значит создаем новый заказ
	isCreating?: boolean;
	userRole?: string; // Роль пользователя для определения режима отображения
};

function formatToRuDate(iso: string | null | undefined): string {
	if (!iso) return "—";
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
	if (m) return `${m[3]}.${m[2]}.${m[1]}`;
	return String(iso);
}

/** Статус записи (booking) для подписи в карточке заказа */
function bookingStatusLabelRu(status: string): string {
	const m: Record<string, string> = {
		scheduled: "Запланирована",
		confirmed: "Подтверждена",
		completed: "Выполнена",
		cancelled: "Отменена",
		no_show: "Не явился",
	};
	return m[status] || status;
}

/** Строка поиска записи для привязки к заказу (ответ /api/bookings/search-for-order) */
type BookingSearchForOrderRow = {
	id: number;
	scheduledDate: string | Date;
	scheduledTime: string;
	contactPhone: string;
	status: string;
	notes: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	client: { id: number; first_name: string | null; last_name: string | null; phone: string } | null;
	manager: { id: number; first_name: string | null; last_name: string | null; phone: string | null } | null;
	bookingDepartment: { id: number; name: string | null; address: string; phones: string[] } | null;
};

function bookingClientShortName(c: BookingSearchForOrderRow["client"]): string {
	if (!c) return "—";
	return [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "—";
}

function truncateText(text: string | null | undefined, max: number): string {
	if (!text) return "";
	const t = text.trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max)}…`;
}

/** Панель поиска записи для привязки к заказу (кнопка заменяется этим блоком в той же колонке) */
function BookingLinkSearchBlock(props: {
	hintText?: string;
	bookingSearchQuery: string;
	handleBookingSearchInput: (v: string) => void;
	bookingSearchFocused: boolean;
	setBookingSearchFocused: (v: boolean) => void;
	bookingSearchBlurTimeout: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
	handleBookingSearchBlur: () => void;
	bookingSearchLoading: boolean;
	bookingSearchResults: BookingSearchForOrderRow[];
	handleSelectBookingFromSearch: (row: BookingSearchForOrderRow) => void;
	selectedBookingForLink: BookingSearchForOrderRow | null;
	clearBookingLinkSelection: () => void;
	saveBookingLinkToOrder: () => void;
	cancelBookingLinkPanel: () => void;
	isBookingLinkSaving: boolean;
}) {
	const {
		hintText = "Введите ID записи — в списке только записи без привязанного заказа.",
		bookingSearchQuery,
		handleBookingSearchInput,
		bookingSearchFocused,
		setBookingSearchFocused,
		bookingSearchBlurTimeout,
		handleBookingSearchBlur,
		bookingSearchLoading,
		bookingSearchResults,
		handleSelectBookingFromSearch,
		selectedBookingForLink,
		clearBookingLinkSelection,
		saveBookingLinkToOrder,
		cancelBookingLinkPanel,
		isBookingLinkSaving,
	} = props;

	return (
		<div className="column bookingLinkInlineSearch">
			<p className="bookingLinkHint">{hintText}</p>
			<div className="toLinkOrderSearchWrap">
				{selectedBookingForLink ? (
					<div className="bookingLinkSelectedCard">
						<div className="bookingLinkSelectedTitle">
							<span>Запись #{selectedBookingForLink.id}</span>
							<span className="bookingLinkPickStatus">{bookingStatusLabelRu(String(selectedBookingForLink.status))}</span>
						</div>
						<div className="bookingLinkSelectedMeta">
							{formatToRuDate(
								typeof selectedBookingForLink.scheduledDate === "string"
									? selectedBookingForLink.scheduledDate
									: new Date(selectedBookingForLink.scheduledDate).toISOString(),
							)}{" "}
							· {selectedBookingForLink.scheduledTime}
						</div>
						<div className="bookingLinkSelectedMeta">
							{bookingClientShortName(selectedBookingForLink.client)}
							{selectedBookingForLink.client?.phone ? ` · ${selectedBookingForLink.client.phone}` : ""}
							{" · "}
							{selectedBookingForLink.contactPhone || "—"}
						</div>
						<div className="bookingLinkSelectedMeta">
							{selectedBookingForLink.bookingDepartment
								? [selectedBookingForLink.bookingDepartment.name, selectedBookingForLink.bookingDepartment.address].filter(Boolean).join(" — ")
								: "—"}
						</div>
						{selectedBookingForLink.notes ? (
							<div className="bookingLinkSelectedMeta">{truncateText(selectedBookingForLink.notes, 120)}</div>
						) : null}
						<button type="button" onClick={clearBookingLinkSelection} className="ghostButton">
							Другая запись
						</button>
					</div>
				) : (
					<div
						className={`searchInput ${
							bookingSearchFocused && bookingSearchQuery.trim() ? "searching" : ""
						}`}
					>
						<SearchDropdownInput
							value={bookingSearchQuery}
							onChange={handleBookingSearchInput}
							onFocus={() => {
								if (bookingSearchBlurTimeout.current) clearTimeout(bookingSearchBlurTimeout.current);
								setBookingSearchFocused(true);
							}}
							onBlur={handleBookingSearchBlur}
							placeholder="ID записи"
							inputClassName="searchInput"
							isActiveSearch={bookingSearchFocused && bookingSearchQuery.trim().length >= 1}
							showDropdown={bookingSearchFocused && Boolean(bookingSearchQuery.trim())}
						>
							{bookingSearchFocused && bookingSearchLoading && bookingSearchQuery.trim() && (
								<div className="searchResults bookingLinkDropdown loading">
									<Loading />
								</div>
							)}
							{bookingSearchFocused && bookingSearchQuery.trim() && !bookingSearchLoading && (
								<div className="searchResults bookingLinkDropdown">
									{bookingSearchResults.length > 0 ? (
										bookingSearchResults.map((row) => {
											const when = formatToRuDate(
												typeof row.scheduledDate === "string"
													? row.scheduledDate
													: new Date(row.scheduledDate).toISOString(),
											);
											const dept = row.bookingDepartment
												? [row.bookingDepartment.name, row.bookingDepartment.address].filter(Boolean).join(" — ")
												: "—";
											const clientLine = [bookingClientShortName(row.client), row.contactPhone].filter(Boolean).join(" · ");
											return (
												<div
													key={row.id}
													className="searchResultItem bookingLinkPick"
													onMouseDown={() => handleSelectBookingFromSearch(row)}
												>
													<div className="bookingLinkPickTop">
														<span className="bookingLinkPickId">#{row.id}</span>
														<span className="bookingLinkPickWhen">
															{when} · {row.scheduledTime}
														</span>
														<span className="bookingLinkPickStatus">{bookingStatusLabelRu(String(row.status))}</span>
													</div>
													<div className="bookingLinkPickRow">{clientLine || "—"}</div>
													<div className="bookingLinkPickRow">{dept}</div>
												</div>
											);
										})
									) : (
										<div className="bookingLinkPickEmpty">Нет свободных записей с таким номером</div>
									)}
								</div>
							)}
						</SearchDropdownInput>
					</div>
				)}
			</div>
			<div className="bookingLinkActions">
				<button
					type="button"
					onClick={saveBookingLinkToOrder}
					className="primaryButton"
					disabled={isBookingLinkSaving || !selectedBookingForLink}
				>
					{isBookingLinkSaving ? "Сохранение…" : "Сохранить связь"}
				</button>
				<button type="button" onClick={cancelBookingLinkPanel} className="secondaryButton" disabled={isBookingLinkSaving}>
					Отмена
				</button>
			</div>
		</div>
	);
}

export default function OrderComponent({ orderId, isCreating = false, userRole }: OrderPageProps) {
	const { user } = useAuthStore();
	const router = useRouter();
	const [orderData, setOrderData] = useState<Order | null>(null);
	const [loading, setLoading] = useState(!isCreating);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const initialSnapshotRef = useRef<string | null>(null);

	// Состояние для формы создания/редактирования заказа
	const [formData, setFormData] = useState<OrderFormState>({
		clientId: "",
		departmentId: "",
		managerId: "",
		// Поля для статусов
		contactName: "",
		contactPhone: "",
		finalDeliveryDate: "",
		bookedUntil: "",
		readyUntil: "",
		prepaymentAmount: "",
		prepaymentDate: "",
		paymentDate: "",
		orderAmount: "",
		completionDate: "",
		returnReason: "",
		returnDate: "",
		returnAmount: "",
		returnPaymentDate: "",
		returnDocumentNumber: "",
	});

	// Состояние для комментариев (массив)
	const [comments, setComments] = useState<string[]>([]);
	const [newComment, setNewComment] = useState("");
	const [currentStatus, setCurrentStatus] = useState<OrderStatus>("created");
	const [initialStatus, setInitialStatus] = useState<OrderStatus>("created");
	const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

	// Состояние для товаров в заказе
	const [orderItems, setOrderItems] = useState<OrderItemClient[]>([]);

	const [selectedClient, setSelectedClient] = useState<User | null>(null);

	// Состояние для отделов
	const [departments, setDepartments] = useState<DepartmentForLog[]>([]);

	const [selectedManager, setSelectedManager] = useState<User | null>(null);

	// Состояние для заявки и адреса
	const [selectedBooking, setSelectedBooking] = useState<NonNullable<Order["booking"]> | null>(null);
	const [selectedBookingDepartment, setSelectedBookingDepartment] = useState<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>(
		null,
	);
	const [bookingDepartments, setBookingDepartments] = useState<{ id: number; name: string | null; address: string; phones: string[]; email: string | null }[]>([]);
	const [pickupPoints, setPickupPoints] = useState<{ id: number; name: string | null; address: string; phones: string[]; email: string | null }[]>([]);
	const [selectedPickupPoint, setSelectedPickupPoint] = useState<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>(null);

	// Панель «Связать с ТО» (поиск записи по ID)
	const [bookingLinkPanelOpen, setBookingLinkPanelOpen] = useState(false);
	const [bookingSearchQuery, setBookingSearchQuery] = useState("");
	const [bookingSearchResults, setBookingSearchResults] = useState<BookingSearchForOrderRow[]>([]);
	const [bookingSearchLoading, setBookingSearchLoading] = useState(false);
	const [bookingSearchFocused, setBookingSearchFocused] = useState(false);
	const [selectedBookingForLink, setSelectedBookingForLink] = useState<BookingSearchForOrderRow | null>(null);
	const [isBookingLinkSaving, setIsBookingLinkSaving] = useState(false);
	const bookingSearchBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const bookingSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Состояние для дат присвоения статусов
	const [statusDates, setStatusDates] = useState<Record<OrderStatus, string | null>>({
		created: null,
		confirmed: null,
		booked: null,
		ready: null,
		paid: null,
		completed: null,
		returned: null,
	});
	const orderTotal = useMemo(() => orderItems.reduce((total, item) => total + item.product_price * item.quantity, 0), [orderItems]);

	/** Клиент заказа и клиент связанной записи (booking) — разные */
	const orderBookingClientMismatch = useMemo(() => {
		if (!orderData) return false;
		const orderClientId = selectedClient?.id ?? orderData.clientId ?? orderData.client?.id ?? null;
		const bk = selectedBooking ?? orderData.booking;
		const bookingClientId = bk?.client?.id ?? null;
		if (orderClientId == null || bookingClientId == null) return false;
		return orderClientId !== bookingClientId;
	}, [orderData, selectedClient, selectedBooking]);

	const isAdminOrSuperadmin = userRole === "superadmin" || userRole === "admin";
	const isManager = userRole === "manager";

	// Проверяем, является ли менеджер ответственным за заказ
	// Используем useMemo для пересчета при изменении зависимостей
	const isManagerResponsible = useMemo(() => {
		if (!isManager) return false;

		// При создании нового заказа менеджер может редактировать
		if (isCreating) return true;

		// Менеджер является выбранным ответственным
		if (selectedManager?.id === user?.id) return true;

		// Менеджер является ответственным в данных заказа
		if (orderData?.managerId === user?.id) return true;

		return false;
	}, [isManager, isCreating, selectedManager?.id, user?.id, orderData?.managerId]);

	// Проверяем, имеет ли пользователь доступ к просмотру заказа
	// Если заказ загружен (orderData существует), значит у пользователя есть доступ к нему
	// (API уже проверил права доступа при загрузке)
	// Админы и суперадмины имеют доступ всегда
	const hasAccessToOrder = useMemo(() => {
		if (isCreating) return true; // При создании всегда есть доступ
		if (isAdminOrSuperadmin) return true; // Админы и суперадмины всегда имеют доступ
		// Если заказ загружен, значит у пользователя есть доступ (API уже проверил)
		return !!orderData;
	}, [isCreating, isAdminOrSuperadmin, orderData]);

	// Менеджер может редактировать только если он ответственный за заказ (или создает новый)
	// Админы и суперадмины могут редактировать всегда
	const isEditMode = isAdminOrSuperadmin || isManagerResponsible;
	const isViewMode = !isEditMode && hasAccessToOrder; // Режим просмотра только если есть доступ, но нет прав на редактирование
	/** Привязка записи (ТО) к заказу: только у существующего заказа и в режиме редактирования */
	const canManageBookingLink = isEditMode && !isCreating;

	// Функция для определения доступных статусов для менеджера
	const getAvailableStatuses = (currentStatus: string) => {
		if (isAdminOrSuperadmin) {
			// Админы и суперадмины могут ставить любой статус
			return ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
		}

		if (isManager && isManagerResponsible) {
			// Менеджеры могут только повышать статус или оставлять текущий (только если они ответственные)
			const statusOrder = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
			const currentIndex = statusOrder.indexOf(currentStatus);
			if (currentIndex === -1) return ["created"];

			// Возвращаем текущий статус и все выше
			return statusOrder.slice(currentIndex);
		}

		return [currentStatus];
	};

	// Функция для определения, можно ли редактировать поле статуса
	const canEditStatusField = (statusName: string) => {
		// Если менеджер не является ответственным за заказ, он не может редактировать
		if (isManager && !isManagerResponsible) {
			return false;
		}

		const statusOrder = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
		const currentIndex = statusOrder.indexOf(currentStatus);
		const fieldIndex = statusOrder.indexOf(statusName);
		const initialIndex = statusOrder.indexOf(initialStatus);

		if (currentIndex === -1 || fieldIndex === -1 || initialIndex === -1) {
			return false;
		}

		// Поля предыдущих статусов закрыты для менеджеров и прочих ролей, кроме админа/суперадмина
		if (!isAdminOrSuperadmin && fieldIndex < currentIndex) {
			return false;
		}

		// Менеджеру доступен только текущий статус "Новый" пока заказ в статусе новый.
		// После перехода вперёд — редактирование текущего и прошлых статусов запрещено.
		if (isManager && isManagerResponsible) {
			if (initialStatus === "created") {
				if (statusName === "created") {
					return currentStatus === "created";
				}

				return fieldIndex > initialIndex && statusName === currentStatus;
			}

			if (fieldIndex <= initialIndex) {
				return false;
			}

			return statusName === currentStatus;
		}

		// Админ и суперадмин могут заполнять текущий статус и подготовить данные для будущего, но прошлое остаётся закрытым
		if (isAdminOrSuperadmin) {
			return true;
		}

		return false;
	};

	// Прокрутка к блоку связанной записи по якорю #orderLinkedBooking
	useEffect(() => {
		if (loading || !orderData) return;
		if (typeof window === "undefined") return;
		if (window.location.hash !== "#orderLinkedBooking") return;
		const el = document.getElementById("orderLinkedBooking");
		if (el) {
			requestAnimationFrame(() => {
				el.scrollIntoView({ behavior: "smooth", block: "start" });
			});
		}
	}, [loading, orderData?.id]);

	// Сброс панели привязки записи при смене заказа
	useEffect(() => {
		setBookingLinkPanelOpen(false);
		setBookingSearchQuery("");
		setBookingSearchResults([]);
		setSelectedBookingForLink(null);
		setBookingSearchFocused(false);
	}, [orderData?.id]);

	// Проверка прав доступа при создании
	useEffect(() => {
		if (isCreating && !isEditMode && !["superadmin", "admin", "manager"].includes(userRole || "")) {
			showErrorToast("У вас нет прав для создания заказов");
			router.push("/admin/orders");
		}
	}, [isCreating, isEditMode, userRole, router]);

	// Загрузка данных заказа (только при редактировании)
	useEffect(() => {
		const fetchOrderData = async () => {
			if (isCreating) return; // Не загружаем данные если создаем новый заказ

			try {
				setLoading(true);
				const response = await fetch(`/api/orders/${orderId}`, {
					method: "GET",
					credentials: "include",
				});

				if (!response.ok) {
					let message = "Ошибка при загрузке данных заказа";
					try {
						const errorData = await response.json();
						if (errorData?.error) message = errorData.error;
					} catch {}
					setError(message);
					setLoading(false);
					return;
				}

				const data = await response.json();
				const order = data.order;
				setOrderData(order);
				setCurrentStatus(order.status as OrderStatus);
				setInitialStatus(order.status as OrderStatus);
				// Сбрасываем baseline: он будет корректно зафиксирован после того,
				// как все поля формы и связанные состояния обновятся.
				initialSnapshotRef.current = null;
				setHasChanges(false);

				// Готовим строки товаров и подгружаем отделы
				const rawItems = (order.orderItems || []).map((item: any) => ({
					product_sku: item.product_sku,
					product_title: item.product_title,
					product_price: item.product_price,
					product_brand: item.product_brand,
					product_image: item.product_image,
					quantity: item.quantity,
					supplierDeliveryDate: item.supplierDeliveryDate || "",
					carModel: item.carModel || "",
					vinCode: item.vinCode || "",
					department: item.department || null,
				}));

				const productsBySku = new Map<string, { department: { id: number; name: string } | null; productId?: number }>();
				const itemsWithDepartments: OrderItemClient[] = [];

				for (const item of rawItems) {
					let productInfo = productsBySku.get(item.product_sku);

					if (!productInfo) {
						productInfo = { department: item.department ?? null, productId: undefined };
						productsBySku.set(item.product_sku, productInfo);
					}

					if (productInfo.productId === undefined) {
						try {
							const productResponse = await fetch(`/api/products?search=${encodeURIComponent(item.product_sku)}&limit=1`, {
								credentials: "include",
							});

							if (productResponse.ok) {
								const productData = await productResponse.json();
								const product: ProductListItem | undefined = productData?.products?.[0];
								productInfo = {
									department: product?.department ?? productInfo?.department ?? item.department ?? null,
									productId: product?.id,
								};
								productsBySku.set(item.product_sku, productInfo);
							} else {
								productsBySku.set(item.product_sku, productInfo);
							}
						} catch (fetchError) {
							console.error(`Не удалось получить данные товара ${item.product_sku}:`, fetchError);
							productsBySku.set(item.product_sku, productInfo);
						}
					}

					productInfo = productsBySku.get(item.product_sku) ?? { department: item.department ?? null, productId: undefined };
					const department = productInfo.department ?? item.department ?? null;

					if (!department || !department.id) {
						showErrorToast(`У товара ${item.product_title} (${item.product_sku}) отсутствует отдел. Пожалуйста, проверьте карточку товара.`);
						continue;
					}

					itemsWithDepartments.push({
						...item,
						department,
						productId: productInfo.productId,
					});
				}

				setOrderItems(itemsWithDepartments);

				// Заполняем форму данными заказа
				setFormData({
					clientId: order.clientId?.toString() || "",
					departmentId: order.departmentId?.toString() || "",
					managerId: order.managerId?.toString() || "",
					contactName: order.contactName || "",
					contactPhone: order.contactPhone || "",
					finalDeliveryDate: order.finalDeliveryDate ? new Date(order.finalDeliveryDate).toISOString() : "",
					bookedUntil: "",
					readyUntil: "",
					prepaymentAmount: "",
					prepaymentDate: "",
					paymentDate: "",
					orderAmount: "",
					completionDate: "",
					returnReason: "",
					returnDate: "",
					returnAmount: "",
					returnPaymentDate: "",
					returnDocumentNumber: "",
				});

				setComments(order.comments || []);
				setSelectedClient(order.client || null);
				setSelectedManager(order.manager || null);
				// Заполняем заявку и адрес
				setSelectedBooking(order.booking || null);
				applyDeliveryTargetsFromOrder(order);

				// Загружаем логи заказа для получения дат присвоения статусов
				try {
					const logsResponse = await fetch(`/api/orders/${orderId}/logs?limit=1000`, {
						credentials: "include",
					});

					if (logsResponse.ok) {
						const logsData = await logsResponse.json();
						const logs = logsData.data || [];

						// Вычисляем дату первого присвоения каждого статуса
						const statusDatesMap: Record<OrderStatus, string | null> = {
							created: null,
							confirmed: null,
							booked: null,
							ready: null,
							paid: null,
							completed: null,
							returned: null,
						};

						// Проходим по логам в обратном порядке (от старых к новым) и находим первое присвоение каждого статуса
						const statusChangeLogs = logs.filter((log: any) => log.action === "status_change" && log.orderSnapshot?.status).reverse(); // Переворачиваем, чтобы идти от старых к новым

						statusChangeLogs.forEach((log: any) => {
							const status = log.orderSnapshot?.status as OrderStatus;
							if (status && !statusDatesMap[status]) {
								// Сохраняем первую дату присвоения этого статуса
								statusDatesMap[status] = log.createdAt;
							}
						});

						// Если заказ создан, но нет лога изменения статуса, используем дату создания заказа
						if (!statusDatesMap.created && order.createdAt) {
							statusDatesMap.created = typeof order.createdAt === "string" ? order.createdAt : order.createdAt.toISOString();
						}

						setStatusDates(statusDatesMap);
					}
				} catch (logsError) {
					console.error("Ошибка загрузки логов заказа:", logsError);
					// Не прерываем загрузку, если логи не загрузились
				}
			} catch (err) {
				console.error("Ошибка загрузки заказа:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchOrderData();
	}, [orderId, isCreating]);

	// Загрузка отделов
	useEffect(() => {
		const fetchDepartments = async () => {
			try {
				const departmentsResponse = await fetch("/api/departments", {
					credentials: "include",
				});
				if (departmentsResponse.ok) {
					const departmentsData = await departmentsResponse.json();
					setDepartments(departmentsData);
				}
			} catch (err) {
				console.error("Ошибка загрузки отделов:", err);
			}
		};

		fetchDepartments();
	}, []);

	// Загрузка адресов (BookingDepartment) и пунктов выдачи
	useEffect(() => {
		const fetchBookingDepartments = async () => {
			try {
				const response = await fetch("/api/booking-departments", {
					credentials: "include",
				});
				if (response.ok) {
					const data = await response.json();
					setBookingDepartments(Array.isArray(data) ? data : []);
				}
			} catch (err) {
				console.error("Ошибка загрузки адресов:", err);
			}
		};

		const fetchPickupPoints = async () => {
			try {
				const response = await fetch("/api/pickup-points", {
					credentials: "include",
				});
				if (response.ok) {
					const data = await response.json();
					const list = Array.isArray(data) ? data : [];
					setPickupPoints(
						list.map((p: { id: number; name?: string | null; address: string; phones?: string[]; emails?: string[] }) => ({
							id: p.id,
							name: p.name ?? null,
							address: p.address,
							phones: p.phones ?? [],
							email: p.emails?.[0] ?? null,
						})),
					);
				}
			} catch (err) {
				console.error("Ошибка загрузки пунктов выдачи:", err);
			}
		};

		fetchBookingDepartments();
		fetchPickupPoints();
	}, []);

	// Устанавливаем отдел пользователя при создании заказа
	useEffect(() => {
		if (isCreating && user?.departmentId) {
			setFormData((prev) => ({
				...prev,
				departmentId: user.departmentId!.toString(),
			}));
		}
	}, [isCreating, user?.departmentId]);

	// Если менеджер создаёт заказ — сразу делаем его ответственным.
	useEffect(() => {
		if (!isCreating || !user) return;

		if (user.role === "manager") {
			setSelectedManager(user);
		}

		if (user.role === "admin") {
			// Для админа по умолчанию показываем его ФИО, чтобы один клик оставлял заказ на нём.
			setSelectedManager(user);
		}
	}, [isCreating, user]);

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

	/** API отдаёт bookingDepartment с emails[]; в форме заказа храним одиночное email для совместимости с селектами */
	const applyBookingDepartmentFromOrder = (bd: Order["bookingDepartment"] | null | undefined) => {
		if (!bd) {
			setSelectedBookingDepartment(null);
			return;
		}
		setSelectedBookingDepartment({
			id: bd.id,
			name: bd.name ?? null,
			address: bd.address,
			phones: bd.phones ?? [],
			email: bd.emails?.[0] ?? null,
		});
	};

	/** Адрес доставки: либо отдел для записей, либо пункт выдачи (из API заказа) */
	const applyDeliveryTargetsFromOrder = (o: Order | null | undefined) => {
		if (!o) {
			setSelectedBookingDepartment(null);
			setSelectedPickupPoint(null);
			return;
		}
		const pp = o.deliveryPickupPoint;
		if (o.deliveryPickupPointId != null && pp) {
			setSelectedPickupPoint({
				id: pp.id,
				name: pp.name ?? null,
				address: pp.address,
				phones: pp.phones ?? [],
				email: pp.emails?.[0] ?? null,
			});
			setSelectedBookingDepartment(null);
			return;
		}
		setSelectedPickupPoint(null);
		applyBookingDepartmentFromOrder(o.bookingDepartment);
	};

	const refetchOrderFromApi = async () => {
		if (!orderId || isCreating) return;
		try {
			const res = await fetch(`/api/orders/${orderId}`, { credentials: "include" });
			if (!res.ok) return;
			const d = await res.json();
			const o = d.order;
			if (!o) return;
			setOrderData(o);
			setSelectedBooking(o.booking || null);
			applyDeliveryTargetsFromOrder(o);
		} catch (e) {
			console.error("refetchOrderFromApi:", e);
		}
	};

	const runBookingSearch = async (value: string) => {
		const q = value.trim();
		if (q.length < 1 || !/^\d/.test(q)) {
			setBookingSearchResults([]);
			return;
		}
		setBookingSearchLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("q", q);
			if (!isCreating && orderId != null && String(orderId).trim() !== "") {
				params.set("forOrderId", String(orderId));
			}
			const res = await fetch(`/api/bookings/search-for-order?${params.toString()}`, { credentials: "include" });
			if (res.ok) {
				const d = await res.json();
				setBookingSearchResults(d.bookings || []);
			} else {
				setBookingSearchResults([]);
			}
		} catch (e) {
			console.error("runBookingSearch:", e);
			setBookingSearchResults([]);
		} finally {
			setBookingSearchLoading(false);
		}
	};

	const handleBookingSearchInput = (value: string) => {
		setBookingSearchQuery(value);
		if (bookingSearchDebounce.current) clearTimeout(bookingSearchDebounce.current);
		bookingSearchDebounce.current = setTimeout(() => runBookingSearch(value), 320);
	};

	const handleBookingSearchBlur = () => {
		if (bookingSearchBlurTimeout.current) clearTimeout(bookingSearchBlurTimeout.current);
		bookingSearchBlurTimeout.current = setTimeout(() => setBookingSearchFocused(false), 150);
	};

	const handleSelectBookingFromSearch = (row: BookingSearchForOrderRow) => {
		setSelectedBookingForLink(row);
		setBookingSearchQuery(String(row.id));
		setBookingSearchResults([]);
		setBookingSearchFocused(false);
	};

	const clearBookingLinkSelection = () => {
		setSelectedBookingForLink(null);
		setBookingSearchQuery("");
		setBookingSearchResults([]);
	};

	const openBookingLinkPanel = () => {
		setBookingLinkPanelOpen(true);
		setBookingSearchQuery("");
		setBookingSearchResults([]);
		setSelectedBookingForLink(null);
		setBookingSearchFocused(false);
	};

	const cancelBookingLinkPanel = () => {
		setBookingLinkPanelOpen(false);
		clearBookingLinkSelection();
	};

	const saveBookingLinkToOrder = async () => {
		if (!orderId || isCreating) return;
		if (!selectedBookingForLink) {
			showErrorToast("Выберите запись из списка");
			return;
		}
		setIsBookingLinkSaving(true);
		try {
			const res = await fetch(`/api/orders/${orderId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ bookingId: selectedBookingForLink.id }),
			});
			const raw = await res.text();
			let data: { error?: string; order?: Order } | null = null;
			try {
				data = raw ? JSON.parse(raw) : null;
			} catch {
				data = null;
			}
			if (!res.ok) {
				throw new Error(data?.error || "Не удалось привязать запись");
			}
			showSuccessToast("Заказ связан с записью (ТО)");
			cancelBookingLinkPanel();
			if (data?.order) {
				setOrderData(data.order);
				setSelectedBooking(data.order.booking || null);
				applyDeliveryTargetsFromOrder(data.order);
			} else {
				await refetchOrderFromApi();
			}
		} catch (e) {
			showErrorToast(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setIsBookingLinkSaving(false);
		}
	};

	const unlinkBookingFromOrder = async () => {
		if (!orderId || isCreating) return;
		if (!window.confirm("Отвязать заказ от записи? Сама запись останется в системе.")) return;
		setIsBookingLinkSaving(true);
		try {
			const res = await fetch(`/api/orders/${orderId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ bookingId: null }),
			});
			const raw = await res.text();
			let data: { error?: string; order?: Order } | null = null;
			try {
				data = raw ? JSON.parse(raw) : null;
			} catch {
				data = null;
			}
			if (!res.ok) {
				throw new Error(data?.error || "Не удалось отвязать запись");
			}
			showSuccessToast("Связь заказа с записью снята");
			cancelBookingLinkPanel();
			if (data?.order) {
				setOrderData(data.order);
				setSelectedBooking(data.order.booking || null);
				applyDeliveryTargetsFromOrder(data.order);
			} else {
				await refetchOrderFromApi();
			}
		} catch (e) {
			showErrorToast(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setIsBookingLinkSaving(false);
		}
	};

	// Функция для получения текста статуса
	const getStatusText = (status: OrderStatus | string) => {
		switch (status) {
			case "created":
				return "1. Новый";
			case "confirmed":
				return "2. Подтверждённый";
			case "booked":
				return "3. Забронирован";
			case "ready":
				return "4. Готов к выдаче";
			case "paid":
				return "5. Оплачен";
			case "completed":
				return "6. Выполнен";
			case "returned":
				return "7. Возврат";
			default:
				return status || "Не указан";
		}
	};

	const selectedDepartmentIdValue = formData.departmentId ? parseInt(formData.departmentId, 10) : null;
	const currentDepartment =
		selectedDepartmentIdValue !== null
			? departments.find((d) => d.id === selectedDepartmentIdValue) ||
				(selectedManager?.department && selectedManager.department.id === selectedDepartmentIdValue ? selectedManager.department : null) ||
				(orderData?.department && orderData.department.id === selectedDepartmentIdValue ? orderData.department : null)
			: orderData?.department || selectedManager?.department || null;

	// Функция для фильтрации менеджеров по отделу
	const getCurrentSnapshot = () => {
		try {
			return JSON.stringify({
				clientId: formData.clientId || (selectedClient ? selectedClient.id.toString() : ""),
				departmentId: formData.departmentId || "",
				managerId: formData.managerId || (selectedManager ? selectedManager.id.toString() : ""),
				contactName: formData.contactName,
				contactPhone: formData.contactPhone,
				finalDeliveryDate: formData.finalDeliveryDate,
				bookedUntil: formData.bookedUntil,
				readyUntil: formData.readyUntil,
				prepaymentAmount: formData.prepaymentAmount,
				prepaymentDate: formData.prepaymentDate,
				paymentDate: formData.paymentDate,
				orderAmount: formData.orderAmount,
				completionDate: formData.completionDate,
				returnReason: formData.returnReason,
				returnDate: formData.returnDate,
				returnAmount: formData.returnAmount,
				returnPaymentDate: formData.returnPaymentDate,
				returnDocumentNumber: formData.returnDocumentNumber,
				comments,
				status: currentStatus,
				bookingDepartmentId: selectedBookingDepartment?.id ?? null,
				deliveryPickupPointId: selectedPickupPoint?.id ?? null,
				orderItems: orderItems.map((item) => ({
					product_sku: item.product_sku,
					product_title: item.product_title,
					product_price: item.product_price,
					product_brand: item.product_brand,
					product_image: item.product_image || null,
					quantity: item.quantity,
					supplierDeliveryDate: item.supplierDeliveryDate || "",
					carModel: item.carModel || "",
					vinCode: item.vinCode || "",
					departmentId: item.department?.id || null,
				})),
			});
		} catch (error) {
			console.error("Не удалось сформировать снапшот формы заказа:", error);
			return null;
		}
	};

	useEffect(() => {
		// Для существующего заказа ждём окончания загрузки, чтобы не ловить ложные изменения
		// на промежуточных состояниях (до заполнения всех полей формы).
		if (!isCreating && loading) {
			return;
		}

		const snapshot = getCurrentSnapshot();
		if (!snapshot) return;

		if (initialSnapshotRef.current === null) {
			initialSnapshotRef.current = snapshot;
			setHasChanges(false);
			return;
		}

		setHasChanges(snapshot !== initialSnapshotRef.current);
	}, [formData, comments, orderItems, currentStatus, selectedClient, selectedManager, selectedBookingDepartment, selectedPickupPoint, isCreating, loading]);

	// Флаг: можно ли прямо сейчас редактировать блок статуса "Новый"
	const createdStatusEditable = canEditStatusField("created");
	const confirmedStatusEditable = canEditStatusField("confirmed");
	const bookedStatusEditable = canEditStatusField("booked");
	const readyStatusEditable = canEditStatusField("ready");
	const paidStatusEditable = canEditStatusField("paid");
	const completedStatusEditable = canEditStatusField("completed");
	const returnedStatusEditable = canEditStatusField("returned");

	// Добавление комментария
	const addComment = () => {
		if (newComment.trim()) {
			setComments((prev) => [...prev, newComment.trim()]);
			setNewComment("");
		}
	};

	// Редактирование комментария
	const editComment = (index: number, newText: string) => {
		setComments((prev) => prev.map((comment, i) => (i === index ? newText : comment)));
	};

	// Удаление комментария
	const deleteComment = (index: number) => {
		setComments((prev) => prev.filter((_, i) => i !== index));
	};

	// Функция для очистки ошибок поля
	const clearFieldError = (fieldName: string) => {
		setFieldErrors((prev) => {
			const newErrors = new Set(prev);
			newErrors.delete(fieldName);
			return newErrors;
		});
	};

	// Функция валидации полей для статуса
	const validateStatusFields = (status: OrderStatus): { isValid: boolean; missingFields: string[]; errorFields: string[] } => {
		const missingFields: string[] = [];
		const errorFields: string[] = [];

		console.log("🔍 Валидация для статуса:", status);
		console.log("📊 Текущие данные:", {
			contactPhone: formData.contactPhone,
			departmentId: formData.departmentId,
			selectedClient: selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : null,
			selectedManager: selectedManager ? `${selectedManager.first_name} ${selectedManager.last_name}` : null,
			orderItemsCount: orderItems.length,
		});

		const isSuperadminSelfResponsible = userRole === "superadmin" && user && selectedManager && selectedManager.id === user.id;

		// Проверяем ВСЕ статусы от "created" до текущего статуса
		const statusOrder = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
		const currentStatusIndex = statusOrder.indexOf(status);

		// 1. Новый - контакты либо выбранный клиент, и состав заказа (всегда проверяем)
		if (currentStatusIndex >= 0) {
			// Если клиент ещё не выбран, требуем имя и телефон
			if (!selectedClient) {
				if (!formData.contactName.trim()) {
					missingFields.push("Имя клиента (лида)");
					errorFields.push("contactName");
				}
				if (!formData.contactPhone.trim()) {
					missingFields.push("Контактный телефон");
					errorFields.push("contactPhone");
				}
			}
			if (orderItems.length === 0) {
				missingFields.push("Состав заказа");
				errorFields.push("productSearch");
			}
		}

		// 2. Подтвержденный - клиент, ответственный, отдел, дата согласования, дата поставки поставщиком
		if (currentStatusIndex >= 1) {
			if (!selectedClient) {
				missingFields.push("Клиент");
				errorFields.push("clientSearch");
			}
			if (!formData.departmentId && !isSuperadminSelfResponsible) {
				missingFields.push("Отдел");
				errorFields.push("departmentId");
			}
			if (isSuperadminSelfResponsible && formData.departmentId) {
				missingFields.push("При назначении себя ответственным отдел должен быть пустым");
				errorFields.push("departmentId");
			}
			if (!selectedManager) {
				missingFields.push("Ответственный менеджер");
				errorFields.push("managerSearch");
			} else if (formData.departmentId) {
				const managerDepartmentId = selectedManager.department?.id ?? selectedManager.departmentId ?? null;
				if (managerDepartmentId !== parseInt(formData.departmentId, 10)) {
					missingFields.push("Ответственный менеджер должен быть из выбранного отдела");
					errorFields.push("managerSearch");
				}
			}
			// Проверяем, что у всех товаров заполнена дата поставки поставщиком
			const itemsWithoutSupplierDate = orderItems.filter((item) => !item.supplierDeliveryDate);
			if (itemsWithoutSupplierDate.length > 0) {
				missingFields.push("Дата поставки поставщиком");
				errorFields.push("supplierDeliveryDate");
			}
		}

		// 3. Забронирован - забронирован до
		if (currentStatusIndex >= 2) {
			if (!formData.bookedUntil) {
				missingFields.push("Забронирован до");
				errorFields.push("bookedUntil");
			}
		}

		// 4. Готов к выдаче - отложен до, сумма предоплаты, дата внесения предоплаты
		if (currentStatusIndex >= 3) {
			if (!formData.readyUntil) {
				missingFields.push("Отложен до");
				errorFields.push("readyUntil");
			}
			if (!formData.prepaymentAmount || parseFloat(formData.prepaymentAmount) <= 0) {
				missingFields.push("Сумма предоплаты");
				errorFields.push("prepaymentAmount");
			}
			if (!formData.prepaymentDate) {
				missingFields.push("Дата внесения предоплаты");
				errorFields.push("prepaymentDate");
			}
		}

		// 5. Оплачен - дата внесения оплаты, сумма заказа
		if (currentStatusIndex >= 4) {
			if (!formData.paymentDate) {
				missingFields.push("Дата внесения оплаты");
				errorFields.push("paymentDate");
			}
			if (!formData.orderAmount || parseFloat(formData.orderAmount) <= 0) {
				missingFields.push("Сумма заказа");
				errorFields.push("orderAmount");
			}
		}

		// 6. Выполнен - дата выполнения
		if (currentStatusIndex >= 5) {
			if (!formData.completionDate) {
				missingFields.push("Дата выполнения");
				errorFields.push("completionDate");
			}
		}

		// 7. Возврат - все поля возврата
		if (currentStatusIndex >= 6) {
			if (!formData.returnReason) {
				missingFields.push("Причина возврата позиции");
				errorFields.push("returnReason");
			}
			if (!formData.returnDate) {
				missingFields.push("Дата возврата позиции");
				errorFields.push("returnDate");
			}
			if (!formData.returnAmount || parseFloat(formData.returnAmount) <= 0) {
				missingFields.push("Сумма возврата");
				errorFields.push("returnAmount");
			}
			if (!formData.returnPaymentDate) {
				missingFields.push("Дата возврата денежных средств");
				errorFields.push("returnPaymentDate");
			}
			if (!formData.returnDocumentNumber) {
				missingFields.push("Номер документа возврата средств");
				errorFields.push("returnDocumentNumber");
			}
		}

		console.log("❌ Найдены ошибки:", missingFields);
		console.log("🎯 Поля с ошибками:", errorFields);
		console.log("✅ Валидность:", missingFields.length === 0);

		return {
			isValid: missingFields.length === 0,
			missingFields,
			errorFields,
		};
	};

	// Функция для "забрать заказ" - назначить текущего пользователя ответственным
	const handleTakeOrder = async () => {
		if (!user || !orderId) {
			showErrorToast("Ошибка: пользователь не авторизован или заказ не найден");
			return;
		}

		// Проверяем условия для возможности взять заказ
		const currentManager = selectedManager || orderData?.manager;
		const hasManager = currentManager && currentManager.id;

		if (hasManager) {
			showErrorToast("У заказа уже есть ответственный");
			return;
		}

		const orderDepartmentId = orderData?.departmentId || (formData.departmentId ? parseInt(formData.departmentId, 10) : null);
		const userDepartmentId = user.departmentId;

		// Проверяем: у заказа нет отдела ИЛИ отдел заказа соответствует отделу пользователя
		// Если заказ загружен и менеджер имеет к нему доступ, значит API уже проверил права доступа
		// Но для безопасности проверяем еще раз на клиенте
		if (isManager && orderDepartmentId && userDepartmentId && orderDepartmentId !== userDepartmentId) {
			showErrorToast("Вы не можете взять заказ из другого отдела");
			return;
		}

		// Проверяем роль пользователя
		if (!isManager && !isAdminOrSuperadmin) {
			showErrorToast("Только менеджеры и администраторы могут брать заказы");
			return;
		}

		try {
			setIsSaving(true);

			// Отправляем запрос на обновление заказа
			const response = await fetch(`/api/orders/${orderId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					managerId: user.id,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				showErrorToast(errorData.error || "Ошибка при назначении ответственного");
				return;
			}

			const updatedOrder = await response.json();
			setOrderData(updatedOrder.order);
			setSelectedManager({
				id: user.id,
				first_name: user.first_name,
				last_name: user.last_name,
				middle_name: user.middle_name || "",
				phone: user.phone || "",
				role: user.role,
				department: user.department ?? undefined,
				departmentId: user.departmentId ?? null,
				status: user.status || "",
				orders: [],
			});
			setFormData((prev) => ({
				...prev,
				managerId: user.id.toString(),
			}));

			showSuccessToast("Заказ успешно взят в работу");
		} catch (error) {
			console.error("Ошибка при взятии заказа:", error);
			showErrorToast("Ошибка при взятии заказа");
		} finally {
			setIsSaving(false);
		}
	};

	// Сохранение заказа
	const handleSave = async () => {
		try {
			setIsSaving(true);
			setFieldErrors(new Set()); // Очищаем ошибки

			// Валидируем поля для текущего статуса
			const validation = validateStatusFields(currentStatus);
			console.log("💾 Результат валидации:", validation);
			if (!validation.isValid) {
				console.log("🚫 Устанавливаем ошибки полей:", validation.errorFields);
				setFieldErrors(new Set(validation.errorFields));
				showErrorToast(`Необходимо заполнить: ${validation.missingFields.join(", ")}`);
				return;
			}

			const isSuperadminSelf = userRole === "superadmin" && user && selectedManager && selectedManager.id === user.id;

			const statusTimeline: OrderStatus[] = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
			const initialIndex = statusTimeline.indexOf(initialStatus);
			const currentIndexForRequest = statusTimeline.indexOf(currentStatus);

			const fieldStatusIndexMap: Record<string, number> = {
				orderItems: 0,
				contactName: 0,
				contactPhone: 0,
				clientId: 1,
				managerId: 1,
				departmentId: 1,
				finalDeliveryDate: 1,
				bookingDepartmentId: 1,
				bookedUntil: 2,
				readyUntil: 3,
				prepaymentAmount: 3,
				prepaymentDate: 3,
				paymentDate: 4,
				orderAmount: 4,
				completionDate: 5,
				returnReason: 6,
				returnDate: 6,
				returnAmount: 6,
				returnPaymentDate: 6,
				returnDocumentNumber: 6,
			};

			const managerCanEditFieldForRequest = (fieldKey: string) => {
				if (!isManager || isCreating) {
					return true;
				}

				if (initialIndex === -1) {
					return false;
				}

				const fieldIndex = fieldStatusIndexMap[fieldKey];

				if (fieldIndex === undefined) {
					return true;
				}

				if (initialStatus === "created") {
					if (fieldIndex === 0) {
						return currentStatus === "created";
					}
					return fieldIndex > initialIndex && fieldIndex === currentIndexForRequest;
				}

				if (fieldIndex <= initialIndex) {
					return false;
				}

				return fieldIndex === currentIndexForRequest;
			};

			const orderData: Record<string, any> = {
				status: currentStatus,
			};

			const preparedOrderItems = orderItems.map(({ department, productId, ...item }) => item);
			if (preparedOrderItems.length > 0 && managerCanEditFieldForRequest("orderItems")) {
				orderData.orderItems = preparedOrderItems;
			} else if (!isManager || isCreating) {
				orderData.orderItems = preparedOrderItems;
			}

			if (selectedClient && managerCanEditFieldForRequest("clientId")) {
				orderData.clientId = selectedClient.id;
			} else if (!isManager) {
				if (selectedClient) {
					orderData.clientId = selectedClient.id;
				}
			}

			if (selectedManager && managerCanEditFieldForRequest("managerId")) {
				orderData.managerId = selectedManager.id;
			} else if (!isManager) {
				if (selectedManager) {
					orderData.managerId = selectedManager.id;
				}
			}

			if (managerCanEditFieldForRequest("contactName")) {
				orderData.contactName = formData.contactName.trim() || null;
			} else if (!isManager) {
				orderData.contactName = formData.contactName.trim() || null;
			}

			if (managerCanEditFieldForRequest("contactPhone")) {
				orderData.contactPhone = formData.contactPhone.trim() || null;
			} else if (!isManager) {
				orderData.contactPhone = formData.contactPhone.trim() || null;
			}

			if (formData.finalDeliveryDate && managerCanEditFieldForRequest("finalDeliveryDate")) {
				orderData.finalDeliveryDate = formData.finalDeliveryDate;
			} else if (!isManager && formData.finalDeliveryDate) {
				orderData.finalDeliveryDate = formData.finalDeliveryDate;
			}

			if (formData.bookedUntil && managerCanEditFieldForRequest("bookedUntil")) {
				orderData.bookedUntil = formData.bookedUntil;
			} else if (!isManager && formData.bookedUntil) {
				orderData.bookedUntil = formData.bookedUntil;
			}

			if (formData.readyUntil && managerCanEditFieldForRequest("readyUntil")) {
				orderData.readyUntil = formData.readyUntil;
			} else if (!isManager && formData.readyUntil) {
				orderData.readyUntil = formData.readyUntil;
			}

			if (formData.prepaymentAmount && managerCanEditFieldForRequest("prepaymentAmount")) {
				orderData.prepaymentAmount = parseFloat(formData.prepaymentAmount);
			} else if (!isManager && formData.prepaymentAmount) {
				orderData.prepaymentAmount = parseFloat(formData.prepaymentAmount);
			}

			if (formData.prepaymentDate && managerCanEditFieldForRequest("prepaymentDate")) {
				orderData.prepaymentDate = formData.prepaymentDate;
			} else if (!isManager && formData.prepaymentDate) {
				orderData.prepaymentDate = formData.prepaymentDate;
			}

			if (formData.paymentDate && managerCanEditFieldForRequest("paymentDate")) {
				orderData.paymentDate = formData.paymentDate;
			} else if (!isManager && formData.paymentDate) {
				orderData.paymentDate = formData.paymentDate;
			}

			if (formData.orderAmount && managerCanEditFieldForRequest("orderAmount")) {
				orderData.orderAmount = parseFloat(formData.orderAmount);
			} else if (!isManager && formData.orderAmount) {
				orderData.orderAmount = parseFloat(formData.orderAmount);
			}

			if (formData.completionDate && managerCanEditFieldForRequest("completionDate")) {
				orderData.completionDate = formData.completionDate;
			} else if (!isManager && formData.completionDate) {
				orderData.completionDate = formData.completionDate;
			}

			if (formData.returnReason && managerCanEditFieldForRequest("returnReason")) {
				orderData.returnReason = formData.returnReason;
			} else if (!isManager && formData.returnReason) {
				orderData.returnReason = formData.returnReason;
			}

			if (formData.returnDate && managerCanEditFieldForRequest("returnDate")) {
				orderData.returnDate = formData.returnDate;
			} else if (!isManager && formData.returnDate) {
				orderData.returnDate = formData.returnDate;
			}

			if (formData.returnAmount && managerCanEditFieldForRequest("returnAmount")) {
				orderData.returnAmount = parseFloat(formData.returnAmount);
			} else if (!isManager && formData.returnAmount) {
				orderData.returnAmount = parseFloat(formData.returnAmount);
			}

			if (formData.returnPaymentDate && managerCanEditFieldForRequest("returnPaymentDate")) {
				orderData.returnPaymentDate = formData.returnPaymentDate;
			} else if (!isManager && formData.returnPaymentDate) {
				orderData.returnPaymentDate = formData.returnPaymentDate;
			}

			if (formData.returnDocumentNumber && managerCanEditFieldForRequest("returnDocumentNumber")) {
				orderData.returnDocumentNumber = formData.returnDocumentNumber;
			} else if (!isManager && formData.returnDocumentNumber) {
				orderData.returnDocumentNumber = formData.returnDocumentNumber;
			}

			if (comments.length > 0) {
				orderData.comments = comments;
			} else if (!isCreating) {
				// Если все комментарии удалены и это редактирование существующего заказа — очищаем поле.
				orderData.comments = [];
			}

			if (isSuperadminSelf) {
				orderData.departmentId = null;
			} else if (formData.departmentId) {
				if (!isManager || managerCanEditFieldForRequest("departmentId")) {
					orderData.departmentId = parseInt(formData.departmentId, 10);
				}
			} else if (!isCreating) {
				if (!isManager || managerCanEditFieldForRequest("departmentId")) {
					orderData.departmentId = null;
				}
			}

			if (!formData.finalDeliveryDate && !isCreating) {
				if (!isManager || managerCanEditFieldForRequest("finalDeliveryDate")) {
					orderData.finalDeliveryDate = null;
				}
			}

			// Адрес доставки: отдел для записей или пункт выдачи (как у «Подтверждённого» — индекс 1)
			if (!isManager || managerCanEditFieldForRequest("bookingDepartmentId")) {
				orderData.bookingDepartmentId = selectedPickupPoint ? null : (selectedBookingDepartment?.id ?? null);
				orderData.deliveryPickupPointId = selectedBookingDepartment ? null : (selectedPickupPoint?.id ?? null);
			}

			let response;
			if (isCreating) {
				// Создание новой заказа
				response = await fetch("/api/orders", {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(orderData),
				});
			} else {
				// Обновление существующей заказа
				response = await fetch(`/api/orders/${orderId}`, {
					method: "PUT",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(orderData),
				});
			}

			const responseText = await response.text();
			const tryParse = (text: string) => {
				if (!text || !text.trim()) return null;
				try {
					return JSON.parse(text);
				} catch (parseError) {
					console.error("Не удалось распарсить ответ сервера:", parseError);
					return null;
				}
			};

			if (!response.ok) {
				const errorData = tryParse(responseText);
				throw new Error(errorData?.error || "Ошибка при сохранении заказа");
			}

			const data = tryParse(responseText);
			showSuccessToast(isCreating ? "Заказ успешно создан" : "Заказ успешно обновлен");

			if (isCreating) {
				// Перенаправляем на страницу созданной заказа
				if (data?.order?.id) {
					router.push(`/admin/orders/${data.order.id}`);
				} else {
					router.push("/admin/orders");
				}
			} else {
				// Обновляем данные заказа
				if (data?.order) {
					setOrderData(data.order);
					if (data.order.status) {
						setCurrentStatus(data.order.status as OrderStatus);
						setInitialStatus(data.order.status as OrderStatus);
					}
					// Обновляем заявку и адрес
					setSelectedBooking(data.order.booking || null);
					applyDeliveryTargetsFromOrder(data.order);
					initialSnapshotRef.current = null;
					setHasChanges(false);
				} else {
					initialSnapshotRef.current = null;
					setHasChanges(false);
				}
			}
		} catch (err) {
			console.error("Ошибка сохранения заказа:", err);
			showErrorToast(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setIsSaving(false);
		}
	};

	if (loading) {
		return (
			<div className={`tableContent orderComponent`}>
				<Loading />
			</div>
		);
	}

	if (error) {
		return (
			<div className="errorContainer">
				<h2>Ошибка</h2>
				<p>{error}</p>
				<button onClick={() => router.push("/admin/orders")} className="backButton">
					Вернуться к списку заказов
				</button>
			</div>
		);
	}

	return (
		<div className={`tableContent orderComponent`}>
			<div className={`formContainer`}>
				<div className={`formHeader`}>
					<h2>{isCreating ? "Создание заказа" : isViewMode ? `Просмотр заказа #${orderData?.id}` : `Заказ #${orderData?.id}`}</h2>
					{(orderData || isCreating) && (
						<div className={`orderMainInfo`}>
							<div className={`orderInfoFields`}>
								{orderData && orderBookingClientMismatch && (
									<div className="infoRow" role="alert">
										<div className="infoField column">
											<strong>Предупреждение:</strong> у заказа и у связанной записи (booking) указаны{" "}
											<strong>разные клиенты</strong>. Проверьте данные перед сохранением или связыванием.
										</div>
									</div>
								)}
								<div className="infoRow">
									{orderData && (
										<>
											<div className={`infoField`}>
												<span className={`infoLabel`}>Дата оформления заказа:</span>
												<span className={`infoValue`}>{formatDate(orderData.createdAt)}</span>
											</div>
											<div className={`infoField`}>
												<span className={`infoLabel`}>Текущий статус:</span>
												<div className={`statusWithDate`}>
													{isEditMode || isViewMode ? (
														<select
															value={currentStatus || orderData?.status || "created"}
															onChange={(e) => setCurrentStatus(e.target.value as OrderStatus)}
															className={`statusSelect`}
															disabled={!isEditMode}
														>
															{getAvailableStatuses(currentStatus || orderData?.status || "created").map((status) => (
																<option key={status} value={status}>
																	{status === "created" && "1. Новый"}
																	{status === "confirmed" && "2. Подтвержденный"}
																	{status === "booked" && "3. Забронирован"}
																	{status === "ready" && "4. Готов к выдаче"}
																	{status === "paid" && "5. Оплачен"}
																	{status === "completed" && "6. Выполнен"}
																	{status === "returned" && "7. Возврат"}
																</option>
															))}
														</select>
													) : (
														<span className={`infoValue`}>{getStatusText(currentStatus || orderData?.status || "created")}</span>
													)}
													{orderData && (
														<span className={`statusDateInfo`}>
															{statusDates[currentStatus || orderData.status] || orderData.statusChangeDate
																? `Присвоен: ${formatDate(statusDates[currentStatus || orderData.status] || orderData.statusChangeDate)}`
																: "Дата не указана"}
														</span>
													)}
												</div>
											</div>
											<div className={`infoField`}>
												<span className={`infoLabel`}>Дата доставки клиенту:</span>
												<span className={`infoValue`}>{formatDate(orderData.finalDeliveryDate) || "Не указана"}</span>
											</div>
										</>
									)}
								</div>
								<div className="infoRow">
									<div className={`infoField`}>
										<span className={`infoLabel`}>Клиент:</span>
										<span className={`infoValue`}>
											{(() => {
												const client = selectedClient || orderData?.client;
												const clientName = client ? `${client.first_name || ""} ${client.last_name || ""}`.trim() || "Не указан" : "Не указан";
												const clientId = client?.id;

												return clientId ? (
													<Link href={`/admin/users/${clientId}`} className="itemLink" target="_blank">
														{clientName}
													</Link>
												) : (
													clientName
												);
											})()}
										</span>
									</div>
									<div className={`infoField`}>
										<span className={`infoLabel`}>Ответственный:</span>
										<span className={`infoValue`}>
											{(() => {
												const manager = selectedManager || orderData?.manager;
												const managerName = manager ? `${manager.first_name || ""} ${manager.last_name || ""}`.trim() || "Не назначен" : "Не назначен";
												const managerId = manager?.id;

												return managerId ? (
													<Link href={`/admin/users/${managerId}`} className="itemLink" target="_blank">
														{managerName}
													</Link>
												) : (
													managerName
												);
											})()}
										</span>
										{(() => {
											// Проверяем условия для отображения кнопки "забрать заказ"
											const currentManager = selectedManager || orderData?.manager;
											// Проверяем наличие ответственного: либо в selectedManager, либо в orderData.manager, либо в orderData.managerId
											const hasManager = (currentManager && currentManager.id) || (orderData?.managerId !== null && orderData?.managerId !== undefined);

											// Кнопка показывается если:
											// 1. У заказа нет ответственного
											// 2. Заказ загружен (orderData существует) - это означает, что API уже проверил права доступа
											//    Если заказ загружен и менеджер имеет к нему доступ, значит либо заказ свободный, либо заказ его отдела
											// 3. Пользователь менеджер или админ
											// 4. Не в режиме создания заказа
											// 5. Заказ существует
											const canTakeOrder =
												!hasManager && // У заказа нет ответственного
												!!orderData && // Заказ загружен (API уже проверил права доступа)
												(isManager || isAdminOrSuperadmin) && // Пользователь менеджер или админ
												!isCreating && // Не в режиме создания
												!!orderId; // Заказ существует

											return canTakeOrder ? (
												<button type="button" onClick={handleTakeOrder} className="takeOrderButton" disabled={isSaving}>
													{isSaving ? "Обработка..." : "Забрать заказ"}
												</button>
											) : null;
										})()}
									</div>
									{(orderData || isCreating) && (
										<div className={`infoField infoFieldBookingLink column`} id={orderData ? "orderLinkedBooking" : undefined}>
											<span className={`infoLabel`}>Связь с записью</span>
											<div className={`infoValue column`}>
												{isCreating ? (
													<p className="toLinkOrderHint">
														После сохранения заказа здесь можно связать запись с заказом: поиск по числовому ID записи.
													</p>
												) : (
													(() => {
														const bk = selectedBooking ?? orderData?.booking;
														if (!bk) {
															return (
																<div className="column">
																	{!canManageBookingLink ? (
																		<span className="toLinkOrderHint">Запись не привязана.</span>
																	) : !bookingLinkPanelOpen ? (
																		<>
																			<span className="toLinkOrderHint">Запись не привязана.</span>
																			<button
																				type="button"
																				onClick={openBookingLinkPanel}
																				className="primaryButton"
																				disabled={isBookingLinkSaving}
																			>
																				Связать с записью
																			</button>
																		</>
																	) : (
																		<BookingLinkSearchBlock
																			bookingSearchQuery={bookingSearchQuery}
																			handleBookingSearchInput={handleBookingSearchInput}
																			bookingSearchFocused={bookingSearchFocused}
																			setBookingSearchFocused={setBookingSearchFocused}
																			bookingSearchBlurTimeout={bookingSearchBlurTimeout}
																			handleBookingSearchBlur={handleBookingSearchBlur}
																			bookingSearchLoading={bookingSearchLoading}
																			bookingSearchResults={bookingSearchResults}
																			handleSelectBookingFromSearch={handleSelectBookingFromSearch}
																			selectedBookingForLink={selectedBookingForLink}
																			clearBookingLinkSelection={clearBookingLinkSelection}
																			saveBookingLinkToOrder={saveBookingLinkToOrder}
																			cancelBookingLinkPanel={cancelBookingLinkPanel}
																			isBookingLinkSaving={isBookingLinkSaving}
																		/>
																	)}
																</div>
															);
														}
														const dateStr =
															typeof bk.scheduledDate === "string"
																? bk.scheduledDate
																: new Date(bk.scheduledDate).toISOString();
														const bookingTitle = (
															<>
																<Link href={`/admin/bookings/${bk.id}`} className="itemLink" target="_blank">
																	Запись #{bk.id}
																</Link>
																<span className="bookingLinkPickStatus">{bookingStatusLabelRu(String(bk.status))}</span>
															</>
														);
														const bookingMeta = [
															{ label: "Когда:", value: `${formatToRuDate(dateStr)} ${bk.scheduledTime}` },
															{
																label: "Контакт:",
																value: (
																	<>
																		{bk.contactPhone || "—"}
																		{bk.client?.id ? (
																			<>
																				{" · "}
																				<Link
																					href={`/admin/users/${bk.client.id}`}
																					className="itemLink"
																					target="_blank"
																				>
																					{[bk.client.first_name, bk.client.last_name].filter(Boolean).join(" ").trim() ||
																						"Клиент"}
																				</Link>
																			</>
																		) : null}
																	</>
																),
															},
															{
																label: "Отдел:",
																value: bk.bookingDepartment
																	? [bk.bookingDepartment.name, bk.bookingDepartment.address].filter(Boolean).join(" — ")
																	: "—",
															},
														];
														const bookingActions =
															canManageBookingLink && !bookingLinkPanelOpen ? (
																<>
																	<button
																		type="button"
																		className="primaryButton"
																		onClick={openBookingLinkPanel}
																		disabled={isBookingLinkSaving}
																	>
																		Сменить запись
																	</button>
																	<button
																		type="button"
																		className="secondaryButton"
																		onClick={unlinkBookingFromOrder}
																		disabled={isBookingLinkSaving}
																	>
																		Отвязать
																	</button>
																</>
															) : null;
														return (
															<div className="column">
																<LinkedRelationCard title={bookingTitle} metaLines={bookingMeta} actions={bookingActions} />
																{bookingLinkPanelOpen && canManageBookingLink ? (
																	<BookingLinkSearchBlock
																		hintText="Укажите ID другой записи — в списке только записи без привязанного заказа."
																		bookingSearchQuery={bookingSearchQuery}
																		handleBookingSearchInput={handleBookingSearchInput}
																		bookingSearchFocused={bookingSearchFocused}
																		setBookingSearchFocused={setBookingSearchFocused}
																		bookingSearchBlurTimeout={bookingSearchBlurTimeout}
																		handleBookingSearchBlur={handleBookingSearchBlur}
																		bookingSearchLoading={bookingSearchLoading}
																		bookingSearchResults={bookingSearchResults}
																		handleSelectBookingFromSearch={handleSelectBookingFromSearch}
																		selectedBookingForLink={selectedBookingForLink}
																		clearBookingLinkSelection={clearBookingLinkSelection}
																		saveBookingLinkToOrder={saveBookingLinkToOrder}
																		cancelBookingLinkPanel={cancelBookingLinkPanel}
																		isBookingLinkSaving={isBookingLinkSaving}
																	/>
																) : null}
															</div>
														);
													})()
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				{(isEditMode || isViewMode) && (
					<div className={`formFields`}>
						{/* Блоки статусов заказа */}
						{/* 1. Новый - Контактные данные лида (если клиент не выбран) */}
						<StatusNewSection
							isActive={currentStatus === "created"}
							formData={formData}
							setFormData={setFormData}
							orderItems={orderItems}
							setOrderItems={setOrderItems}
							orderTotal={orderTotal}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							canEdit={isEditMode ? createdStatusEditable : false}
							statusDate={statusDates.created}
						/>

						{/* 2. Подтвержденный - Клиент, ответственный, состав заказа, дата согласования */}
						<StatusConfirmedSection
							isActive={currentStatus === "confirmed"}
							formData={formData}
							setFormData={setFormData}
							selectedClient={selectedClient}
							setSelectedClient={setSelectedClient}
							selectedManager={selectedManager}
							setSelectedManager={setSelectedManager}
							currentDepartment={currentDepartment}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							canEdit={isEditMode ? confirmedStatusEditable : false}
							userRole={userRole}
							user={user}
							departments={departments}
							orderItems={orderItems}
							setOrderItems={setOrderItems}
							orderTotal={orderTotal}
							orderData={orderData}
							currentStatus={currentStatus}
							statusDate={statusDates.confirmed}
							selectedBooking={selectedBooking}
							setSelectedBooking={setSelectedBooking}
							selectedBookingDepartment={selectedBookingDepartment}
							setSelectedBookingDepartment={setSelectedBookingDepartment}
							bookingDepartments={bookingDepartments}
							pickupPoints={pickupPoints}
							selectedPickupPoint={selectedPickupPoint}
							setSelectedPickupPoint={setSelectedPickupPoint}
						/>

						{/* 3. Забронирован - Забронирован до */}
						<StatusBookedSection
							isActive={currentStatus === "booked"}
							formData={formData}
							setFormData={setFormData}
							canEdit={isEditMode ? bookedStatusEditable : false}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							statusDate={statusDates.booked}
						/>

						{/* 4. Готов к выдаче - Отложен до, сумма предоплаты, дата внесения предоплаты */}
						<StatusReadySection
							isActive={currentStatus === "ready"}
							formData={formData}
							setFormData={setFormData}
							canEdit={isEditMode ? readyStatusEditable : false}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							statusDate={statusDates.ready}
						/>

						{/* 5. Оплачен - Дата внесения оплаты, сумма заказа */}
						<StatusPaidSection
							isActive={currentStatus === "paid"}
							formData={formData}
							setFormData={setFormData}
							canEdit={isEditMode ? paidStatusEditable : false}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							statusDate={statusDates.paid}
						/>

						{/* 6. Выполнен - Дата выполнения */}
						<StatusCompletedSection
							isActive={currentStatus === "completed"}
							formData={formData}
							setFormData={setFormData}
							canEdit={isEditMode ? completedStatusEditable : false}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							statusDate={statusDates.completed}
						/>

						{/* 7. Возврат - Все поля возврата */}
						<StatusReturnedSection
							isActive={currentStatus === "returned"}
							formData={formData}
							setFormData={setFormData}
							canEdit={isEditMode ? returnedStatusEditable : false}
							fieldErrors={fieldErrors}
							clearFieldError={clearFieldError}
							statusDate={statusDates.returned}
						/>

						{/* Комментарии */}
						<div className={`formField`}>
							<label>Комментарии</label>
							<div className={`commentsContainer`}>
								{comments.map((comment, index) => (
									<div key={index} className={`commentItem`}>
										<input type="text" value={comment} onChange={(e) => editComment(index, e.target.value)} placeholder="Комментарий" disabled={!isEditMode} />
										{isEditMode && (
											<button type="button" onClick={() => deleteComment(index)} className={`removeButton`}>
												Удалить
											</button>
										)}
									</div>
								))}

								{isEditMode && (
									<div className={`addCommentContainer`}>
										<input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Добавить комментарий" />
										<button type="button" onClick={addComment} className={`addButton`}>
											Добавить
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{!isEditMode && !isViewMode && (
					<div className={`noEditMessage`}>
						<p>У вас нет доступа к этому заказу или прав для его просмотра. Обратитесь к администратору.</p>
					</div>
				)}
			</div>

			{/* Фиксированные кнопки для изменений */}
			{isEditMode && hasChanges && (
				<div className={`fixedButtons`}>
					<div className="buttonsBlock">
						<button onClick={() => router.push("/admin/orders")} className={`secondaryButton`} disabled={isSaving}>
							Отмена
						</button>
						<button onClick={handleSave} className={`primaryButton`} disabled={isSaving || orderItems.length === 0}>
							{isSaving ? "Сохранение..." : isCreating ? "Создать заказ" : "Сохранить изменения"}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
