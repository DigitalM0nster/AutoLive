"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Order, User, ProductListItem, CreateOrderRequest, OrderStatus } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";

type OrderPageProps = {
	orderId?: string | number; // Если не указан, значит создаем новый заказ
	isCreating?: boolean;
	userRole?: string; // Роль пользователя для определения режима отображения
};

export default function OrderComponent({ orderId, isCreating = false, userRole }: OrderPageProps) {
	const { user } = useAuthStore();
	const router = useRouter();
	const [orderData, setOrderData] = useState<Order | null>(null);
	const [loading, setLoading] = useState(!isCreating);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	// Состояние для формы создания/редактирования заказа
	const [formData, setFormData] = useState({
		clientId: "",
		departmentId: "",
		managerId: "",
		// Поля для статусов
		contactPhone: "",
		confirmationDate: "",
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
	const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

	// Состояние для товаров в заказе
	const [orderItems, setOrderItems] = useState<
		{
			product_sku: string;
			product_title: string;
			product_price: number;
			product_brand: string;
			product_image?: string | null;
			quantity: number;
			supplierDeliveryDate?: string;
			carModel?: string;
			vinCode?: string;
		}[]
	>([]);

	// Состояние для поиска товаров
	const [productSearch, setProductSearch] = useState("");
	const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Состояние для поиска клиентов
	const [clientSearch, setClientSearch] = useState("");
	const [clientSearchResults, setClientSearchResults] = useState<User[]>([]);
	const [isSearchingClients, setIsSearchingClients] = useState(false);
	const [selectedClient, setSelectedClient] = useState<User | null>(null);

	// Состояние для отделов
	const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
	const [managers, setManagers] = useState<User[]>([]);

	const [managerSearch, setManagerSearch] = useState("");
	const [managerSearchResults, setManagerSearchResults] = useState<User[]>([]);
	const [isSearchingManagers, setIsSearchingManagers] = useState(false);
	const [selectedManager, setSelectedManager] = useState<User | null>(null);

	const isEditMode = userRole === "superadmin" || userRole === "admin";
	const isViewMode = userRole === "manager";

	// Функция для определения доступных статусов для менеджера
	const getAvailableStatuses = (currentStatus: string) => {
		if (userRole === "superadmin" || userRole === "admin") {
			// Админы и суперадмины могут ставить любой статус
			return ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
		}

		if (userRole === "manager") {
			// Менеджеры могут только повышать статус или оставлять текущий
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
		if (userRole === "superadmin" || userRole === "admin") {
			return true; // Админы и суперадмины могут редактировать все поля
		}

		if (userRole === "manager") {
			// Менеджеры могут редактировать только поля текущего статуса и выше
			const statusOrder = ["created", "confirmed", "booked", "ready", "paid", "completed", "returned"];
			const currentIndex = statusOrder.indexOf(currentStatus);
			const fieldIndex = statusOrder.indexOf(statusName);

			if (currentIndex === -1 || fieldIndex === -1) return false;

			// Можно редактировать только если поле относится к текущему статусу или выше
			return fieldIndex >= currentIndex;
		}

		return false;
	};

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
					const errorData = await response.json();
					throw new Error(errorData.error || "Ошибка при загрузке данных заказа");
				}

				const data = await response.json();
				const order = data.order;
				setOrderData(order);

				// Заполняем форму данными заказа
				setFormData({
					clientId: order.clientId?.toString() || "",
					departmentId: order.departmentId?.toString() || "",
					managerId: order.managerId?.toString() || "",
					contactPhone: "",
					confirmationDate: "",
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

				// Заполняем комментарии (пока пустой массив, потом добавим логику)
				setComments([]);
				setOrderItems(order.orderItems || []);
			} catch (err) {
				console.error("Ошибка загрузки заказа:", err);
				setError(err instanceof Error ? err.message : "Неизвестная ошибка");
			} finally {
				setLoading(false);
			}
		};

		fetchOrderData();
	}, [orderId, isCreating]);

	// Загрузка отделов и менеджеров
	useEffect(() => {
		const fetchDepartmentsAndManagers = async () => {
			try {
				// Загружаем отделы
				const departmentsResponse = await fetch("/api/departments", {
					credentials: "include",
				});
				if (departmentsResponse.ok) {
					const departmentsData = await departmentsResponse.json();
					setDepartments(departmentsData);
				}

				// Загружаем менеджеров
				const managersResponse = await fetch("/api/users?role=manager", {
					credentials: "include",
				});
				if (managersResponse.ok) {
					const managersData = await managersResponse.json();
					setManagers(managersData.users || []);
				}
			} catch (err) {
				console.error("Ошибка загрузки отделов и менеджеров:", err);
			}
		};

		fetchDepartmentsAndManagers();
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
		} catch (err) {
			console.error("Ошибка поиска товаров:", err);
		} finally {
			setIsSearching(false);
		}
	};

	// Поиск клиентов
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
		} catch (err) {
			console.error("Ошибка поиска клиентов:", err);
		} finally {
			setIsSearchingClients(false);
		}
	};

	const handleManagerSearch = async (query: string) => {
		if (query.length < 2) {
			setManagerSearchResults([]);
			return;
		}

		try {
			setIsSearchingManagers(true);
			// Если выбран отдел, фильтруем менеджеров по отделу
			const departmentFilter = formData.departmentId ? `&departmentId=${formData.departmentId}` : "";
			const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&role=manager&limit=10${departmentFilter}`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				// Дополнительная фильтрация на фронтенде (если API не поддерживает фильтр по отделу)
				let filteredManagers = data.users || [];
				if (formData.departmentId) {
					filteredManagers = filteredManagers.filter((manager: any) => manager.department && manager.department.id === parseInt(formData.departmentId));
				}
				setManagerSearchResults(filteredManagers);
			}
		} catch (err) {
			console.error("Ошибка поиска менеджеров:", err);
		} finally {
			setIsSearchingManagers(false);
		}
	};

	// Функция для фильтрации менеджеров по отделу
	const getManagersForDepartment = (departmentId: string): User[] => {
		if (!departmentId) return managers;
		return managers.filter((manager) => manager.department && manager.department.id === parseInt(departmentId));
	};

	// Обработка изменения отдела
	const handleDepartmentChange = (departmentId: string) => {
		setFormData((prev) => ({ ...prev, departmentId }));

		// Если есть выбранный менеджер, проверяем его отдел
		if (selectedManager) {
			const managersInDepartment = getManagersForDepartment(departmentId);
			const isManagerInDepartment = managersInDepartment.some((manager) => manager.id === selectedManager.id);

			if (!isManagerInDepartment) {
				// Сбрасываем менеджера если он не в выбранном отделе
				setSelectedManager(null);
				setManagerSearch("");
			}
		}
	};

	// Обработка выбора менеджера
	const handleManagerSelect = (manager: User) => {
		setSelectedManager(manager);
		setManagerSearch(`${manager.first_name} ${manager.last_name} (${manager.phone})`);
		setManagerSearchResults([]);

		// Автоматически устанавливаем отдел менеджера для заказа
		if (manager.department) {
			setFormData((prev) => ({ ...prev, departmentId: manager.department!.id.toString() }));
		}
	};

	// Добавление товара в заказ
	const addProductToOrder = (product: ProductListItem) => {
		const existingItem = orderItems.find((item) => item.product_sku === product.sku);

		if (existingItem) {
			// Увеличиваем количество если товар уже есть
			setOrderItems((prev) => prev.map((item) => (item.product_sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item)));
		} else {
			// Добавляем новый товар
			setOrderItems((prev) => [
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
				},
			]);
		}
		setSearchResults([]);
		setProductSearch("");
	};

	// Удаление товара из заказа
	const removeProductFromOrder = (sku: string) => {
		setOrderItems((prev) => prev.filter((item) => item.product_sku !== sku));
	};

	// Изменение количества товара
	const updateProductQuantity = (sku: string, quantity: number) => {
		if (quantity <= 0) {
			removeProductFromOrder(sku);
			return;
		}

		setOrderItems((prev) => prev.map((item) => (item.product_sku === sku ? { ...item, quantity } : item)));
	};

	// Обновление полей товара
	const updateProductField = (productSku: string, field: string, value: string) => {
		setOrderItems((prev) => prev.map((item) => (item.product_sku === productSku ? { ...item, [field]: value } : item)));
	};

	// Вычисление общей суммы заказа
	const calculateOrderTotal = () => {
		return orderItems.reduce((total, item) => total + item.product_price * item.quantity, 0);
	};

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

	// Функция форматирования телефона
	const formatPhoneNumber = (value: string): string => {
		// Убираем все символы кроме цифр
		const phoneNumber = value.replace(/\D/g, "");

		// Если номер начинается с 8, заменяем на 7
		let formattedNumber = phoneNumber;
		if (formattedNumber.startsWith("8")) {
			formattedNumber = "7" + formattedNumber.slice(1);
		}

		// Если номер не начинается с 7, добавляем 7
		if (!formattedNumber.startsWith("7") && formattedNumber.length > 0) {
			formattedNumber = "7" + formattedNumber;
		}

		// Форматируем в +7(XXX)XXX-XX-XX
		if (formattedNumber.length === 0) return "";
		if (formattedNumber.length <= 1) return `+7`;
		if (formattedNumber.length <= 4) return `+7(${formattedNumber.slice(1)}`;
		if (formattedNumber.length <= 7) return `+7(${formattedNumber.slice(1, 4)})${formattedNumber.slice(4)}`;
		if (formattedNumber.length <= 9) return `+7(${formattedNumber.slice(1, 4)})${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7)}`;

		return `+7(${formattedNumber.slice(1, 4)})${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7, 9)}-${formattedNumber.slice(9, 11)}`;
	};

	// Функция валидации полей для статуса
	const validateStatusFields = (status: OrderStatus): { isValid: boolean; missingFields: string[]; errorFields: string[] } => {
		const missingFields: string[] = [];
		const errorFields: string[] = [];

		// 1. Новый - контактный телефон и состав заказа
		if (status === "created" || status === "confirmed" || status === "booked" || status === "ready" || status === "paid" || status === "completed" || status === "returned") {
			if (!formData.contactPhone.trim()) {
				missingFields.push("Контактный телефон");
				errorFields.push("contactPhone");
			}
			if (orderItems.length === 0) {
				missingFields.push("Состав заказа");
				errorFields.push("productSearch");
			}
		}

		// 2. Подтвержденный - клиент, ответственный, отдел, дата согласования
		if (status === "confirmed" || status === "booked" || status === "ready" || status === "paid" || status === "completed" || status === "returned") {
			if (!selectedClient) {
				missingFields.push("Клиент");
				errorFields.push("clientSearch");
			}
			if (!formData.departmentId) {
				missingFields.push("Отдел");
				errorFields.push("departmentId");
			}
			if (!selectedManager) {
				missingFields.push("Ответственный менеджер");
				errorFields.push("managerSearch");
			} else if (formData.departmentId) {
				// Проверяем, что выбранный менеджер принадлежит выбранному отделу
				const managersInDepartment = getManagersForDepartment(formData.departmentId);
				const isManagerInDepartment = managersInDepartment.some((manager) => manager.id === selectedManager.id);
				if (!isManagerInDepartment) {
					missingFields.push("Ответственный менеджер должен быть из выбранного отдела");
					errorFields.push("managerSearch");
				}
			}
			if (!formData.confirmationDate) {
				missingFields.push("Дата согласования");
				errorFields.push("confirmationDate");
			}
		}

		// 3. Забронирован - забронирован до
		if (status === "booked" || status === "ready" || status === "paid" || status === "completed" || status === "returned") {
			if (!formData.bookedUntil) {
				missingFields.push("Забронирован до");
				errorFields.push("bookedUntil");
			}
		}

		// 4. Готов к выдаче - отложен до, сумма предоплаты, дата внесения предоплаты
		if (status === "ready" || status === "paid" || status === "completed" || status === "returned") {
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
		if (status === "paid" || status === "completed" || status === "returned") {
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
		if (status === "completed" || status === "returned") {
			if (!formData.completionDate) {
				missingFields.push("Дата выполнения");
				errorFields.push("completionDate");
			}
		}

		// 7. Возврат - все поля возврата
		if (status === "returned") {
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

		return {
			isValid: missingFields.length === 0,
			missingFields,
			errorFields,
		};
	};

	// Сохранение заказа
	const handleSave = async () => {
		try {
			setIsSaving(true);
			setFieldErrors(new Set()); // Очищаем ошибки

			// Валидируем поля для текущего статуса
			const validation = validateStatusFields(currentStatus);
			if (!validation.isValid) {
				setFieldErrors(new Set(validation.errorFields));
				showErrorToast(`Необходимо заполнить: ${validation.missingFields.join(", ")}`);
				return;
			}

			// Подготавливаем данные для отправки
			const orderData: CreateOrderRequest = {
				orderItems,
				...(selectedClient && { clientId: selectedClient.id }),
				...(selectedManager && { managerId: selectedManager.id }),
				...(formData.departmentId && { departmentId: parseInt(formData.departmentId) }),
				// Добавляем поля статусов
				...(formData.contactPhone && { contactPhone: formData.contactPhone }),
				...(formData.confirmationDate && { confirmationDate: formData.confirmationDate }),
				...(formData.bookedUntil && { bookedUntil: formData.bookedUntil }),
				...(formData.readyUntil && { readyUntil: formData.readyUntil }),
				...(formData.prepaymentAmount && { prepaymentAmount: parseFloat(formData.prepaymentAmount) }),
				...(formData.prepaymentDate && { prepaymentDate: formData.prepaymentDate }),
				...(formData.paymentDate && { paymentDate: formData.paymentDate }),
				...(formData.orderAmount && { orderAmount: parseFloat(formData.orderAmount) }),
				...(formData.completionDate && { completionDate: formData.completionDate }),
				...(formData.returnReason && { returnReason: formData.returnReason }),
				...(formData.returnDate && { returnDate: formData.returnDate }),
				...(formData.returnAmount && { returnAmount: parseFloat(formData.returnAmount) }),
				...(formData.returnPaymentDate && { returnPaymentDate: formData.returnPaymentDate }),
				...(formData.returnDocumentNumber && { returnDocumentNumber: formData.returnDocumentNumber }),
				...(comments.length > 0 && { comments }),
			};

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
					method: "PATCH",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(orderData),
				});
			}

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при сохранении заказа");
			}

			const data = await response.json();
			showSuccessToast(isCreating ? "Заказ успешно создан" : "Заказ успешно обновлен");

			if (isCreating) {
				// Перенаправляем на страницу созданной заказа
				router.push(`/admin/orders/${data.order.id}`);
			} else {
				// Обновляем данные заказа
				setOrderData(data.order);
				setHasChanges(false);
			}
		} catch (err) {
			console.error("Ошибка сохранения заказа:", err);
			showErrorToast(err instanceof Error ? err.message : "Неизвестная ошибка");
		} finally {
			setIsSaving(false);
		}
	};

	if (loading) {
		return <Loading />;
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
				</div>

				{isEditMode && (
					<div className={`formFields`}>
						{/* Статус заказа */}
						<div className={`formRow`}>
							<div className={`formField`}>
								<label htmlFor="orderStatus">Статус заказа</label>
								<select id="orderStatus" name="orderStatus" value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value as OrderStatus)}>
									{getAvailableStatuses(currentStatus).map((status) => (
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
							</div>
						</div>

						{/* Блоки статусов заказа */}
						{/* 1. Новый - Контактный телефон */}
						<div className={`statusBlock borderBlock ${currentStatus === "created" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>1. Новый</h3>
							</div>
							<div className={`statusFields`}>
								<div className={`formField`}>
									<label htmlFor="contactPhone">Контактный телефон</label>
									<input
										id="contactPhone"
										type="tel"
										value={formData.contactPhone}
										onChange={(e) => {
											const formatted = formatPhoneNumber(e.target.value);
											setFormData((prev) => ({ ...prev, contactPhone: formatted }));
										}}
										placeholder="+7(995)123-45-67"
										className={fieldErrors.has("contactPhone") ? "error" : ""}
										disabled={!canEditStatusField("created")}
									/>
								</div>

								<div className={`formField`}>
									<label htmlFor="productSearch">Состав заказа</label>
									<div className={`searchContainer`}>
										<input
											id="productSearch"
											type="text"
											value={productSearch}
											onChange={(e) => {
												setProductSearch(e.target.value);
												handleProductSearch(e.target.value);
											}}
											placeholder="Поиск товаров по названию, артикулу или бренду"
											className={fieldErrors.has("productSearch") ? "error" : ""}
										/>
										{isSearching && <div className="loadingSpinner">Поиск...</div>}

										{searchResults.length > 0 && (
											<div className={`searchResults`}>
												{searchResults.map((product) => (
													<div key={product.id} className={`searchResultItem`} onClick={() => addProductToOrder(product)}>
														<div className="productInfo">
															<span className="productTitle">{product.title}</span>
															<span className="productSku">Артикул: {product.sku}</span>
															<span className="productBrand">Бренд: {product.brand}</span>
															<span className="productPrice">{product.price} ₽</span>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Список товаров в заказе */}
								{orderItems.length > 0 && (
									<div className={`formField`}>
										<label>Товары в заказе ({orderItems.length})</label>
										<div className={`orderItemsList`}>
											{orderItems.map((item, index) => (
												<div key={index} className={`orderItem borderBlock`}>
													<div className="itemHeader">
														<div className="itemInfo">
															<span className="itemTitle">{item.product_title}</span>
															<span className="itemSku">Артикул: {item.product_sku}</span>
															<span className="itemBrand">Бренд: {item.product_brand}</span>
														</div>
														<button
															type="button"
															onClick={() => removeProductFromOrder(item.product_sku)}
															className="removeButton"
															disabled={!canEditStatusField("created")}
														>
															×
														</button>
													</div>

													<div className="itemFields">
														<div className="formRow">
															<div className="formField">
																<label>Количество</label>
																<div className="quantityControls">
																	<button
																		type="button"
																		onClick={() => updateProductQuantity(item.product_sku, item.quantity - 1)}
																		className="quantityButton"
																		disabled={!canEditStatusField("created")}
																	>
																		-
																	</button>
																	<input
																		type="number"
																		value={item.quantity}
																		onChange={(e) => updateProductQuantity(item.product_sku, parseInt(e.target.value) || 0)}
																		min="1"
																		className="quantityInput"
																		disabled={!canEditStatusField("created")}
																	/>
																	<button
																		type="button"
																		onClick={() => updateProductQuantity(item.product_sku, item.quantity + 1)}
																		className="quantityButton"
																		disabled={!canEditStatusField("created")}
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

														<div className="formRow">
															<div className="formField">
																<DatePickerField
																	label="Дата поставки поставщиком"
																	value={item.supplierDeliveryDate || ""}
																	onChange={(date) => updateProductField(item.product_sku, "supplierDeliveryDate", date)}
																	placeholder="Выберите дату поставки"
																	disabled={!canEditStatusField("created")}
																/>
															</div>
															<div className="formField">
																<label>Название автомобиля</label>
																<input
																	type="text"
																	value={item.carModel || ""}
																	onChange={(e) => updateProductField(item.product_sku, "carModel", e.target.value)}
																	placeholder="Модель автомобиля"
																	className="textInput"
																	disabled={!canEditStatusField("created")}
																/>
															</div>
														</div>

														<div className="formRow">
															<div className="formField">
																<label>VIN-код автомобиля</label>
																<input
																	type="text"
																	value={item.vinCode || ""}
																	onChange={(e) => updateProductField(item.product_sku, "vinCode", e.target.value)}
																	placeholder="VIN-код"
																	className="textInput"
																	disabled={!canEditStatusField("created")}
																/>
															</div>
															<div className="formField">
																<label>Сумма</label>
																<input
																	type="text"
																	value={`${(item.product_price * item.quantity).toLocaleString()} ₽`}
																	disabled
																	className="totalInput"
																/>
															</div>
														</div>
													</div>
												</div>
											))}
										</div>

										{/* Общая сумма заказа */}
										<div className="orderTotal">
											<div className="totalRow">
												<span className="totalLabel">Общая сумма заказа:</span>
												<span className="totalAmount">{calculateOrderTotal().toLocaleString()} ₽</span>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* 2. Подтвержденный - Клиент, ответственный, состав заказа, дата согласования */}
						<div className={`statusBlock borderBlock ${currentStatus === "confirmed" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>2. Подтвержденный</h3>
							</div>
							<div className={`statusFields`}>
								{/* Поиск и выбор клиента */}
								<div className={`formRow`}>
									<div className={`formField`}>
										<label htmlFor="clientSearch">Клиент</label>
										<div className={`searchContainer`}>
											<input
												id="clientSearch"
												type="text"
												value={clientSearch}
												onChange={(e) => {
													setClientSearch(e.target.value);
													handleClientSearch(e.target.value);
												}}
												placeholder="Поиск клиента по имени или телефону"
												className={fieldErrors.has("clientSearch") ? "error" : ""}
												disabled={!canEditStatusField("confirmed")}
											/>
											{isSearchingClients && <div className="loadingSpinner">Поиск...</div>}

											{clientSearchResults.length > 0 && (
												<div className={`searchResults`}>
													{clientSearchResults.map((client) => (
														<div
															key={client.id}
															className={`searchResultItem`}
															onClick={() => {
																setSelectedClient(client);
																setClientSearch(`${client.first_name} ${client.last_name} (${client.phone})`);
																setClientSearchResults([]);
															}}
														>
															{client.first_name} {client.last_name} - {client.phone}
														</div>
													))}
												</div>
											)}
										</div>
										{selectedClient && (
											<div className={`selectedClient`}>
												Выбран: {selectedClient.first_name} {selectedClient.last_name} ({selectedClient.phone})
												<button
													type="button"
													onClick={() => {
														setSelectedClient(null);
														setClientSearch("");
													}}
													className={`removeButton`}
												>
													×
												</button>
											</div>
										)}
									</div>
								</div>
								<div className="formRow">
									{/* Ответственный менеджер */}
									<div className={`formField`}>
										<label htmlFor="managerSearch">Ответственный</label>
										<div className={`searchContainer`}>
											<input
												id="managerSearch"
												type="text"
												value={managerSearch}
												onChange={(e) => {
													setManagerSearch(e.target.value);
													handleManagerSearch(e.target.value);
												}}
												placeholder={
													formData.departmentId
														? `Поиск менеджера отдела "${departments.find((d) => d.id.toString() === formData.departmentId)?.name || ""}"`
														: "Поиск менеджера по имени или телефону"
												}
												className={fieldErrors.has("managerSearch") ? "error" : ""}
												disabled={!canEditStatusField("confirmed")}
											/>
											{isSearchingManagers && <div className="loadingSpinner">Поиск...</div>}

											{managerSearchResults.length > 0 && (
												<div className={`searchResults`}>
													{managerSearchResults.map((manager) => (
														<div key={manager.id} className={`searchResultItem`} onClick={() => handleManagerSelect(manager)}>
															{manager.first_name} {manager.last_name} - {manager.phone}
															{manager.department && ` (${manager.department.name})`}
														</div>
													))}
												</div>
											)}
										</div>
										{selectedManager && (
											<div className={`selectedClient`}>
												Выбран: {selectedManager.first_name} {selectedManager.last_name} ({selectedManager.phone})
												{selectedManager.department && ` - ${selectedManager.department.name}`}
												<button
													type="button"
													onClick={() => {
														setSelectedManager(null);
														setManagerSearch("");
													}}
													className={`removeButton`}
												>
													×
												</button>
											</div>
										)}
									</div>
									<div className={`formField`}>
										<label htmlFor="departmentId">Отдел</label>
										{userRole === "superadmin" ? (
											<select
												id="departmentId"
												name="departmentId"
												value={formData.departmentId}
												onChange={(e) => handleDepartmentChange(e.target.value)}
												className={fieldErrors.has("departmentId") ? "error" : ""}
												disabled={!canEditStatusField("confirmed")}
											>
												<option value="">— Не выбран —</option>
												{departments.map((dept) => (
													<option key={dept.id} value={dept.id}>
														{dept.name}
													</option>
												))}
											</select>
										) : (
											<input
												type="text"
												value={departments.find((d) => d.id.toString() === formData.departmentId)?.name || "— Не выбран —"}
												disabled
												className={fieldErrors.has("departmentId") ? "error" : ""}
											/>
										)}
									</div>
								</div>

								<div className="formRow">
									<div className={`formField`}>
										<DatePickerField
											label="Дата согласования"
											value={formData.confirmationDate}
											onChange={(date) => setFormData((prev) => ({ ...prev, confirmationDate: date }))}
											placeholder="Выберите дату согласования"
											className={fieldErrors.has("confirmationDate") ? "error" : ""}
											disabled={!canEditStatusField("confirmed")}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* 3. Забронирован - Забронирован до */}
						<div className={`statusBlock borderBlock ${currentStatus === "booked" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>3. Забронирован</h3>
							</div>
							<div className={`statusFields`}>
								<div className={`formField`}>
									<DatePickerField
										label="Забронирован до"
										value={formData.bookedUntil}
										onChange={(date) => setFormData((prev) => ({ ...prev, bookedUntil: date }))}
										placeholder="Выберите дату бронирования"
										className={fieldErrors.has("bookedUntil") ? "error" : ""}
										disabled={!canEditStatusField("booked")}
									/>
								</div>
							</div>
						</div>

						{/* 4. Готов к выдаче - Отложен до, сумма предоплаты, дата внесения предоплаты */}
						<div className={`statusBlock borderBlock ${currentStatus === "ready" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>4. Готов к выдаче</h3>
							</div>
							<div className={`statusFields`}>
								<div className={`formRow`}>
									<div className={`formField`}>
										<DatePickerField
											label="Отложен до"
											value={formData.readyUntil}
											onChange={(date) => setFormData((prev) => ({ ...prev, readyUntil: date }))}
											placeholder="Выберите дату отложения"
											className={fieldErrors.has("readyUntil") ? "error" : ""}
											disabled={!canEditStatusField("ready")}
										/>
									</div>
									<div className={`formField`}>
										<label>Сумма предоплаты</label>
										<input
											type="number"
											value={formData.prepaymentAmount}
											onChange={(e) => setFormData((prev) => ({ ...prev, prepaymentAmount: e.target.value }))}
											placeholder="0.00"
											step="0.01"
											min="0"
											disabled={!canEditStatusField("ready")}
										/>
									</div>
								</div>
								<div className={`formField`}>
									<DatePickerField
										label="Дата внесения предоплаты"
										value={formData.prepaymentDate}
										onChange={(date) => setFormData((prev) => ({ ...prev, prepaymentDate: date }))}
										placeholder="Выберите дату предоплаты"
										className={fieldErrors.has("prepaymentDate") ? "error" : ""}
										disabled={!canEditStatusField("ready")}
									/>
								</div>
								<div className={`formField`}>
									<button type="button" className={`generateInvoiceButton`}>
										Сформировать счёт
									</button>
								</div>
							</div>
						</div>

						{/* 5. Оплачен - Дата внесения оплаты, сумма заказа */}
						<div className={`statusBlock borderBlock ${currentStatus === "paid" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>5. Оплачен</h3>
							</div>
							<div className={`statusFields`}>
								<div className={`formRow`}>
									<div className={`formField`}>
										<DatePickerField
											label="Дата внесения оплаты"
											value={formData.paymentDate}
											onChange={(date) => setFormData((prev) => ({ ...prev, paymentDate: date }))}
											placeholder="Выберите дату оплаты"
											className={fieldErrors.has("paymentDate") ? "error" : ""}
											disabled={!canEditStatusField("paid")}
										/>
									</div>
									<div className={`formField`}>
										<label>Сумма заказа</label>
										<input
											type="number"
											value={formData.orderAmount}
											onChange={(e) => setFormData((prev) => ({ ...prev, orderAmount: e.target.value }))}
											placeholder="0.00"
											step="0.01"
											min="0"
											readOnly
											className={`readonlyField`}
										/>
									</div>
								</div>
								<div className={`formField`}>
									<button type="button" className={`downloadInvoiceButton`}>
										Скачать накладную
									</button>
								</div>
							</div>
						</div>

						{/* 6. Выполнен - Дата выполнения */}
						<div className={`statusBlock borderBlock ${currentStatus === "completed" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>6. Выполнен</h3>
							</div>
							<div className={`statusFields`}>
								<div className={`formField`}>
									<DatePickerField
										label="Дата выполнения"
										value={formData.completionDate}
										onChange={(date) => setFormData((prev) => ({ ...prev, completionDate: date }))}
										placeholder="Выберите дату выполнения"
										className={fieldErrors.has("completionDate") ? "error" : ""}
										disabled={!canEditStatusField("completed")}
									/>
								</div>
							</div>
						</div>

						{/* 7. Возврат - Все поля возврата */}
						<div className={`statusBlock borderBlock ${currentStatus === "returned" ? "active" : ""}`}>
							<div className={`statusHeader`}>
								<h3>7. Возврат</h3>
							</div>
							<div className={`statusFields`}>
								<div className={`formField`}>
									<label>Причина возврата позиции</label>
									<textarea
										value={formData.returnReason}
										onChange={(e) => setFormData((prev) => ({ ...prev, returnReason: e.target.value }))}
										placeholder="Укажите причину возврата"
										rows={3}
										disabled={!canEditStatusField("returned")}
									/>
								</div>
								<div className={`formRow`}>
									<div className={`formField`}>
										<DatePickerField
											label="Дата возврата позиции"
											value={formData.returnDate}
											onChange={(date) => setFormData((prev) => ({ ...prev, returnDate: date }))}
											placeholder="Выберите дату возврата"
											className={fieldErrors.has("returnDate") ? "error" : ""}
											disabled={!canEditStatusField("returned")}
										/>
									</div>
									<div className={`formField`}>
										<label>Сумма возврата</label>
										<input
											type="number"
											value={formData.returnAmount}
											onChange={(e) => setFormData((prev) => ({ ...prev, returnAmount: e.target.value }))}
											placeholder="0.00"
											step="0.01"
											min="0"
											disabled={!canEditStatusField("returned")}
										/>
									</div>
								</div>
								<div className={`formRow`}>
									<div className={`formField`}>
										<DatePickerField
											label="Дата возврата денежных средств"
											value={formData.returnPaymentDate}
											onChange={(date) => setFormData((prev) => ({ ...prev, returnPaymentDate: date }))}
											placeholder="Выберите дату возврата средств"
											className={fieldErrors.has("returnPaymentDate") ? "error" : ""}
											disabled={!canEditStatusField("returned")}
										/>
									</div>
									<div className={`formField`}>
										<label>Номер документа возврата средств</label>
										<input
											type="text"
											value={formData.returnDocumentNumber}
											onChange={(e) => setFormData((prev) => ({ ...prev, returnDocumentNumber: e.target.value }))}
											placeholder="Номер документа"
											disabled={!canEditStatusField("returned")}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Комментарии */}
						<div className={`formField`}>
							<label>Комментарии</label>
							<div className={`commentsContainer`}>
								{comments.map((comment, index) => (
									<div key={index} className={`commentItem`}>
										<input type="text" value={comment} onChange={(e) => editComment(index, e.target.value)} placeholder="Комментарий" />
										<button type="button" onClick={() => deleteComment(index)} className={`removeButton`}>
											Удалить
										</button>
									</div>
								))}

								<div className={`addCommentContainer`}>
									<input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Добавить комментарий" />
									<button type="button" onClick={addComment} className={`addButton`}>
										Добавить
									</button>
								</div>
							</div>
						</div>
					</div>
				)}

				{!isEditMode && isViewMode && (
					<div className={`viewModeContainer`}>
						<div className={`productInfoCard`}>
							<div className={`productDetailsSection`}>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>ID:</span>
									<span className={`infoValue`}>#{orderData?.id}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Статус:</span>
									<span className={`infoValue`}>{orderData?.status}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Клиент:</span>
									<span className={`infoValue`}>{orderData?.client ? `${orderData.client.first_name} ${orderData.client.last_name}` : "Не указан"}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Менеджер:</span>
									<span className={`infoValue`}>{orderData?.manager ? `${orderData.manager.first_name} ${orderData.manager.last_name}` : "Не назначен"}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Отдел:</span>
									<span className={`infoValue`}>{orderData?.department?.name || "Не указан"}</span>
								</div>
								<div className={`productInfoRow`}>
									<span className={`infoLabel`}>Создан:</span>
									<span className={`infoValue`}>{new Date(orderData?.createdAt || "").toLocaleDateString("ru-RU")}</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{!isEditMode && !isViewMode && (
					<div className={`noEditMessage`}>
						<p>У вас нет прав для редактирования заказов. Обратитесь к администратору.</p>
					</div>
				)}
			</div>

			{/* Фиксированные кнопки для изменений */}
			{isEditMode && (isCreating || orderItems.length > 0) && (
				<div className={`fixedButtons`}>
					<button onClick={() => router.push("/admin/orders")} className={`secondaryButton`} disabled={isSaving}>
						Отмена
					</button>
					<button onClick={handleSave} className={`primaryButton`} disabled={isSaving || orderItems.length === 0}>
						{isSaving ? "Сохранение..." : isCreating ? "Создать заказ" : "Сохранить изменения"}
					</button>
				</div>
			)}
		</div>
	);
}
