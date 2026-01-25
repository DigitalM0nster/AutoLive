import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import { DepartmentForLog, Order, OrderFormState, OrderItemClient, User } from "@/lib/types";

type StatusConfirmedSectionProps = {
	isActive: boolean;
	formData: OrderFormState;
	setFormData: React.Dispatch<React.SetStateAction<OrderFormState>>;
	selectedClient: User | null;
	setSelectedClient: React.Dispatch<React.SetStateAction<User | null>>;
	selectedManager: User | null;
	setSelectedManager: React.Dispatch<React.SetStateAction<User | null>>;
	currentDepartment: DepartmentForLog | null;
	fieldErrors: Set<string>;
	clearFieldError: (field: string) => void;
	canEdit: boolean;
	userRole?: string;
	user: User | null;
	departments: DepartmentForLog[];
	orderItems: OrderItemClient[];
	setOrderItems: React.Dispatch<React.SetStateAction<OrderItemClient[]>>;
	orderTotal: number;
	orderData: Order | null;
	currentStatus: string;
	statusDate?: string | null;
	selectedBooking: { id: number; scheduledDate: string | Date; scheduledTime: string; status: string; contactPhone: string } | null;
	setSelectedBooking: React.Dispatch<React.SetStateAction<{ id: number; scheduledDate: string | Date; scheduledTime: string; status: string; contactPhone: string } | null>>;
	selectedBookingDepartment: { id: number; name: string | null; address: string; phones: string[]; email: string | null } | null;
	setSelectedBookingDepartment: React.Dispatch<React.SetStateAction<{ id: number; name: string | null; address: string; phones: string[]; email: string | null } | null>>;
	bookingDepartments: { id: number; name: string | null; address: string; phones: string[]; email: string | null }[];
};

