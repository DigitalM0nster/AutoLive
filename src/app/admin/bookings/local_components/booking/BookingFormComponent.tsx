"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Booking, CreateBookingRequest, BookingDepartment, User } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import SearchDropdownInput from "@/components/ui/searchDropdownInput/SearchDropdownInput";
import LinkedRelationCard from "@/components/admin/linkedRelationCard/LinkedRelationCard";
import CustomSelect from "@/components/ui/customSelect/CustomSelect";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";

type BookingFormComponentProps = {
	isCreating?: boolean;
	bookingId?: string | number;
	userRole?: string;
};

// Названия статусов заказа на русском для отображения в записи
function getOrderStatusText(status: string): string {
	const map: Record<string, string> = {
		created: "Новый",
		confirmed: "Подтверждён",
		booked: "Забронирован",
		ready: "Готов к выдаче",
		paid: "Оплачен",
		completed: "Выполнен",
		returned: "Возврат",
	};
	return map[status] || status;
}

type BookingOrderPick = {
	id: number;
	status: string;
	createdAt: string | Date;
	finalDeliveryDate: string | Date | null;
	orderTotal: number;
	contactPhone: string | null;
	contactName: string | null;
	client: { id: number; first_name: string | null; last_name: string | null } | null;
};

function sumOrderItemsForBooking(items: { product_price: number; quantity: number }[]): number {
	return Math.round(items.reduce((s, i) => s + i.product_price * i.quantity, 0) * 100) / 100;
}

function formatRubBooking(amount: number): string {
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount);
}

function formatOrderDateRu(d: string | Date | null | undefined): string {
	if (d == null) return "—";
	const s = d instanceof Date ? d.toISOString() : String(d);
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
	if (m) return `${m[3]}.${m[2]}.${m[1]}`;
	return s;
}

function mapApiOrderToBookingPick(o: {
	id: number;
	status: string;
	createdAt: string | Date;
	finalDeliveryDate?: string | Date | null;
	contactPhone?: string | null;
	contactName?: string | null;
	orderItems?: { product_price: number; quantity: number }[];
	client?: { id: number; first_name: string | null; last_name: string | null } | null;
}): BookingOrderPick {
	return {
		id: o.id,
		status: o.status,
		createdAt: o.createdAt,
		finalDeliveryDate: o.finalDeliveryDate ?? null,
		orderTotal: sumOrderItemsForBooking(o.orderItems || []),
		contactPhone: o.contactPhone ?? null,
		contactName: o.contactName ?? null,
		client: o.client ?? null,
	};
}

