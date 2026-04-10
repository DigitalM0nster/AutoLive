import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Loading from "@/components/ui/loading/Loading";
import SearchDropdownInput from "@/components/ui/searchDropdownInput/SearchDropdownInput";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import { DepartmentForLog, Order, OrderFormState, OrderItemClient, User } from "@/lib/types";
import { getSupplierVsFinalDeliveryDateConflicts } from "@/lib/orderStatusValidation";
import statusStyles from "./StatusConfirmedSection.module.scss";

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
	/** Позиции заказа (состав, количество и т.д.) */
	canEditOrderItems: boolean;
	/** Дата поставки поставщиком: шире, чем полный состав (менеджер до сохранения «Подтверждён»; админ/суперадмин всегда) */
	canEditSupplierDeliveryDates: boolean;
	userRole?: string;
	user: User | null;
	departments: DepartmentForLog[];
	orderItems: OrderItemClient[];
	setOrderItems: React.Dispatch<React.SetStateAction<OrderItemClient[]>>;
	orderTotal: number;
	orderData: Order | null;
	currentStatus: string;
	statusDate?: string | null;
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
	canEditOrderItems,
	canEditSupplierDeliveryDates,
	userRole,
	user,
	departments,
	orderItems,
	setOrderItems,
	orderTotal,
	orderData,
	currentStatus,
	statusDate,
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
	const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
	const [isManagerSearchFocused, setIsManagerSearchFocused] = useState(false);
	const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

	/** Живое сравнение дат поставщика и финальной даты (до нажатия «Сохранить») */
	const supplierFinalConflicts = useMemo(() => {
		const items = orderItems.map((i) => ({
			product_sku: i.product_sku,
			supplierDeliveryDate: i.supplierDeliveryDate,
		}));
		return getSupplierVsFinalDeliveryDateConflicts(formData.finalDeliveryDate, items);
	}, [formData.finalDeliveryDate, orderItems]);

	const conflictBySku = useMemo(() => new Map(supplierFinalConflicts.map((c) => [c.productSku, c])), [supplierFinalConflicts]);

	const supplierDateComparison = useMemo(() => {
		const finalRaw = formData.finalDeliveryDate;
		const hasFinal = Boolean(finalRaw && String(finalRaw).trim());
		const withSupplier = orderItems.filter((i) => Boolean(i.supplierDeliveryDate && String(i.supplierDeliveryDate).trim()));
		const allFilled = orderItems.length > 0 && withSupplier.length === orderItems.length;
		if (!hasFinal) {
			return {
				kind: "neutral" as const,
				text: "Укажите дату финальной поставки клиенту — ниже появится проверка: дата поставщика по каждой позиции не должна быть позже этой даты.",
			};
		}
		if (orderItems.length === 0) {
			return {
				kind: "neutral" as const,
				text: "Нет позиций в заказе — нечего сравнивать по датам.",
			};
		}
		if (supplierFinalConflicts.length > 0) {
			return {
				kind: "warn" as const,
				title: "Несогласованность дат (проверка до сохранения)",
				lines: supplierFinalConflicts.map((c) => c.message),
			};
		}
		// Даты согласованы и конфликтов нет — ничего не показываем (ни зелёного «успеха»)
		if (allFilled) {
			return { kind: "none" as const };
		}
		return {
			kind: "neutral" as const,
			text: "Финальная дата указана. Заполните дату поставки поставщиком по всем позициям — тогда проверка будет полной.",
		};
	}, [formData.finalDeliveryDate, orderItems, supplierFinalConflicts]);

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
		if (!canEditOrderItems) {
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
		const allow =
			field === "supplierDeliveryDate" ? canEditSupplierDeliveryDates : canEditOrderItems;
		if (!allow) {
			return;
		}

		setOrderItems((prev) => prev.map((item) => (item.product_sku === productSku ? { ...item, [field]: value } : item)));
	};

	const [isExpanded, setIsExpanded] = useState(isActive);

	useEffect(() => {
		setIsExpanded(isActive);
	}, [isActive]);

	const toggleExpand = () => {
		setIsExpanded(!isExpanded);
	};

	return (
		<div className={`statusBlock borderBlock ${isExpanded ? "active" : ""}`}>
			<div className={`statusHeader statusToneConfirmed`} onClick={toggleExpand}>
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
							<SearchDropdownInput
								id="clientSearch"
								value={clientSearch}
								onChange={handleClientManualInput}
								onFocus={() => {
									if (clientBlurTimeout.current) clearTimeout(clientBlurTimeout.current);
									setIsClientSearchFocused(true);
									clearFieldError("clientSearch");
								}}
								onBlur={handleClientBlur}
								placeholder="Поиск клиента по имени или телефону"
								hasError={fieldErrors.has("clientSearch")}
								isActiveSearch={isClientSearchFocused && clientSearch.length >= 2}
								showDropdown={isClientSearchFocused && Boolean(clientSearch)}
								disabled={!canEdit}
							>
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
							</SearchDropdownInput>
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
							<SearchDropdownInput
								id="managerSearch"
								value={managerSearch}
								onChange={handleManagerManualInput}
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
								hasError={fieldErrors.has("managerSearch")}
								isActiveSearch={isManagerSearchFocused && managerSearch.length >= 2}
								showDropdown={isManagerSearchFocused && Boolean(managerSearch)}
								disabled={userRole === "manager" || !canEdit}
							>
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
							</SearchDropdownInput>
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

				<div className={`formField${fieldErrors.has("productSearch") ? " orderCompositionFieldError" : ""}`}>
					<div>Товары в заказе ({orderItems.length})</div>
					<div className="productItemsList">
						{orderItems.map((item, index) => {
							const isExpanded = collapsedItems.has(item.product_sku);
							const skuKey = `supplierDeliveryDate_${item.product_sku}`;
							const lineMainReadonly = !canEditOrderItems;
							const dateRowReadonly = !canEditSupplierDeliveryDates;
							return (
								<div key={index} className={`productItem borderBlock${isExpanded ? " active" : ""}`}>
										<div
											className={`productItemMain${lineMainReadonly ? " productItemReadonlySegment" : ""}`}
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
											className={`formField${dateRowReadonly ? " productItemReadonlySegment" : ""}`}
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
												placeholder="Выберите дату поставки"
												className={
													fieldErrors.has("supplierDeliveryDate") ||
													fieldErrors.has(skuKey) ||
													conflictBySku.has(item.product_sku)
														? `${datePickerFieldStyles.error}`
														: ""
												}
												disabled={!canEditSupplierDeliveryDates}
											/>
											{conflictBySku.has(item.product_sku) ? (
												<p className={statusStyles.lineHintWarn}>{conflictBySku.get(item.product_sku)!.message}</p>
											) : null}
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
											<div className={`itemInfoBlock${lineMainReadonly ? " productItemReadonlySegment" : ""}`}>
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
																		{item.department?.id ? (
																			<Link href={`/admin/departments/${item.department.id}`} className="itemLink" target="_blank">
																				{item.department.name}
																			</Link>
																		) : (
																			"—"
																		)}
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
					</div>

				{supplierDateComparison.kind === "neutral" ? (
					<div className={statusStyles.comparisonNeutral} role="status">
						{supplierDateComparison.text}
					</div>
				) : null}
				{supplierDateComparison.kind === "warn" ? (
					<div className={statusStyles.comparisonWarn} role="status">
						<div className={statusStyles.comparisonTitle}>{supplierDateComparison.title}</div>
						<ul className={statusStyles.comparisonList}>
							{supplierDateComparison.lines.map((line, i) => (
								<li key={`${line}-${i}`}>{line}</li>
							))}
						</ul>
					</div>
				) : null}

				<div className="formRow">
					<div className={`formField`}>
						<DatePickerField
							label="Дата финальной поставки клиенту"
							value={formData.finalDeliveryDate}
							onChange={(date) => {
								setFormData((prev) => ({ ...prev, finalDeliveryDate: date }));
								clearFieldError("finalDeliveryDate");
								for (const it of orderItems) {
									clearFieldError(`supplierDeliveryDate_${it.product_sku}`);
								}
							}}
							placeholder="Выберите финальную дату поставки"
							className={
								fieldErrors.has("finalDeliveryDate") || supplierFinalConflicts.length > 0 ? `${datePickerFieldStyles.error}` : ""
							}
							disabled={!canEdit}
						/>
						{supplierFinalConflicts.length > 0 ? (
							<p className={statusStyles.lineHintWarn}>
								Сохранение будет отклонено, пока дата поставки поставщиком хотя бы по одной позиции позже финальной даты клиенту — измените даты
								выше или финальную дату.
							</p>
						) : null}
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
