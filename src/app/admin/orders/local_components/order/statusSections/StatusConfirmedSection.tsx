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
import OrderStatusBlock, { OrderStatusFieldGroup } from "../OrderStatusBlock";
import { ClientSearchResultsPanel, ClientSelectedSummary } from "@/components/admin/clientSearch/ClientSearchDropdownItems";
import { ManagerSearchResultsPanel, ManagerSelectedSummary } from "@/components/admin/managerSearch/ManagerSearchDropdownItems";
import type { ClientSearchListRow } from "@/lib/clientSearchDisplay";
import type { ManagerSearchListRow } from "@/lib/managerSearchDisplay";
import { OrderCompositionItem, OrderCompositionToolbar, orderCompositionStyles } from "../OrderCompositionItem";

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
	const [clientSearch, setClientSearch] = useState("");
	const [clientSearchResults, setClientSearchResults] = useState<ClientSearchListRow[]>([]);
	const [isSearchingClients, setIsSearchingClients] = useState(false);

	const [managerSearch, setManagerSearch] = useState("");
	const [managerSearchResults, setManagerSearchResults] = useState<ManagerSearchListRow[]>([]);
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
				setClientSearchResults((data.users || []) as ClientSearchListRow[]);
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
				let filteredManagers: ManagerSearchListRow[] = ((data.users || []) as ManagerSearchListRow[]).filter((candidate) => {
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
						filteredManagers.push(user as ManagerSearchListRow);
					}
				} else if (userRole === "manager" && user) {
					filteredManagers = [user as ManagerSearchListRow];
				}

				setManagerSearchResults(filteredManagers);
			}
		} catch (error) {
			console.error("Ошибка поиска сотрудников:", error);
		} finally {
			setIsSearchingManagers(false);
		}
	};

	const handleClientSelect = (client: ClientSearchListRow) => {
		if (!canEdit) {
			return;
		}

		setSelectedClient(client as User);
		setClientSearch("");
		setClientSearchResults([]);
		setIsClientSearchFocused(false);
	};

	const handleManagerSelect = (manager: ManagerSearchListRow) => {
		if (!canEdit) {
			return;
		}

		const managerDepartmentId = manager.department?.id ?? manager.departmentId ?? null;

		const applyManager = (departmentIdValue: string) => {
			setSelectedManager(manager as User);
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

	return (
		<OrderStatusBlock step={2} title="Подтверждённый" tone="confirmed" isActive={isActive} statusDate={statusDate}>
			<OrderStatusFieldGroup title="Участники заказа">
				<div className={`formRow`}>
					<div className={`formField`}>
						<label htmlFor="clientSearch">Клиент</label>
						{selectedClient ? (
							<div className={statusStyles.clientSelectedBlock}>
								<ClientSelectedSummary client={selectedClient} />
								{canEdit ? (
									<button
										type="button"
										onClick={() => {
											setSelectedClient(null);
											setClientSearch("");
											clearFieldError("clientSearch");
										}}
										className="removeButton"
									>
										Убрать клиента ×
									</button>
								) : null}
							</div>
						) : (
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
								{isClientSearchFocused && clientSearch ? (
									<ClientSearchResultsPanel loading={isSearchingClients} results={clientSearchResults} onSelect={handleClientSelect} />
								) : null}
							</SearchDropdownInput>
						)}
					</div>
				</div>
				<div className="formRow">
					<div className={`formField`}>
						<label htmlFor="managerSearch">Ответственный</label>
						{selectedManager ? (
							<div className={statusStyles.clientSelectedBlock}>
								<ManagerSelectedSummary manager={selectedManager} />
								{userRole !== "manager" && canEdit ? (
									<button type="button" onClick={handleManagerClear} className="removeButton">
										Убрать ответственного ×
									</button>
								) : null}
							</div>
						) : (
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
								{isManagerSearchFocused && managerSearch ? (
									<ManagerSearchResultsPanel loading={isSearchingManagers} results={managerSearchResults} onSelect={handleManagerSelect} />
								) : null}
							</SearchDropdownInput>
						)}
						{userRole === "manager" && <p className="helpText">Менеджер всегда назначается ответственным автоматически.</p>}
						{userRole === "superadmin" && user && (!selectedManager || selectedManager.id !== user.id) && canEdit && (
							<button type="button" className={statusStyles.selfAssignButton} onClick={() => handleManagerSelect(user as ManagerSearchListRow)}>
								Назначить себя ответственным
							</button>
						)}
					</div>
				</div>
				<div className={statusStyles.fieldBody}>
					<label htmlFor="departmentId">Отдел</label>
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
					) : currentDepartment ? (
						<Link href={`/admin/departments/${currentDepartment.id}`} className={`itemLink ${statusStyles.departmentLink}`} target="_blank">
							{currentDepartment.name}
						</Link>
					) : (
						<input
							type="text"
							value={departments.find((d) => d.id.toString() === formData.departmentId)?.name || "— Не выбран —"}
							disabled
							className={fieldErrors.has("departmentId") ? "error" : ""}
						/>
					)}
				</div>
			</OrderStatusFieldGroup>

			<OrderStatusFieldGroup title="Состав заказа" hint="Позиции заказа, количество и даты поставки от поставщика">
				<div className={`${statusStyles.compositionBody}${fieldErrors.has("productSearch") ? " orderCompositionFieldError" : ""}`}>
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
									canEditSupplierDates={canEditSupplierDeliveryDates}
									supplierDatePlaceholder="Выберите дату поставки"
									fieldErrors={fieldErrors}
									skuKey={skuKey}
									conflictMessage={conflictBySku.get(item.product_sku)?.message ?? null}
									onToggleExpand={toggleItemVisibility}
									onRemove={handleRemoveProduct}
									onProductFieldChange={handleProductFieldChange}
									onQuantityChange={handleQuantityChange}
									clearFieldError={clearFieldError}
								/>
							);
						})}
					</div>
				</div>
			</OrderStatusFieldGroup>

			<OrderStatusFieldGroup title="Сроки поставки">
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
					className={fieldErrors.has("finalDeliveryDate") || supplierFinalConflicts.length > 0 ? `${datePickerFieldStyles.error}` : ""}
					disabled={!canEdit}
				/>
				{supplierFinalConflicts.length > 0 ? (
					<p className={statusStyles.lineHintWarn}>
						Сохранение будет отклонено, пока дата поставки поставщиком хотя бы по одной позиции позже финальной даты клиенту — измените даты
						выше или финальную дату.
					</p>
				) : null}

				<div className={statusStyles.fieldBody}>
					<label>Дата подтверждения</label>
					<span className={statusStyles.readonlyValue}>
						{orderData?.confirmationDate
							? new Date(orderData.confirmationDate).toLocaleDateString("ru-RU")
							: currentStatus === "confirmed"
								? "Будет установлена после сохранения"
								: "Не указана"}
					</span>
				</div>
			</OrderStatusFieldGroup>
		</OrderStatusBlock>
	);
};

export default StatusConfirmedSection;
