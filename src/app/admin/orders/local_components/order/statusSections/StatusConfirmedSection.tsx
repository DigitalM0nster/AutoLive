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
}) => {
	const [clientSearch, setClientSearch] = useState("");
	const [clientSearchResults, setClientSearchResults] = useState<User[]>([]);
	const [isSearchingClients, setIsSearchingClients] = useState(false);

	const [managerSearch, setManagerSearch] = useState("");
	const [managerSearchResults, setManagerSearchResults] = useState<User[]>([]);
	const [isSearchingManagers, setIsSearchingManagers] = useState(false);

	const clientBlurTimeout = useRef<NodeJS.Timeout | null>(null);
	const managerBlurTimeout = useRef<NodeJS.Timeout | null>(null);
	const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
	const [isManagerSearchFocused, setIsManagerSearchFocused] = useState(false);

	useEffect(() => {
		return () => {
			if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
			if (managerBlurTimeout.current) clearTimeout(managerBlurTimeout.current);
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
				<h3>2. Подтверждённый</h3>
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
						{userRole === "manager" && <p className="helpText">Менеджер всегда назначается ответственным автоматически.</p>}
						{userRole === "superadmin" && user && (!selectedManager || selectedManager.id !== user.id) && canEdit && (
							<button type="button" className="selfAssignButton" onClick={() => handleManagerSelect(user)}>
								Назначить себя ответственным
							</button>
						)}
					</div>
				</div>

				{orderItems.length > 0 && (
					<div className={`formField`}>
						<label>Список товаров</label>
						<div className={`orderItemsList${canEdit ? " editable" : " readonly"}`}>
							{orderItems.map((item, index) => (
								<div key={index} className={`orderItem borderBlock${canEdit ? " editable" : " readonly"}`}>
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
											<div className="formField">
												<label>Сумма</label>
												<input type="text" value={`${(item.product_price * item.quantity).toLocaleString()} ₽`} disabled className="totalInput" />
											</div>
										</div>

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
							))}
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
			</div>
		</div>
	);
};

export default StatusConfirmedSection;