function clientShortName(c: { first_name: string | null; last_name: string | null }): string {
	return [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "—";
}

/** Строка контакта в карточке привязанного заказа: телефон + ссылка на ЛК клиента, если есть user */
function orderPickContactLine(order: BookingOrderPick) {
	return (
		<>
			Тел.: {order.contactPhone || "—"}
			{order.client?.id ? (
				<>
					{" · "}
					<Link href={`/admin/users/${order.client.id}`} className="itemLink" target="_blank">
						{clientShortName(order.client)}
					</Link>
				</>
			) : order.contactName ? (
				` · ${order.contactName}`
			) : null}
		</>
	);
}

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

function formatBookingDateTime(value?: string | Date | null): string {
	if (!value) return "—";
	const date = new Date(value);
	if (isNaN(date.getTime())) return "—";
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/** Панель поиска заказа для привязки к записи (аналог «Связь с записью» в заказе) */
function OrderLinkSearchBlock(props: {
	hintText?: string;
	orderLinkQuery: string;
	handleOrderLinkInput: (v: string) => void;
	orderLinkFocused: boolean;
	setOrderLinkFocused: (v: boolean) => void;
	orderLinkBlurTimeout: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
	handleOrderLinkBlur: () => void;
	orderLinkLoading: boolean;
	orderLinkResults: BookingOrderPick[];
	handleSelectOrderFromLink: (row: BookingOrderPick) => void;
	selectedOrderForLink: BookingOrderPick | null;
	clearOrderLinkSelection: () => void;
	onConfirmOrderPick: () => void;
	confirmOrderPickLabel: string;
	cancelOrderLinkPanel: () => void;
	isOrderLinkSaving: boolean;
}) {
	const {
		hintText = "Введите ID заказа — в списке заказы без другой записи или уже привязанные к этой.",
		orderLinkQuery,
		handleOrderLinkInput,
		orderLinkFocused,
		setOrderLinkFocused,
		orderLinkBlurTimeout,
		handleOrderLinkBlur,
		orderLinkLoading,
		orderLinkResults,
		handleSelectOrderFromLink,
		selectedOrderForLink,
		clearOrderLinkSelection,
		onConfirmOrderPick,
		confirmOrderPickLabel,
		cancelOrderLinkPanel,
		isOrderLinkSaving,
	} = props;

	return (
		<div className="column bookingLinkInlineSearch">
			<p className="bookingLinkHint">{hintText}</p>
			<div className="toLinkOrderSearchWrap">
				{selectedOrderForLink ? (
					<div className="bookingLinkSelectedCard">
						<div className="bookingLinkSelectedTitle">
							<span>Заказ #{selectedOrderForLink.id}</span>
							<span className="bookingLinkPickStatus">{getOrderStatusText(selectedOrderForLink.status)}</span>
						</div>
						<div className="bookingLinkSelectedMeta">
							Создан: {formatOrderDateRu(selectedOrderForLink.createdAt)}
							{selectedOrderForLink.finalDeliveryDate ? ` · доставка: ${formatOrderDateRu(selectedOrderForLink.finalDeliveryDate)}` : ""}
							{" · "}
							{formatRubBooking(selectedOrderForLink.orderTotal)}
						</div>
						<div className="bookingLinkSelectedMeta">
							Тел.: {selectedOrderForLink.contactPhone || "—"}
							{selectedOrderForLink.client
								? ` · ${clientShortName(selectedOrderForLink.client)}`
								: selectedOrderForLink.contactName
									? ` · ${selectedOrderForLink.contactName}`
									: ""}
						</div>
						<button type="button" onClick={clearOrderLinkSelection} className="ghostButton">
							Другой заказ
						</button>
					</div>
				) : (
					<div className={`searchInput ${orderLinkFocused && orderLinkQuery.trim() ? "searching" : ""}`}>
						<SearchDropdownInput
							value={orderLinkQuery}
							onChange={handleOrderLinkInput}
							onFocus={() => {
								if (orderLinkBlurTimeout.current) clearTimeout(orderLinkBlurTimeout.current);
								setOrderLinkFocused(true);
							}}
							onBlur={handleOrderLinkBlur}
							placeholder="ID заказа"
							inputClassName="searchInput"
							isActiveSearch={orderLinkFocused && orderLinkQuery.trim().length >= 1}
							showDropdown={orderLinkFocused && Boolean(orderLinkQuery.trim())}
						>
							{orderLinkFocused && orderLinkLoading && orderLinkQuery.trim() && (
								<div className="searchResults bookingLinkDropdown loading">
									<Loading />
								</div>
							)}
							{orderLinkFocused && orderLinkQuery.trim() && !orderLinkLoading && (
								<div className="searchResults bookingLinkDropdown">
									{orderLinkResults.length > 0 ? (
										orderLinkResults.map((row) => (
											<div
												key={row.id}
												className="searchResultItem bookingLinkPick"
												onMouseDown={() => handleSelectOrderFromLink(row)}
											>
												<div className="bookingLinkPickTop">
													<span className="bookingLinkPickId">#{row.id}</span>
													<span className="bookingLinkPickWhen">{getOrderStatusText(row.status)}</span>
													<span className="bookingLinkPickStatus">{formatOrderDateRu(row.createdAt)}</span>
												</div>
												<div className="bookingLinkPickRow">{formatRubBooking(row.orderTotal)}</div>
											</div>
										))
									) : (
										<div className="bookingLinkPickEmpty">Нет подходящих заказов с таким номером</div>
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
					onClick={onConfirmOrderPick}
					className="primaryButton"
					disabled={isOrderLinkSaving || !selectedOrderForLink}
				>
					{isOrderLinkSaving ? "Сохранение…" : confirmOrderPickLabel}
				</button>
				<button type="button" onClick={cancelOrderLinkPanel} className="secondaryButton" disabled={isOrderLinkSaving}>
					Отмена
				</button>
			</div>
		</div>
	);
}

export default function BookingFormComponent({ isCreating = true, bookingId, userRole }: BookingFormComponentProps) {
	const router = useRouter();
	const { user } = useAuthStore();
	const [loading, setLoading] = useState(!isCreating);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false); // Состояние для отслеживания изменений
	/** Полная запись с сервера — для шапки (краткая сводка) */
	const [bookingRecord, setBookingRecord] = useState<Booking | null>(null);

	// Состояние формы
	const [formData, setFormData] = useState<CreateBookingRequest>({
		scheduledDate: "",
		scheduledTime: "",
		contactPhone: "", // Телефон для связи (обязательное поле)
		bookingDepartmentId: 0,
		clientId: null,
		managerId: null,
		notes: "",
		// Имя клиента (только для незарегистрированного клиента)
		clientName: "",
	});

	// Начальные данные для сравнения (при редактировании)
	const [initialFormData, setInitialFormData] = useState<CreateBookingRequest>({
		scheduledDate: "",
		scheduledTime: "",
		contactPhone: "", // Телефон для связи (обязательное поле)
		bookingDepartmentId: 0,
		clientId: null,
		managerId: null,
		notes: "",
		// Имя клиента (только для незарегистрированного клиента)
		clientName: "",
	});

	// Данные для селектов
	const [bookingDepartments, setBookingDepartments] = useState<BookingDepartment[]>([]);

	// Состояние для поиска клиента
	const [clientSearch, setClientSearch] = useState("");
	const [clientSearchResults, setClientSearchResults] = useState<User[]>([]);
	const [isSearchingClients, setIsSearchingClients] = useState(false);
	const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
	const [selectedClient, setSelectedClient] = useState<User | null>(null);
	const [initialSelectedClient, setInitialSelectedClient] = useState<User | null>(null);
	const clientBlurTimeout = useRef<NodeJS.Timeout | null>(null);

	// Состояние для поиска менеджера
	const [managerSearch, setManagerSearch] = useState("");
	const [managerSearchResults, setManagerSearchResults] = useState<User[]>([]);
	const [isSearchingManagers, setIsSearchingManagers] = useState(false);
	const [isManagerSearchFocused, setIsManagerSearchFocused] = useState(false);
	const [selectedManager, setSelectedManager] = useState<User | null>(null);
	const [initialSelectedManager, setInitialSelectedManager] = useState<User | null>(null);
	const managerBlurTimeout = useRef<NodeJS.Timeout | null>(null);

	// Связь с заказом (шапка + сохранение)
	const [selectedOrder, setSelectedOrder] = useState<BookingOrderPick | null>(null);
	const [initialSelectedOrder, setInitialSelectedOrder] = useState<BookingOrderPick | null>(null);
	const [orderLinkPanelOpen, setOrderLinkPanelOpen] = useState(false);
	const [orderLinkQuery, setOrderLinkQuery] = useState("");
	const [orderLinkFocused, setOrderLinkFocused] = useState(false);
	const [orderLinkLoading, setOrderLinkLoading] = useState(false);
	const [orderLinkResults, setOrderLinkResults] = useState<BookingOrderPick[]>([]);
	const [selectedOrderForLink, setSelectedOrderForLink] = useState<BookingOrderPick | null>(null);
	const [isOrderLinkSaving, setIsOrderLinkSaving] = useState(false);
	const orderLinkBlurTimeout = useRef<NodeJS.Timeout | null>(null);

	const canManageOrderLink = userRole !== "manager";

	// Загрузка данных записи (если редактирование)
	useEffect(() => {
		if (!isCreating && bookingId) {
			const fetchBooking = async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/bookings/${bookingId}`, { credentials: "include" });
					if (!res.ok) {
						throw new Error("Ошибка загрузки записи");
					}
					const data = await res.json();
					if (data.booking) {
						const booking = data.booking as Booking;
						setBookingRecord(booking);

						// Извлекаем имя незарегистрированного клиента из notes
						let guestName = "";
						let cleanNotes = booking.notes || "";

						// Ищем данные незарегистрированного клиента в notes
						if (booking.notes) {
							const guestInfoMatch = booking.notes.match(/--- Данные незарегистрированного клиента ---\s*([\s\S]*?)\s*---/);
							if (guestInfoMatch) {
								const guestInfo = guestInfoMatch[1];
								const nameMatch = guestInfo.match(/Имя:\s*(.+)/);

								if (nameMatch) guestName = nameMatch[1].trim();

								// Удаляем блок с данными клиента из notes для отображения в поле примечаний
								cleanNotes = booking.notes.replace(/--- Данные незарегистрированного клиента ---\s*[\s\S]*?\s*---\s*/g, "").trim();
							}
						}

						const loadedData: CreateBookingRequest = {
							scheduledDate: typeof booking.scheduledDate === "string" ? booking.scheduledDate : booking.scheduledDate.toISOString().split("T")[0],
							scheduledTime: booking.scheduledTime,
							contactPhone: booking.contactPhone, // Телефон для связи из базы данных
							bookingDepartmentId: booking.bookingDepartmentId,
							clientId: booking.clientId,
							managerId: booking.managerId,
							notes: cleanNotes,
							// Имя клиента (только для незарегистрированного)
							clientName: guestName,
						};
						setFormData(loadedData);
						setInitialFormData(loadedData); // Сохраняем начальные данные для сравнения

						// Загружаем данные клиента, если он указан
						if (booking.clientId && booking.client) {
							const client = booking.client as User;
							setSelectedClient(client);
							setInitialSelectedClient(client);
						}

						// Загружаем данные менеджера, если он указан
						if (booking.managerId && booking.manager) {
							const manager = booking.manager as User;
							setSelectedManager(manager);
							setInitialSelectedManager(manager);
						}

						// Загружаем данные заказа, если он указан
						if (booking.orderId && booking.order) {
							const mapped = mapApiOrderToBookingPick(booking.order as any);
							setSelectedOrder(mapped);
							setInitialSelectedOrder(mapped);
						}
					}
				} catch (err) {
					console.error("Ошибка загрузки записи:", err);
					showErrorToast("Ошибка загрузки записи");
					setError("Ошибка загрузки записи");
				} finally {
					setLoading(false);
				}
			};

			fetchBooking();
		}
	}, [isCreating, bookingId]);

	// Очистка таймера при размонтировании
	useEffect(() => {
		return () => {
			if (clientBlurTimeout.current) {
				clearTimeout(clientBlurTimeout.current);
			}
			if (orderLinkBlurTimeout.current) {
				clearTimeout(orderLinkBlurTimeout.current);
			}
			if (managerBlurTimeout.current) {
				clearTimeout(managerBlurTimeout.current);
			}
		};
	}, []);

	const openOrderLinkPanel = () => {
		if (!canManageOrderLink) return;
		setOrderLinkPanelOpen(true);
		setOrderLinkQuery("");
		setOrderLinkResults([]);
		setSelectedOrderForLink(null);
		setOrderLinkFocused(false);
	};

	const cancelOrderLinkPanel = () => {
		setOrderLinkPanelOpen(false);
		setOrderLinkQuery("");
		setOrderLinkResults([]);
		setSelectedOrderForLink(null);
		setOrderLinkFocused(false);
	};

	const clearOrderLinkSelection = () => {
		setSelectedOrderForLink(null);
		setOrderLinkQuery("");
		setOrderLinkResults([]);
	};

	const handleOrderLinkBlur = () => {
		if (orderLinkBlurTimeout.current) clearTimeout(orderLinkBlurTimeout.current);
		orderLinkBlurTimeout.current = setTimeout(() => setOrderLinkFocused(false), 120);
	};

	const runOrderLinkSearch = async (value: string) => {
		const q = value.trim();
		if (q.length < 1 || !/^\d/.test(q)) {
			setOrderLinkResults([]);
			return;
		}
		setOrderLinkLoading(true);
		try {
			const params = new URLSearchParams();
			params.set("q", q);
			if (!isCreating && bookingId != null && String(bookingId).trim() !== "") {
				params.set("forBookingId", String(bookingId));
			}
			const res = await fetch(`/api/orders/search-for-booking?${params.toString()}`, { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				const list = Array.isArray(data.orders) ? data.orders : [];
				setOrderLinkResults(list.map((o: any) => mapApiOrderToBookingPick(o)));
			} else {
				setOrderLinkResults([]);
			}
		} catch (e) {
			console.error("runOrderLinkSearch:", e);
			setOrderLinkResults([]);
		} finally {
			setOrderLinkLoading(false);
		}
	};

	const handleOrderLinkInput = (v: string) => {
		setOrderLinkQuery(v);
		if (v.trim() !== "") {
			void runOrderLinkSearch(v);
		} else {
			setOrderLinkResults([]);
		}
	};

	const handleSelectOrderFromLink = (row: BookingOrderPick) => {
		setSelectedOrderForLink(row);
	};

	/** При создании записи: выбранный заказ попадёт в тело POST вместе с формой */
	const applyOrderDraftOnCreate = () => {
		if (!selectedOrderForLink) return;
		setSelectedOrder(selectedOrderForLink);
		cancelOrderLinkPanel();
	};

	const saveOrderLinkToBooking = async () => {
		if (!selectedOrderForLink || !bookingId || isCreating) return;
		setIsOrderLinkSaving(true);
		try {
			const res = await fetch(`/api/bookings/${bookingId}`, {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderId: selectedOrderForLink.id }),
			});
			const raw = await res.text();
			let data: { error?: string; booking?: Booking } | null = null;
			try {
				data = raw ? JSON.parse(raw) : null;
			} catch {
				data = null;
			}
			if (!res.ok) {
				throw new Error(data?.error || "Не удалось сохранить связь с заказом");
			}
			showSuccessToast("Запись связана с заказом");
			cancelOrderLinkPanel();
			if (data?.booking) {
				setBookingRecord(data.booking);
				if (data.booking.order) {
					const mapped = mapApiOrderToBookingPick(data.booking.order as any);
					setSelectedOrder(mapped);
					setInitialSelectedOrder(mapped);
				}
			}
			setHasChanges(false);
		} catch (e) {
			showErrorToast(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setIsOrderLinkSaving(false);
		}
	};

	const unlinkOrderFromBooking = async () => {
		if (!bookingId || isCreating) return;
		if (!window.confirm("Отвязать заказ от этой записи? Сам заказ останется в системе.")) return;
		setIsOrderLinkSaving(true);
		try {
			const res = await fetch(`/api/bookings/${bookingId}`, {
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderId: null }),
			});
			const raw = await res.text();
			let data: { error?: string; booking?: Booking } | null = null;
			try {
				data = raw ? JSON.parse(raw) : null;
			} catch {
				data = null;
			}
			if (!res.ok) {
				throw new Error(data?.error || "Не удалось отвязать заказ");
			}
			showSuccessToast("Связь с заказом снята");
			cancelOrderLinkPanel();
			if (data?.booking) {
				setBookingRecord(data.booking);
			}
			setSelectedOrder(null);
			setInitialSelectedOrder(null);
			setHasChanges(false);
		} catch (e) {
			showErrorToast(e instanceof Error ? e.message : "Ошибка");
		} finally {
			setIsOrderLinkSaving(false);
		}
	};

	// Загрузка данных для селектов (не зависит от user — иначе лишние запросы при смене ссылки на user в сторе)
	useEffect(() => {
		const fetchSelectData = async () => {
			try {
				// Загружаем отделы для записей
				const departmentsRes = await fetch("/api/booking-departments", { credentials: "include" });
				if (departmentsRes.ok) {
					const departmentsData = await departmentsRes.json();
					setBookingDepartments(Array.isArray(departmentsData) ? departmentsData : []);
				}

				// Менеджеры теперь загружаются через поиск
			} catch (error) {
				console.error("Ошибка загрузки данных для селектов:", error);
			}
		};

		fetchSelectData();
	}, []);

	// Автоматическое назначение менеджера при создании записи, если пользователь - менеджер
	useEffect(() => {
		if (isCreating && user?.role === "manager" && user?.id && !formData.managerId) {
			setFormData((prev) => ({ ...prev, managerId: user.id }));
		}
	}, [isCreating, user]);

	// Отслеживание изменений формы
	useEffect(() => {
		if (isCreating) {
			// При создании кнопки всегда видны (нет начальных данных для сравнения)
			setHasChanges(true);
			return;
		}

		// При редактировании сравниваем текущие данные с начальными
		const hasFormChanges =
			formData.scheduledDate !== initialFormData.scheduledDate ||
			formData.scheduledTime !== initialFormData.scheduledTime ||
			formData.contactPhone !== initialFormData.contactPhone ||
			formData.bookingDepartmentId !== initialFormData.bookingDepartmentId ||
			formData.clientId !== initialFormData.clientId ||
			formData.managerId !== initialFormData.managerId ||
			formData.notes !== initialFormData.notes ||
			formData.clientName !== initialFormData.clientName ||
			(selectedOrder?.id || null) !== (initialSelectedOrder?.id || null) ||
			(selectedManager?.id || null) !== (initialSelectedManager?.id || null);

		setHasChanges(hasFormChanges);
	}, [formData, initialFormData, isCreating, selectedOrder, initialSelectedOrder, selectedManager, initialSelectedManager]);

	// Опции для селектов (стабильная ссылка, чтобы не дёргать лишние обновления в CustomSelect)
	const departmentOptions = useMemo(
		() =>
			bookingDepartments.map((dept) => ({
				value: dept.id.toString(),
				label: dept.name || `Адрес #${dept.id}`,
			})),
		[bookingDepartments],
	);

	// Функции для поиска клиента
	const handleClientSearch = async (query: string) => {
		if (query.length < 2) {
			setClientSearchResults([]);
			return;
		}

		try {
			setIsSearchingClients(true);
			const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&role=client&limit=10`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				setClientSearchResults(data.users || []);
			}
		} catch (error) {
			console.error("Ошибка поиска клиентов:", error);
		} finally {
			setIsSearchingClients(false);
		}
	};

	const handleClientSelect = (client: User) => {
		setSelectedClient(client);
		// При выборе клиента заполняем телефон из данных клиента, очищаем имя
		setFormData({ ...formData, clientId: client.id, contactPhone: client.phone || "", clientName: "" });
		setClientSearch("");
		setClientSearchResults([]);
		setIsClientSearchFocused(false);
	};

	const handleClientBlur = () => {
		if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
		clientBlurTimeout.current = setTimeout(() => setIsClientSearchFocused(false), 120);
	};

	const handleClientManualInput = (value: string) => {
		setClientSearch(value);
		if (value.length >= 2) {
			handleClientSearch(value);
		} else {
			setClientSearchResults([]);
		}
	};

	const handleClientClear = () => {
		setSelectedClient(null);
		// При удалении клиента очищаем имя, но оставляем телефон (он может быть заполнен)
		setFormData({ ...formData, clientId: null, clientName: "" });
		setClientSearch("");
		setClientSearchResults([]);
	};

	// Функции для поиска менеджера
	const handleManagerSearch = async (query: string) => {
		if (query.length < 2) {
			setManagerSearchResults([]);
			return;
		}

		try {
			setIsSearchingManagers(true);
			// Поиск среди менеджеров, админов и суперадминов
			const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&role=manager&role=admin&role=superadmin&limit=10&allUsers=true`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				let filteredManagers: User[] = data.users || [];

				// Фильтруем в зависимости от роли пользователя
				if (user?.role === "admin" && user?.departmentId) {
					// Админ: только менеджеры своего отдела
					filteredManagers = filteredManagers.filter((candidate: User) => {
						const candidateDepartmentId = candidate.department?.id ?? candidate.departmentId ?? null;
						return candidateDepartmentId === user.departmentId;
					});
				}
				// Суперадмин видит всех

				setManagerSearchResults(filteredManagers);
			}
		} catch (error) {
			console.error("Ошибка поиска менеджеров:", error);
		} finally {
			setIsSearchingManagers(false);
		}
	};

	const handleManagerSelect = (manager: User) => {
		setSelectedManager(manager);
		setFormData({ ...formData, managerId: manager.id });
		setManagerSearch("");
		setManagerSearchResults([]);
		setIsManagerSearchFocused(false);
	};

	const handleManagerBlur = () => {
		if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
		managerBlurTimeout.current = setTimeout(() => setIsManagerSearchFocused(false), 120);
	};

	const handleManagerManualInput = (value: string) => {
		setManagerSearch(value);
		if (value.length >= 2) {
			handleManagerSearch(value);
		} else {
			setManagerSearchResults([]);
		}
	};

	const handleManagerClear = () => {
		setSelectedManager(null);
		setFormData({ ...formData, managerId: null });
		setManagerSearch("");
		setManagerSearchResults([]);
	};

	// Обработчик "забрать заявку" для менеджера
	const handleTakeBooking = async () => {
		if (!user?.id || user.role !== "manager") {
			return;
		}

		setSaving(true);
		try {
			const response = await fetch(`/api/bookings/${bookingId}`, {
				method: "PUT",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					managerId: user.id,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при взятии заявки");
			}

			showSuccessToast("Заявка успешно взята в работу");

			// Обновляем данные формы
			setFormData((prev) => ({ ...prev, managerId: user.id }));
			setInitialFormData((prev) => ({ ...prev, managerId: user.id }));
			setHasChanges(false);

			// Перезагружаем страницу для обновления данных
			router.refresh();
		} catch (err: any) {
			console.error("Ошибка при взятии заявки:", err);
			showErrorToast(err.message || "Ошибка при взятии заявки");
		} finally {
			setSaving(false);
		}
	};

	// Обработчик сохранения
	const handleSave = async () => {
		// Валидация
		if (!formData.scheduledDate) {
			showErrorToast("Укажите дату записи");
			return;
		}

		if (!formData.scheduledTime) {
			showErrorToast("Укажите время записи");
			return;
		}

		if (!formData.bookingDepartmentId || formData.bookingDepartmentId === 0) {
			showErrorToast("Выберите отдел для записи");
			return;
		}

		// Телефон для связи обязателен всегда
		if (!formData.contactPhone || formData.contactPhone.trim() === "") {
			showErrorToast("Укажите телефон для связи");
			return;
		}

		// Если пользователь - менеджер, автоматически устанавливаем его как менеджера
		if (user?.role === "manager" && user?.id) {
			formData.managerId = user.id;
		}

		setSaving(true);
		try {
			// Подготавливаем данные для отправки
			const requestData: CreateBookingRequest = {
				scheduledDate: formData.scheduledDate,
				scheduledTime: formData.scheduledTime,
				contactPhone: formData.contactPhone.trim(), // Телефон для связи (обязательное поле)
				bookingDepartmentId: formData.bookingDepartmentId,
				clientId: formData.clientId === null || formData.clientId === 0 ? null : formData.clientId,
				managerId: formData.managerId === null || formData.managerId === 0 ? null : formData.managerId,
				notes: formData.notes || undefined,
				// Имя клиента (отправляем только если клиент не выбран)
				clientName: !formData.clientId && formData.clientName ? formData.clientName : undefined,
				orderId: canManageOrderLink ? (selectedOrder?.id ?? null) : undefined,
			};

			let response;
			if (isCreating) {
				// Создание новой записи
				response = await fetch("/api/bookings", {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestData),
				});
			} else {
				// Обновление существующей записи
				response = await fetch(`/api/bookings/${bookingId}`, {
					method: "PUT",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestData),
				});
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при сохранении записи");
			}

			const data = await response.json();
			showSuccessToast(isCreating ? "Запись успешно создана" : "Запись успешно обновлена");

			// Синхронизируем выбранный заказ с ответом API
			if (data.booking?.order) {
				const mapped = mapApiOrderToBookingPick(data.booking.order as any);
				setSelectedOrder(mapped);
				setInitialSelectedOrder(mapped);
			} else if (data.booking) {
				setSelectedOrder(null);
				setInitialSelectedOrder(null);
			}
			if (data.booking) {
				setBookingRecord(data.booking as Booking);
			}

			// Сбрасываем состояние изменений
			setHasChanges(false);

			if (isCreating && data.booking) {
				// Перенаправляем на страницу созданной записи
				router.push(`/admin/bookings/${data.booking.id}`);
			} else {
				// Перенаправляем на список записей
				router.push("/admin/bookings");
			}
		} catch (err: any) {
			console.error("Ошибка при сохранении записи:", err);
			showErrorToast(err.message || "Ошибка при сохранении записи");
		} finally {
			setSaving(false);
		}
	};

	// Обработчик отмены
	const handleCancel = () => {
		if (!isCreating && initialFormData) {
			// Восстанавливаем исходные данные
			setFormData({
				scheduledDate: initialFormData.scheduledDate,
				scheduledTime: initialFormData.scheduledTime,
				contactPhone: initialFormData.contactPhone || "",
				bookingDepartmentId: initialFormData.bookingDepartmentId,
				clientId: initialFormData.clientId,
				managerId: initialFormData.managerId,
				notes: initialFormData.notes || "",
				clientName: initialFormData.clientName || "",
			});
			// Восстанавливаем выбранного клиента
			setSelectedClient(initialSelectedClient);
			setClientSearch("");
			setClientSearchResults([]);
			// Восстанавливаем выбранного менеджера
			setSelectedManager(initialSelectedManager);
			setManagerSearch("");
			setManagerSearchResults([]);
			// Восстанавливаем выбранный заказ
			setSelectedOrder(initialSelectedOrder);
			cancelOrderLinkPanel();
			setHasChanges(false);
		} else {
			// При создании просто перенаправляем
			router.push("/admin/bookings");
		}
	};

	if (loading) {
		return <Loading />;
	}

	return (
		<>
			<div className={`formContainer`}>
				<div className={`formHeader`}>
					<h2>{isCreating ? "Создание записи" : `Запись #${bookingId}`}</h2>
					{isCreating ? (
						<div className="orderMainInfo">
							<div className="orderInfoFields">
								<div className="infoRow">
									<div className="infoField column">
										<p className="toLinkOrderHint">
											После сохранения здесь отобразится краткая сводка по записи. Заказ можно указать сразу (необязательно) или привязать позже.
										</p>
									</div>
								</div>
								{canManageOrderLink && (
									<div className="infoRow">
										<div className={`infoField infoFieldBookingLink column`}>
											<span className="infoLabel">Связь с заказом</span>
											<div className="infoValue column">
												{!orderLinkPanelOpen ? (
													selectedOrder ? (
														<LinkedRelationCard
															title={
																<>
																	<Link href={`/admin/orders/${selectedOrder.id}`} className="itemLink" target="_blank">
																		Заказ #{selectedOrder.id}
																	</Link>
																	<span className="bookingLinkPickStatus">{getOrderStatusText(selectedOrder.status)}</span>
																</>
															}
															metaLines={[
																{
																	label: "Сумма и даты:",
																	value: (
																		<>
																			{formatRubBooking(selectedOrder.orderTotal)}
																			{" · создан: "}
																			{formatOrderDateRu(selectedOrder.createdAt)}
																			{selectedOrder.finalDeliveryDate
																				? ` · доставка: ${formatOrderDateRu(selectedOrder.finalDeliveryDate)}`
																				: ""}
																		</>
																	),
																},
																{
																	label: "Контакт:",
																	value: orderPickContactLine(selectedOrder),
																},
															]}
															actions={
																<>
																	<button type="button" className="primaryButton" onClick={openOrderLinkPanel}>
																		Другой заказ
																	</button>
																	<button
																		type="button"
																		className="secondaryButton"
																		onClick={() => {
																			setSelectedOrder(null);
																		}}
																	>
																		Убрать
																	</button>
																</>
															}
														/>
													) : (
														<>
															<span className="toLinkOrderHint">Не выбран.</span>
															<button type="button" onClick={openOrderLinkPanel} className="primaryButton">
																Указать заказ
															</button>
														</>
													)
												) : (
													<>
														{selectedOrder ? (
															<LinkedRelationCard
																title={
																	<>
																		<Link href={`/admin/orders/${selectedOrder.id}`} className="itemLink" target="_blank">
																			Заказ #{selectedOrder.id}
																		</Link>
																		<span className="bookingLinkPickStatus">{getOrderStatusText(selectedOrder.status)}</span>
																	</>
																}
																metaLines={[
																	{
																		label: "Сумма и даты:",
																		value: (
																			<>
																				{formatRubBooking(selectedOrder.orderTotal)}
																				{" · создан: "}
																				{formatOrderDateRu(selectedOrder.createdAt)}
																				{selectedOrder.finalDeliveryDate
																					? ` · доставка: ${formatOrderDateRu(selectedOrder.finalDeliveryDate)}`
																					: ""}
																			</>
																		),
																	},
																	{
																		label: "Контакт:",
																		value: orderPickContactLine(selectedOrder),
																	},
																]}
															/>
														) : null}
														<OrderLinkSearchBlock
															hintText={
																selectedOrder
																	? "Укажите ID другого заказа — в списке заказы без другой записи или уже привязанные к этой."
																	: undefined
															}
															orderLinkQuery={orderLinkQuery}
															handleOrderLinkInput={handleOrderLinkInput}
															orderLinkFocused={orderLinkFocused}
															setOrderLinkFocused={setOrderLinkFocused}
															orderLinkBlurTimeout={orderLinkBlurTimeout}
															handleOrderLinkBlur={handleOrderLinkBlur}
															orderLinkLoading={orderLinkLoading}
															orderLinkResults={orderLinkResults}
															handleSelectOrderFromLink={handleSelectOrderFromLink}
															selectedOrderForLink={selectedOrderForLink}
															clearOrderLinkSelection={clearOrderLinkSelection}
															onConfirmOrderPick={applyOrderDraftOnCreate}
															confirmOrderPickLabel="Указать заказ"
															cancelOrderLinkPanel={cancelOrderLinkPanel}
															isOrderLinkSaving={false}
														/>
													</>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						bookingRecord && (
							<div className="orderMainInfo">
								<div className="orderInfoFields">
									<div className="infoRow">
										<div className="infoField">
											<span className="infoLabel">Дата и время записи:</span>
											<span className="infoValue">
												{formatOrderDateRu(bookingRecord.scheduledDate)} {bookingRecord.scheduledTime}
											</span>
										</div>
										<div className="infoField">
											<span className="infoLabel">Статус:</span>
											<span className="infoValue">{bookingStatusLabelRu(String(bookingRecord.status))}</span>
										</div>
										<div className="infoField">
											<span className="infoLabel">Создана:</span>
											<span className="infoValue">{formatBookingDateTime(bookingRecord.createdAt)}</span>
										</div>
									</div>
									<div className="infoRow">
										<div className="infoField">
											<span className="infoLabel">Отдел (адрес):</span>
											<span className="infoValue">
												{bookingRecord.bookingDepartment
													? [bookingRecord.bookingDepartment.name, bookingRecord.bookingDepartment.address].filter(Boolean).join(" — ")
													: "—"}
											</span>
										</div>
										<div className="infoField">
											<span className="infoLabel">Клиент:</span>
											<span className="infoValue">
												{(() => {
													const c = selectedClient || bookingRecord.client;
													if (!c) return "—";
													const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.phone;
													return (
														<Link href={`/admin/users/${c.id}`} className="itemLink" target="_blank">
															{name}
														</Link>
													);
												})()}
											</span>
										</div>
										<div className="infoField">
											<span className="infoLabel">Ответственный:</span>
											<span className="infoValue">
												{(() => {
													const m = selectedManager || bookingRecord.manager;
													if (!m) return "—";
													const name = [m.first_name, m.last_name].filter(Boolean).join(" ").trim() || "—";
													return (
														<Link href={`/admin/users/${m.id}`} className="itemLink" target="_blank">
															{name}
														</Link>
													);
												})()}
											</span>
										</div>
									</div>
									<div className="infoRow">
										<div className="infoField">
											<span className="infoLabel">Телефон для связи:</span>
											<span className="infoValue">{bookingRecord.contactPhone || "—"}</span>
										</div>
									</div>
									<div className="infoRow">
										<div className={`infoField infoFieldBookingLink column`} id="bookingLinkedOrder">
											<span className="infoLabel">Связь с заказом</span>
											<div className="infoValue column">
												{!selectedOrder ? (
													<div className="column">
														{!canManageOrderLink ? (
															<span className="toLinkOrderHint">Заказ не привязан.</span>
														) : !orderLinkPanelOpen ? (
															<>
																<span className="toLinkOrderHint">Заказ не привязан.</span>
																<button
																	type="button"
																	onClick={openOrderLinkPanel}
																	className="primaryButton"
																	disabled={isOrderLinkSaving}
																>
																	Связать с заказом
																</button>
															</>
														) : (
															<OrderLinkSearchBlock
																orderLinkQuery={orderLinkQuery}
																handleOrderLinkInput={handleOrderLinkInput}
																orderLinkFocused={orderLinkFocused}
																setOrderLinkFocused={setOrderLinkFocused}
																orderLinkBlurTimeout={orderLinkBlurTimeout}
																handleOrderLinkBlur={handleOrderLinkBlur}
																orderLinkLoading={orderLinkLoading}
																orderLinkResults={orderLinkResults}
																handleSelectOrderFromLink={handleSelectOrderFromLink}
																selectedOrderForLink={selectedOrderForLink}
																clearOrderLinkSelection={clearOrderLinkSelection}
																onConfirmOrderPick={saveOrderLinkToBooking}
																confirmOrderPickLabel="Сохранить связь"
																cancelOrderLinkPanel={cancelOrderLinkPanel}
																isOrderLinkSaving={isOrderLinkSaving}
															/>
														)}
													</div>
												) : (
													<div className="column">
														<LinkedRelationCard
															title={
																<>
																	<Link href={`/admin/orders/${selectedOrder.id}`} className="itemLink" target="_blank">
																		Заказ #{selectedOrder.id}
																	</Link>
																	<span className="bookingLinkPickStatus">{getOrderStatusText(selectedOrder.status)}</span>
																</>
															}
															metaLines={[
																{
																	label: "Сумма и даты:",
																	value: (
																		<>
																			{formatRubBooking(selectedOrder.orderTotal)}
																			{" · создан: "}
																			{formatOrderDateRu(selectedOrder.createdAt)}
																			{selectedOrder.finalDeliveryDate
																				? ` · доставка: ${formatOrderDateRu(selectedOrder.finalDeliveryDate)}`
																				: ""}
																		</>
																	),
																},
																{
																	label: "Контакт:",
																	value: orderPickContactLine(selectedOrder),
																},
															]}
															actions={
																canManageOrderLink && !orderLinkPanelOpen ? (
																	<>
																		<button
																			type="button"
																			className="primaryButton"
																			onClick={openOrderLinkPanel}
																			disabled={isOrderLinkSaving}
																		>
																			Сменить заказ
																		</button>
																		<button
																			type="button"
																			className="secondaryButton"
																			onClick={unlinkOrderFromBooking}
																			disabled={isOrderLinkSaving}
																		>
																			Отвязать
																		</button>
																	</>
																) : null
															}
														/>
														{orderLinkPanelOpen && canManageOrderLink ? (
															<OrderLinkSearchBlock
																hintText="Укажите ID другого заказа — в списке заказы без другой записи или уже привязанные к этой."
																orderLinkQuery={orderLinkQuery}
																handleOrderLinkInput={handleOrderLinkInput}
																orderLinkFocused={orderLinkFocused}
																setOrderLinkFocused={setOrderLinkFocused}
																orderLinkBlurTimeout={orderLinkBlurTimeout}
																handleOrderLinkBlur={handleOrderLinkBlur}
																orderLinkLoading={orderLinkLoading}
																orderLinkResults={orderLinkResults}
																handleSelectOrderFromLink={handleSelectOrderFromLink}
																selectedOrderForLink={selectedOrderForLink}
																clearOrderLinkSelection={clearOrderLinkSelection}
																onConfirmOrderPick={saveOrderLinkToBooking}
																confirmOrderPickLabel="Сохранить связь"
																cancelOrderLinkPanel={cancelOrderLinkPanel}
																isOrderLinkSaving={isOrderLinkSaving}
															/>
														) : null}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						)
					)}
				</div>
				<div className="formFields">
				{/* Дата записи */}
				<div className="formField">
					<DatePickerField
						label="Дата записи *"
						value={formData.scheduledDate}
						onChange={(date: string) => {
							setFormData({ ...formData, scheduledDate: date });
						}}
						placeholder="Выберите дату"
					/>
				</div>

				{/* Время записи */}
				<div className="formField">
					<label htmlFor="scheduledTime">Время записи *</label>
					<input type="time" id="scheduledTime" value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} required />
				</div>

				{/* Отдел для записи */}
				<div className="formField">
					<label htmlFor="bookingDepartmentId">Отдел для записи *</label>
					<CustomSelect
						options={departmentOptions}
						value={formData.bookingDepartmentId ? formData.bookingDepartmentId.toString() : ""}
						onChange={(value) => setFormData({ ...formData, bookingDepartmentId: value ? parseInt(value, 10) : 0 })}
						placeholder="Выберите отдел"
					/>
				</div>

				{/* Клиент */}
				<div className="formField">
					<label htmlFor="clientSearch">Клиент</label>
					{selectedClient ? (
						<div className="selectedClient">
							<span>
								<Link href={`/admin/users/${selectedClient.id}`} className="itemLink" target="_blank">
									{`${selectedClient.first_name || ""} ${selectedClient.last_name || ""} ${selectedClient.middle_name || ""}`.trim() || selectedClient.phone} (
									{selectedClient.phone})
								</Link>
							</span>
							<button type="button" onClick={handleClientClear} className="removeButton">
								Убрать клиента ×
							</button>
						</div>
					) : (
						<SearchDropdownInput
							id="clientSearch"
							value={clientSearch}
							onChange={handleClientManualInput}
							onFocus={() => {
								if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
								setIsClientSearchFocused(true);
							}}
							onBlur={handleClientBlur}
							placeholder="Поиск клиента по ФИО, ID или телефону"
							isActiveSearch={isClientSearchFocused && clientSearch.length >= 2}
							showDropdown={isClientSearchFocused && Boolean(clientSearch)}
						>
							{isClientSearchFocused && isSearchingClients && clientSearch && (
								<div className="searchResults loading">
									<Loading />
								</div>
							)}
							{isClientSearchFocused && clientSearch && !isSearchingClients && (
								<div className="searchResults">
									{clientSearchResults.length > 0 ? (
										clientSearchResults.map((client) => {
											const fullName = `${client.first_name || ""} ${client.last_name || ""} ${client.middle_name || ""}`.trim();
											return (
												<div key={client.id} className="searchResultItem" onMouseDown={() => handleClientSelect(client)}>
													{fullName || client.phone} - {client.phone} {client.id ? `(ID: ${client.id})` : ""}
												</div>
											);
										})
									) : (
										<div className="searchResultItem">Нет результатов</div>
									)}
								</div>
							)}
						</SearchDropdownInput>
					)}
				</div>

				{/* Телефон для связи (всегда видимое обязательное поле) */}
				<div className="formField">
					<label htmlFor="contactPhone">Телефон для связи *</label>
					<input
						type="tel"
						id="contactPhone"
						value={formData.contactPhone || ""}
						onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
						placeholder="+79991234567"
						required
					/>
					<small style={{ color: "#666", fontSize: "12px", marginTop: "5px", display: "block" }}>Обязательное поле для связи с клиентом</small>
				</div>

				{/* Имя клиента (только для незарегистрированного клиента) */}
				{!selectedClient && (
					<div className="formField">
						<label htmlFor="clientName">Имя клиента</label>
						<input
							type="text"
							id="clientName"
							value={formData.clientName || ""}
							onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
							placeholder="Иван Иванов"
						/>
					</div>
				)}

				{/* Менеджер (скрыто для менеджера, т.к. он автоматически становится ответственным) */}
				{user?.role !== "manager" && (
					<div className="formField">
						<label htmlFor="managerSearch">Менеджер</label>
						{selectedManager ? (
							<div className="selectedClient">
								<span>
									<Link href={`/admin/users/${selectedManager.id}`} className="itemLink" target="_blank">
										{`${selectedManager.first_name || ""} ${selectedManager.last_name || ""}`.trim() || selectedManager.phone} ({selectedManager.phone})
									</Link>
								</span>
								<button type="button" onClick={handleManagerClear} className="removeButton">
									Убрать менеджера ×
								</button>
							</div>
						) : (
							<SearchDropdownInput
								id="managerSearch"
								value={managerSearch}
								onChange={handleManagerManualInput}
								onFocus={() => {
									if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
									setIsManagerSearchFocused(true);
								}}
								onBlur={handleManagerBlur}
								placeholder="Поиск менеджера по ФИО, ID или телефону"
								isActiveSearch={isManagerSearchFocused && managerSearch.length >= 2}
								showDropdown={isManagerSearchFocused && Boolean(managerSearch)}
							>
								{isManagerSearchFocused && isSearchingManagers && managerSearch && (
									<div className="searchResults loading">
										<Loading />
									</div>
								)}
								{isManagerSearchFocused && managerSearch && !isSearchingManagers && (
									<div className="searchResults">
										{managerSearchResults.length > 0 ? (
											managerSearchResults.map((manager) => {
												const fullName = `${manager.first_name || ""} ${manager.last_name || ""}`.trim();
												return (
													<div key={manager.id} className="searchResultItem" onMouseDown={() => handleManagerSelect(manager)}>
														{fullName || manager.phone} - {manager.phone} {manager.id ? `(ID: ${manager.id})` : ""}
													</div>
												);
											})
										) : (
											<div className="searchResultItem">Нет результатов</div>
										)}
									</div>
								)}
							</SearchDropdownInput>
						)}
					</div>
				)}

				{/* Кнопка "забрать заявку" для менеджера, если у заявки нет ответственного */}
				{!isCreating && user?.role === "manager" && !formData.managerId && (
					<div className="formField">
						<button
							type="button"
							onClick={handleTakeBooking}
							disabled={saving}
							style={{
								padding: "10px 20px",
								backgroundColor: "#007bff",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: saving ? "not-allowed" : "pointer",
								fontSize: "14px",
							}}
						>
							{saving ? "Обработка..." : "Забрать заявку"}
						</button>
						<small style={{ color: "#666", fontSize: "12px", marginTop: "5px", display: "block" }}>Нажмите, чтобы взять эту заявку в работу</small>
					</div>
				)}

				{/* Примечания */}
				<div className="formField">
					<label htmlFor="notes">Примечания</label>
					<textarea
						id="notes"
						value={formData.notes}
						onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
						placeholder="Введите примечания..."
						rows={4}
					/>
				</div>
				</div>
			</div>

			{/* Фиксированные кнопки для изменений */}
			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText={isCreating ? "Создать запись" : "Сохранить"} />}
		</>
	);
}
