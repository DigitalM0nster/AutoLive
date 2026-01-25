"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Booking, CreateBookingRequest, BookingDepartment, User } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
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

export default function BookingFormComponent({ isCreating = true, bookingId, userRole }: BookingFormComponentProps) {
	const router = useRouter();
	const { user } = useAuthStore();
	const [loading, setLoading] = useState(!isCreating);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false); // Состояние для отслеживания изменений

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

	// Состояние для поиска заказа
	const [orderSearch, setOrderSearch] = useState("");
	const [orderSearchResults, setOrderSearchResults] = useState<{ id: number; status: string; createdAt: string | Date }[]>([]);
	const [isSearchingOrders, setIsSearchingOrders] = useState(false);
	const [isOrderSearchFocused, setIsOrderSearchFocused] = useState(false);
	const [selectedOrder, setSelectedOrder] = useState<{ id: number; status: string; createdAt: string | Date } | null>(null);
	const [initialSelectedOrder, setInitialSelectedOrder] = useState<{ id: number; status: string; createdAt: string | Date } | null>(null);
	const orderBlurTimeout = useRef<NodeJS.Timeout | null>(null);

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
							const order = booking.order as { id: number; status: string; createdAt: string | Date };
							setSelectedOrder(order);
							setInitialSelectedOrder(order);
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
			if (orderBlurTimeout.current) {
				clearTimeout(orderBlurTimeout.current);
			}
			if (managerBlurTimeout.current) {
				clearTimeout(managerBlurTimeout.current);
			}
		};
	}, []);

	// Поиск заказов
	const handleOrderSearch = async (query: string) => {
		// Поиск по ID заказа
		const orderId = parseInt(query);
		if (isNaN(orderId)) {
			setOrderSearchResults([]);
			return;
		}

		try {
			setIsSearchingOrders(true);
			const response = await fetch(`/api/orders?idSearch=${orderId}&limit=10`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				if (data.orders && data.orders.length > 0) {
					setOrderSearchResults(
						data.orders.map((o: any) => ({
							id: o.id,
							status: o.status,
							createdAt: o.createdAt,
						}))
					);
				} else {
					setOrderSearchResults([]);
				}
			}
		} catch (error) {
			console.error("Ошибка поиска заказов:", error);
		} finally {
			setIsSearchingOrders(false);
		}
	};

	const handleOrderSelect = (order: { id: number; status: string; createdAt: string | Date }) => {
		if (userRole === "manager") {
			return; // Менеджер не может редактировать
		}

		setSelectedOrder(order);
		setOrderSearch("");
		setOrderSearchResults([]);
		setIsOrderSearchFocused(false);
	};

	const handleOrderBlur = () => {
		if (orderBlurTimeout.current) clearTimeout(orderBlurTimeout.current);
		orderBlurTimeout.current = setTimeout(() => setIsOrderSearchFocused(false), 120);
	};

	const handleOrderManualInput = (value: string) => {
		if (userRole === "manager") {
			return; // Менеджер не может редактировать
		}

		setOrderSearch(value);
		if (value.trim() !== "") {
			handleOrderSearch(value);
		} else {
			setOrderSearchResults([]);
		}
	};

	// Загрузка данных для селектов
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
	}, [user]);

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

	// Опции для селектов
	const departmentOptions = bookingDepartments.map((dept) => ({
		value: dept.id.toString(),
		label: dept.name || `Адрес #${dept.id}`,
	}));

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

			// Обновляем выбранный заказ, если он был в ответе
			if (data.booking?.order) {
				setSelectedOrder(data.booking.order);
				setInitialSelectedOrder(data.booking.order);
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
			setOrderSearch("");
			setOrderSearchResults([]);
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
						<div className="searchContainer">
							<input
								id="clientSearch"
								type="text"
								value={clientSearch}
								onChange={(e) => handleClientManualInput(e.target.value)}
								onFocus={() => {
									if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
									setIsClientSearchFocused(true);
								}}
								onBlur={handleClientBlur}
								placeholder="Поиск клиента по ФИО, ID или телефону"
								className={isClientSearchFocused && clientSearch.length >= 2 ? "activeSearch" : ""}
							/>
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
						</div>
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

				{/* Заказ */}
				{userRole !== "manager" && (
					<div className="formField">
						<label htmlFor="orderSearch">Заказ</label>
						{selectedOrder ? (
							<div className="selectedClient">
								<span>
									<Link href={`/admin/orders/${selectedOrder.id}`} className="itemLink" target="_blank">
										Заказ #{selectedOrder.id} -{" "}
										{typeof selectedOrder.createdAt === "string"
											? new Date(selectedOrder.createdAt).toLocaleDateString("ru-RU")
											: selectedOrder.createdAt.toLocaleDateString("ru-RU")}{" "}
										({getOrderStatusText(selectedOrder.status)})
									</Link>
								</span>
								<button
									type="button"
									onClick={() => {
										setSelectedOrder(null);
										setOrderSearch("");
										setOrderSearchResults([]);
									}}
									className="removeButton"
								>
									Убрать заказ ×
								</button>
							</div>
						) : (
							<div className="searchContainer">
								<input
									id="orderSearch"
									type="text"
									value={orderSearch}
									onChange={(e) => handleOrderManualInput(e.target.value)}
									onFocus={() => {
										if (orderBlurTimeout.current) clearTimeout(orderBlurTimeout.current);
										setIsOrderSearchFocused(true);
									}}
									onBlur={handleOrderBlur}
									placeholder="Поиск заказа по ID"
									className={isOrderSearchFocused && orderSearch.length > 0 ? "activeSearch" : ""}
								/>
								{isOrderSearchFocused && isSearchingOrders && orderSearch && (
									<div className="searchResults loading">
										<Loading />
									</div>
								)}
								{isOrderSearchFocused && orderSearch && !isSearchingOrders && (
									<div className="searchResults">
										{orderSearchResults.length > 0 ? (
											orderSearchResults.map((order) => (
												<div key={order.id} className="searchResultItem" onMouseDown={() => handleOrderSelect(order)}>
													Заказ #{order.id} -{" "}
													{typeof order.createdAt === "string"
														? new Date(order.createdAt).toLocaleDateString("ru-RU")
														: order.createdAt.toLocaleDateString("ru-RU")}{" "}
													({getOrderStatusText(order.status)})
												</div>
											))
										) : (
											<div className="searchResultItem">Нет результатов</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				)}

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
							<div className="searchContainer">
								<input
									id="managerSearch"
									type="text"
									value={managerSearch}
									onChange={(e) => handleManagerManualInput(e.target.value)}
									onFocus={() => {
										if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
										setIsManagerSearchFocused(true);
									}}
									onBlur={handleManagerBlur}
									placeholder="Поиск менеджера по ФИО, ID или телефону"
									className={isManagerSearchFocused && managerSearch.length >= 2 ? "activeSearch" : ""}
								/>
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
							</div>
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