const StatusConfirmedSection: React.FC<StatusConfirmedSectionProps> = ({
	isActive,
	formData,
	setFormData,
	selectedClient,
	setSelectedClient,
	selectedManager,
	setSelectedManager,
	currentDepartment,
	fieldErrors,
	clearFieldError,
	canEdit,
	userRole,
	user,
	departments,
	orderItems,
	setOrderItems,
	orderTotal,
	orderData,
	currentStatus,
	statusDate,
	selectedBooking,
	setSelectedBooking,
	selectedBookingDepartment,
	setSelectedBookingDepartment,
	bookingDepartments,
}) => {
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
	const [clientSearch, setClientSearch] = useState("");
	const [clientSearchResults, setClientSearchResults] = useState<User[]>([]);
	const [isSearchingClients, setIsSearchingClients] = useState(false);

	const [managerSearch, setManagerSearch] = useState("");
	const [managerSearchResults, setManagerSearchResults] = useState<User[]>([]);
	const [isSearchingManagers, setIsSearchingManagers] = useState(false);

	const clientBlurTimeout = useRef<NodeJS.Timeout | null>(null);
	const managerBlurTimeout = useRef<NodeJS.Timeout | null>(null);
	const bookingBlurTimeout = useRef<NodeJS.Timeout | null>(null);
	const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
	const [isManagerSearchFocused, setIsManagerSearchFocused] = useState(false);
	const [isBookingSearchFocused, setIsBookingSearchFocused] = useState(false);
	const [bookingSearch, setBookingSearch] = useState("");
	const [bookingSearchResults, setBookingSearchResults] = useState<{ id: number; scheduledDate: string | Date; scheduledTime: string; status: string; contactPhone: string }[]>([]);
	const [isSearchingBookings, setIsSearchingBookings] = useState(false);
	const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

	useEffect(() => {
		return () => {
			if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
			if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
			if (bookingBlurTimeout.current) clearTimeout(bookingBlurTimeout.current);
		};
	}, []);

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

	const handleManagerSearch = async (query: string) => {
		if (query.length < 2) {
			setManagerSearchResults([]);
			return;
		}

		try {
			setIsSearchingManagers(true);
			const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&role=manager&role=admin&limit=10&allUsers=true`, {
				credentials: "include",
			});

			if (response.ok) {
				const data = await response.json();
				let filteredManagers: User[] = (data.users || []).filter((candidate: User) => {
					const candidateDepartmentId = candidate.department?.id ?? candidate.departmentId ?? null;
					return ["admin", "manager"].includes(candidate.role) && Boolean(candidateDepartmentId);
				});

				if (formData.departmentId) {
					const departmentNumericId = parseInt(formData.departmentId, 10);
					filteredManagers = filteredManagers.filter((candidate) => {
						const candidateDepartmentId = candidate.department?.id ?? candidate.departmentId ?? null;
						return candidateDepartmentId === departmentNumericId;
					});
				}

				if (userRole === "admin" && user?.departmentId) {
					filteredManagers = filteredManagers.filter((candidate) => {
						if (candidate.role === "admin") {
							return candidate.id === user.id;
						}
						const candidateDepartmentId = candidate.department?.id ?? candidate.departmentId ?? null;
						return candidateDepartmentId === user.departmentId;
					});

					const alreadyContainsAdmin = filteredManagers.some((candidate) => candidate.id === user.id);
					if (!alreadyContainsAdmin) {
						filteredManagers.push(user);
					}
				} else if (userRole === "manager" && user) {
					filteredManagers = [user];
				}

				setManagerSearchResults(filteredManagers);
			}
		} catch (error) {
			console.error("Ошибка поиска сотрудников:", error);
		} finally {
			setIsSearchingManagers(false);
		}
	};

	const handleClientSelect = (client: User) => {
		if (!canEdit) {
			return;
		}

		setSelectedClient(client);
		setClientSearch("");
		setClientSearchResults([]);
		setIsClientSearchFocused(false);
	};

	const handleManagerSelect = (manager: User) => {
		if (!canEdit) {
			return;
		}

		const managerDepartmentId = manager.department?.id ?? manager.departmentId ?? null;

		const applyManager = (departmentIdValue: string) => {
			setSelectedManager(manager);
			setFormData((prev) => ({
				...prev,
				departmentId: departmentIdValue,
				managerId: manager.id.toString(),
			}));
			clearFieldError("departmentId");
			clearFieldError("managerSearch");
		};

		if (userRole === "superadmin") {
			if (user && manager.id === user.id) {
				applyManager("");
			} else if (managerDepartmentId) {
				applyManager(managerDepartmentId.toString());
			} else {
				showErrorToast("У выбранного сотрудника нет отдела. Назначение невозможно.");
				setSelectedManager(null);
				setFormData((prev) => ({ ...prev, managerId: "" }));
				return;
			}
		} else if (managerDepartmentId) {
			applyManager(managerDepartmentId.toString());
		} else {
			showErrorToast("У выбранного сотрудника нет отдела. Назначение невозможно.");
			setSelectedManager(null);
			setFormData((prev) => ({ ...prev, managerId: "" }));
			return;
		}

		setManagerSearch("");
		setManagerSearchResults([]);
		setIsManagerSearchFocused(false);
	};

	const handleClientBlur = () => {
		if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
		clientBlurTimeout.current = setTimeout(() => setIsClientSearchFocused(false), 120);
	};

	const handleManagerBlur = () => {
		if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
		managerBlurTimeout.current = setTimeout(() => setIsManagerSearchFocused(false), 120);
	};

	const handleDepartmentSelect = (departmentId: string) => {
		if (userRole !== "superadmin") {
			return;
		}

		setFormData((prev) => ({ ...prev, departmentId }));
		clearFieldError("departmentId");

		if (!departmentId) {
			if (selectedManager && (!user || selectedManager.id !== user.id)) {
				setSelectedManager(null);
				setFormData((prev) => ({ ...prev, managerId: "" }));
			}
			setManagerSearch("");
			setManagerSearchResults([]);
			return;
		}

		const departmentNumericId = parseInt(departmentId, 10);
		if (selectedManager) {
			const managerDepartmentId = selectedManager.department?.id ?? selectedManager.departmentId ?? null;
			if (managerDepartmentId !== departmentNumericId) {
				setSelectedManager(null);
				setFormData((prev) => ({ ...prev, managerId: "" }));
			}
		}

		setManagerSearch("");
		setManagerSearchResults([]);
	};

	const handleManagerClear = () => {
		setSelectedManager(null);
		setManagerSearch("");
		setManagerSearchResults([]);
		setFormData((prev) => ({ ...prev, managerId: "" }));
		clearFieldError("managerSearch");
	};

	const handleManagerManualInput = (value: string) => {
		if (!canEdit) {
			return;
		}

		setManagerSearch(value);
		if (value.length >= 2) {
			handleManagerSearch(value);
		} else {
			setManagerSearchResults([]);
		}
		clearFieldError("managerSearch");
	};

	const handleClientManualInput = (value: string) => {
		if (!canEdit) {
			return;
		}

		setClientSearch(value);
		if (value.length >= 2) {
			handleClientSearch(value);
		} else {
			setClientSearchResults([]);
		}
		clearFieldError("clientSearch");
	};

	// Поиск заявок
	const handleBookingSearch = async (query: string) => {
		// Поиск по ID заявки
		const bookingId = parseInt(query);
		if (isNaN(bookingId)) {
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
						data.bookings.map((b: any) => ({
							id: b.id,
							scheduledDate: b.scheduledDate,
							scheduledTime: b.scheduledTime,
							status: b.status,
							contactPhone: b.contactPhone,
						}))
					);
				} else {
					setBookingSearchResults([]);
				}
			}
		} catch (error) {
			console.error("Ошибка поиска заявок:", error);
		} finally {
			setIsSearchingBookings(false);
		}
	};

	const handleBookingSelect = (booking: { id: number; scheduledDate: string | Date; scheduledTime: string; status: string; contactPhone: string }) => {
		if (!canEdit) {
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
		if (!canEdit) {
			return;
		}

		setBookingSearch(value);
		if (value.trim() !== "") {
			handleBookingSearch(value);
		} else {
			setBookingSearchResults([]);
		}
		clearFieldError("bookingSearch");
	};

	const handleBookingDepartmentSelect = (departmentId: string) => {
		if (!canEdit) {
			return;
		}

		const department = bookingDepartments.find((d) => d.id.toString() === departmentId);
		if (department) {
			setSelectedBookingDepartment(department);
		} else {
			setSelectedBookingDepartment(null);
		}
		clearFieldError("bookingDepartmentId");
	};

	const handleRemoveProduct = (sku: string) => {
		if (!canEdit) {
			return;
		}

		setOrderItems((prev) => prev.filter((item) => item.product_sku !== sku));
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

	const [isExpanded, setIsExpanded] = useState(isActive);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div className={`statusBlock borderBlock ${isExpanded ? "active" : ""}`}>
			<div className={`statusHeader`} onClick={toggleExpand}>
				<h3>2. Подтверждённый</h3>
				{statusDate && <span className={`statusDate`}>Присвоен: {formatDate(statusDate)}</span>}
			</div>
			<div className={`statusFields`}>
				<div className={`formRow`}>
					<div className={`formField`}>
						<label htmlFor="clientSearch">Клиент</label>
						<div className={`selectedClient`}>
							<span>
								{selectedClient ? (
									<Link href={`/admin/users/${selectedClient.id}`} className="itemLink" target="_blank">
										{selectedClient.first_name} {selectedClient.last_name} ({selectedClient.phone})
									</Link>
								) : (
									"Не указан"
								)}
							</span>
							{selectedClient && canEdit && (
								<button
									type="button"
									onClick={() => {
										setSelectedClient(null);
										setClientSearch("");
										clearFieldError("clientSearch");
									}}
									className={`removeButton`}
								>
									Убрать клиента ×
								</button>
							)}
						</div>
						{!selectedClient && (
							<div className={`searchContainer`}>
								<input
									id="clientSearch"
									type="text"
									value={clientSearch}
									onChange={(e) => handleClientManualInput(e.target.value)}
									onFocus={() => {
										if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
										setIsClientSearchFocused(true);
										clearFieldError("clientSearch");
									}}
									onBlur={handleClientBlur}
									placeholder="Поиск клиента по имени или телефону"
									className={`${fieldErrors.has("clientSearch") ? "error" : ""} ${isClientSearchFocused && clientSearch.length >= 2 ? "activeSearch" : ""}`}
									disabled={!canEdit}
								/>
								{isClientSearchFocused && isSearchingClients && clientSearch && (
									<div className="searchResults loading">
										<Loading />
									</div>
								)}

								{isClientSearchFocused && clientSearch && !isSearchingClients && (
									<div className="searchResults">
										{clientSearchResults.length > 0 ? (
											clientSearchResults.map((client) => (
												<div key={client.id} className={`searchResultItem`} onMouseDown={() => handleClientSelect(client)}>
													{client.first_name} {client.last_name} - {client.phone}
												</div>
											))
										) : (
											<div className={`searchResultItem`}>Нет результатов</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
				<div className="formRow">
					<div className={`formField`}>
						<label htmlFor="managerSearch">Ответственный</label>
						<div className={`selectedClient`}>
							<span>
								{selectedManager ? (
									<>
										<Link href={`/admin/users/${selectedManager.id}`} className="itemLink" target="_blank">
											{selectedManager.first_name} {selectedManager.last_name} ({selectedManager.phone})
										</Link>
										{selectedManager.department && (
											<>
												{" — "}
												<Link href={`/admin/departments/${selectedManager.department.id}`} className="itemLink" target="_blank">
													{selectedManager.department.name}
												</Link>
											</>
										)}
									</>
								) : (
									"Не указан"
								)}
							</span>
							{selectedManager && userRole !== "manager" && canEdit && (
								<button type="button" onClick={handleManagerClear} className={`removeButton`}>
									Убрать ответственного ×
								</button>
							)}
						</div>
						{!selectedManager && (
							<div className={`searchContainer`}>
								<input
									id="managerSearch"
									type="text"
									value={managerSearch}
									onChange={(e) => handleManagerManualInput(e.target.value)}
									onFocus={() => {
										if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
										setIsManagerSearchFocused(true);
										clearFieldError("managerSearch");
									}}
									onBlur={handleManagerBlur}
									placeholder={
										formData.departmentId
											? `Поиск менеджера отдела "${departments.find((d) => d.id.toString() === formData.departmentId)?.name || ""}"`
											: "Поиск менеджера по имени или телефону"
									}
									className={`${fieldErrors.has("managerSearch") ? "error" : ""} ${isManagerSearchFocused && managerSearch.length >= 2 ? "activeSearch" : ""}`}
									disabled={userRole === "manager" || !canEdit}
								/>
								{isManagerSearchFocused && isSearchingManagers && managerSearch && (
									<div className="searchResults loading">
										<Loading />
									</div>
								)}

								{isManagerSearchFocused && managerSearch && !isSearchingManagers && (
									<div className="searchResults">
										{managerSearchResults.length > 0 ? (
											managerSearchResults.map((manager) => (
												<div key={manager.id} className={`searchResultItem`} onMouseDown={() => handleManagerSelect(manager)}>
													{manager.first_name} {manager.last_name} - {manager.phone}
													{manager.department && ` (${manager.department.name})`}
												</div>
											))
										) : (
											<div className={`searchResultItem`}>Нет результатов</div>
										)}
									</div>
								)}
							</div>
						)}
						{userRole === "manager" && <p className="helpText">Менеджер всегда назначается ответственным автоматически.</p>}
						{userRole === "superadmin" && user && (!selectedManager || selectedManager.id !== user.id) && canEdit && (
							<button type="button" className="selfAssignButton" onClick={() => handleManagerSelect(user)}>
								Назначить себя ответственным
							</button>
						)}
					</div>
				</div>
				<div className="formRow">
					<div className={`formField`}>
						<label htmlFor="departmentId">Отдел</label>
						<div className={`selectedClient`}>
							<span>
								{currentDepartment ? (
									<Link href={`/admin/departments/${currentDepartment.id}`} className="itemLink" target="_blank">
										{currentDepartment.name}
									</Link>
								) : (
									"Не указан"
								)}
							</span>
						</div>
						{userRole === "superadmin" ? (
							<select
								id="departmentId"
								name="departmentId"
								value={formData.departmentId}
								onChange={(e) => handleDepartmentSelect(e.target.value)}
								onFocus={() => clearFieldError("departmentId")}
								onBlur={() => clearFieldError("departmentId")}
								className={fieldErrors.has("departmentId") ? "error" : ""}
								disabled={!canEdit}
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
								value={currentDepartment ? currentDepartment.name : departments.find((d) => d.id.toString() === formData.departmentId)?.name || "— Не выбран —"}
								disabled
								className={fieldErrors.has("departmentId") ? "error" : ""}
							/>
						)}
					</div>
				</div>

				{orderItems.length > 0 && (
					<div className={`formField`}>
						<label>Список товаров</label>
						<div className={`orderItemsList${canEdit ? " editable" : " readonly"}`}>
							{orderItems.map((item, index) => {
								const isExpanded = collapsedItems.has(item.product_sku);
								return (
									<div key={index} className={`orderItem borderBlock${canEdit ? " editable" : " readonly"}${isExpanded ? " active" : ""}`}>
										<span className="itemTitle" onClick={(e) => toggleItemVisibility(item.product_sku, e)}>
											{item.productId ? (
												<Link href={`/admin/product-management/products/${item.productId}`} className="itemLink" target="_blank">
													{item.product_title}
												</Link>
											) : (
												item.product_title
											)}
											<div className="buttonsBlock">
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
										</span>
										<div className="itemInfoBlock">
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
													<div className="formFieldTitle">Товар для автомобиля</div>
													<div className="formFieldInfo column">
														<input
															type="text"
															value={item.carModel || ""}
															onChange={(e) => handleProductFieldChange(item.product_sku, "carModel", e.target.value)}
															placeholder="Модель автомобиля"
															className="textInput"
															disabled={!canEdit}
														/>
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
											</div>

											<div className="formField formFieldGroup">
												<div className="formField">
													<div className="formFieldTitle">Количество</div>
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
												<div className="formField">
													<label>Цена за ед.</label>
													<input type="text" value={`${item.product_price} ₽`} disabled className="priceInput" />
												</div>
											</div>
											<div className="formField">
												<label>Сумма</label>
												<input type="text" value={`${(item.product_price * item.quantity).toLocaleString()} ₽`} disabled className="totalInput" />
											</div>

											<div className="itemFields">
												<div className="formRow">
													<div className="formField">
														<DatePickerField
															label="Дата поставки поставщиком"
															value={item.supplierDeliveryDate || ""}
															onChange={(date) => {
																handleProductFieldChange(item.product_sku, "supplierDeliveryDate", date || "");
																clearFieldError("supplierDeliveryDate");
															}}
															onFocus={() => clearFieldError("supplierDeliveryDate")}
															placeholder="Выберите дату поставки"
															className={fieldErrors.has("supplierDeliveryDate") ? `${datePickerFieldStyles.error}` : ""}
															disabled={!canEdit}
														/>
													</div>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				<div className="formField">
					<div className="orderTotal">
						<div className="totalRow">
							<span className="totalLabel">Общая сумма заказа:</span>
							<span className="totalAmount">{orderTotal.toLocaleString()} ₽</span>
						</div>
					</div>
				</div>

				<div className="formRow">
					<div className={`formField`}>
						<DatePickerField
							label="Дата финальной поставки клиенту"
							value={formData.finalDeliveryDate}
							onChange={(date) => {
								setFormData((prev) => ({ ...prev, finalDeliveryDate: date }));
								clearFieldError("finalDeliveryDate");
							}}
							placeholder="Выберите финальную дату поставки"
							className={fieldErrors.has("finalDeliveryDate") ? `${datePickerFieldStyles.error}` : ""}
							disabled={!canEdit}
						/>
					</div>
				</div>

				<div className="formRow">
					<div className={`formField`}>
						<label>Дата подтверждения</label>
						<div className="selectedClient">
							{orderData?.confirmationDate
								? new Date(orderData.confirmationDate).toLocaleDateString("ru-RU")
								: currentStatus === "confirmed"
								? "Будет установлена после сохранения"
								: "Не указана"}
						</div>
					</div>
				</div>

				{/* Поле для выбора заявки */}
				<div className="formRow">
					<div className={`formField`}>
						<label htmlFor="bookingSearch">Заявка</label>
						<div className={`selectedClient`}>
							<span>
								{selectedBooking ? (
									<Link href={`/admin/bookings/${selectedBooking.id}`} className="itemLink" target="_blank">
										Заявка #{selectedBooking.id} - {typeof selectedBooking.scheduledDate === "string" ? new Date(selectedBooking.scheduledDate).toLocaleDateString("ru-RU") : selectedBooking.scheduledDate.toLocaleDateString("ru-RU")} {selectedBooking.scheduledTime}
									</Link>
								) : (
									"Не указана"
								)}
							</span>
							{selectedBooking && canEdit && (
								<button
									type="button"
									onClick={() => {
										setSelectedBooking(null);
										setBookingSearch("");
										clearFieldError("bookingSearch");
									}}
									className={`removeButton`}
								>
									Убрать заявку ×
								</button>
							)}
						</div>
						{!selectedBooking && (
							<div className={`searchContainer`}>
								<input
									id="bookingSearch"
									type="text"
									value={bookingSearch}
									onChange={(e) => handleBookingManualInput(e.target.value)}
									onFocus={() => {
										if (bookingBlurTimeout.current) clearTimeout(bookingBlurTimeout.current);
										setIsBookingSearchFocused(true);
										clearFieldError("bookingSearch");
									}}
									onBlur={handleBookingBlur}
									placeholder="Поиск заявки по ID"
									className={`${fieldErrors.has("bookingSearch") ? "error" : ""} ${isBookingSearchFocused && bookingSearch.length > 0 ? "activeSearch" : ""}`}
									disabled={!canEdit}
								/>
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
													Заявка #{booking.id} - {typeof booking.scheduledDate === "string" ? new Date(booking.scheduledDate).toLocaleDateString("ru-RU") : booking.scheduledDate.toLocaleDateString("ru-RU")} {booking.scheduledTime}
												</div>
											))
										) : (
											<div className={`searchResultItem`}>Нет результатов</div>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Поле для выбора адреса */}
				<div className="formRow">
					<div className={`formField`}>
						<label htmlFor="bookingDepartmentId">Адрес доставки</label>
						<div className={`selectedClient`}>
							<span>
								{selectedBookingDepartment ? (
									<>
										{selectedBookingDepartment.name || "Адрес"} - {selectedBookingDepartment.address}
									</>
								) : (
									"Не указан"
								)}
							</span>
						</div>
						<select
							id="bookingDepartmentId"
							name="bookingDepartmentId"
							value={selectedBookingDepartment?.id.toString() || ""}
							onChange={(e) => handleBookingDepartmentSelect(e.target.value)}
							onFocus={() => clearFieldError("bookingDepartmentId")}
							className={fieldErrors.has("bookingDepartmentId") ? "error" : ""}
							disabled={!canEdit}
						>
							<option value="">— Не выбран —</option>
							{bookingDepartments.map((dept) => (
								<option key={dept.id} value={dept.id}>
									{dept.name || "Адрес"} - {dept.address}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>
		</div>
	);
};

export default StatusConfirmedSection;
