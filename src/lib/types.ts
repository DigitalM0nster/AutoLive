// src\lib\types.ts
import { Prisma } from "@prisma/client";
import type { OrderCommentWire } from "@/lib/orderComments";

export type Role = "superadmin" | "admin" | "manager" | "client";
export type Department = {
	id: number;
	name: string;
	productCount?: number;
	allowedCategories: { category: Category }[];
	users: User[];
	products: { id: number; title: string; sku: string; brand: string; price: number }[];
};

export type DepartmentForLog = {
	id: number;
	name: string;
};

export type DepartmentForProduct = {
	id: number;
	name: string;
};

export type User = {
	id: number;
	first_name: string;
	last_name: string;
	middle_name: string;
	phone: string;
	role: Role;
	department?: Department;
	departmentId?: number | null;
	status: string;
	orders: {
		id: number;
		comments: Prisma.JsonValue;
		status: string;
		createdAt: string;
	}[];
};

// Типы для логов пользователей
export type UserLogAction = "create" | "update" | "delete" | "Создание" | "Редактирование" | "Удаление";

export type UserLog = {
	id: number;
	createdAt: string;
	action?: UserLogAction; // Поле для совместимости с компонентом
	actions: UserLogAction[]; // Массив действий
	message?: string | null;
	adminId?: number;
	admin?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		middle_name?: string | null;
		role: string;
		department?: DepartmentForLog | null;
	};
	targetUserId?: number | null;
	targetUser: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		phone: string;
		role: string;
		department?: DepartmentForLog | null;
	};
	departmentId?: number | null;
	department?: DepartmentForLog | null;
	snapshotBefore?: any;
	snapshotAfter?: any;
	adminSnapshot?: any;
};

export type UserLogResponse = {
	data: UserLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};

// Типы для логов отделов
export type DepartmentLogAction = "create_department" | "change_name" | "change_categories" | "add_employees" | "remove_employees" | "delete_department";

export type DepartmentLog = {
	id: number;
	createdAt: string;
	actions: DepartmentLogAction[]; // Массив действий
	message?: string | null;
	adminId?: number;
	admin?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		middle_name?: string | null;
		role: string;
		department?: DepartmentForLog | null;
	};
	targetDepartmentId?: number | null;
	targetDepartment: Department;
	snapshotBefore?: any;
	snapshotAfter?: any;
	adminSnapshot?: any;
};

export type DepartmentLogResponse = {
	data: DepartmentLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};

// Типы для фильтров категорий
export type FilterType = "select" | "multi_select" | "range" | "boolean";

export type FilterValue = {
	id: number;
	value: string;
};

export type CategoryFilter = {
	id: number;
	title: string;
	type: FilterType;
	unit?: string; // Единица измерения для range фильтров
	values: FilterValue[];
};

export type Category = {
	id: number;
	title: string;
	image?: string | null;
	products?: Product[];
	filters?: CategoryFilter[]; // Обновленный тип
	productCount?: number;
	allowedDepartments?: { departmentId: number }[];
	order: number;
	/** false — скрыть карточку категории на витрине (список /categories) */
	visibleOnSite?: boolean;
};

export type Product = {
	id: number;
	sku: string;
	title: string;
	description: string;
	price: number;
	supplierPrice?: number | null;
	image?: string | null;
	brand: string;
	createdAt: string;
	updatedAt: string;
	categoryId: number | null;
	categoryTitle: string;
	department?: DepartmentForProduct;
	filters: {
		filterId: number;
		valueId: number;
		value: string;
	}[];
	allowedCategories?: Category[];
	canChangeCategory?: boolean;
};

export type ProductWithRelationsFromDB = Prisma.ProductGetPayload<{
	include: {
		category: true;
		department: true;
	};
}>;

// 💡 API-ответ для списка товаров
export type ProductListItem = {
	category?: {
		id: number;
		title: string;
	};
	department?: DepartmentForProduct;
	id: number;
	sku: string;
	title: string;
	description: string | null;
	price: number;
	supplierPrice?: number | null;
	brand: string;
	image: string | null;
	createdAt: string;
	updatedAt: string;
	categoryId: number | null;
	departmentId: number | null;
	categoryTitle: string;
};

// 🧑‍🎨 UI: форма
export type ProductFormData = {
	sku: string;
	title: string;
	description: string;
	price: string;
	supplierPrice: string;
	brand: string;
	categoryId: string;
	image: string;
	departmentId?: string;
};

// 🆕 Новый товар
export type NewProduct = Omit<EditableProduct, "id" | "createdAt" | "updatedAt" | "categoryTitle">;

// ✏️ UI: редактируемый товар
export type EditableProduct = {
	id: number;
	sku: string;
	title: string;
	description: string;
	price: number;
	supplierPrice?: number | null;
	brand: string;
	image: string | null;
	createdAt: string;
	updatedAt: string;
	categoryId: number | null;
	categoryTitle: string;
	departmentId?: number | null;
	department?: DepartmentForProduct;
	isEditing?: boolean;
	filters: any[];
};

export type ProductFilter = {
	id: number;
	title: string;
	selectedValues: {
		id: number;
		value: string;
	}[];
};

// Тип для фильтра категории (для выбора)
export type CategoryFilterForSelection = {
	id: number;
	title: string;
	type: FilterType;
	unit?: string; // Единица измерения для range фильтров
	values: FilterValue[];
};

// Тип для выбранных значений фильтра
export type SelectedFilterValue = {
	filterId: number;
	valueIds: number[];
	// Для диапазона (range) - числовое значение
	rangeValue?: number;
};

export type ProductResponse = {
	product?: Omit<Product, "filters"> & {
		categoryId: number;
		filters?: ProductFilter[];
	};
	error?: string;
};

// Типы для логов продуктов
export type ProductLogAction = "create" | "update" | "delete" | "import" | "skipped" | "duplicate" | "bulk" | "bulk_delete";

export type ProductLog = {
	id: number;
	createdAt: string;
	action: ProductLogAction;
	message?: string | null;
	admin?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		middle_name?: string | null;
		phone?: string;
		role: string;
		department?: DepartmentForLog | null;
	};
	targetProduct?: {
		id: number;
		title: string;
		sku: string;
		brand: string;
		price: number;
		category?: { id: number; title: string };
		description?: string;
		department?: DepartmentForLog;
	};
	snapshotBefore?: any;
	snapshotAfter?: any;
	userSnapshot?: any;
	departmentSnapshot: DepartmentForLog | null; // Основное поле для отдела товара (единственное число)
	departmentsSnapshot?: DepartmentForLog[] | null; // Для массовых операций (множественное число)
	productSnapshot?: any; // Для массовых операций (как в логе импорта)
	importLogId?: number | null; // Ссылка на лог импорта
	importLogData?: any; // Данные лога импорта для отображения
	// Данные для массовых операций
	bulkLogId?: number; // ID лога массовой операции
	bulkLogData?: any; // Данные лога массовой операции (содержит productsSnapshot внутри)
	// Данные для пропущенных и повторных товаров
	skippedProduct?: any;
	duplicateProduct?: any;
};

export type ProductLogResponse = {
	data: ProductLog[];
	total: number;
	page: number;
	totalPages: number;
	currentPage: number;
	targetProduct?: {
		id: number;
		title: string;
		sku: string;
		brand: string;
		price: number;
		category?: { id: number; title: string };
		department?: DepartmentForLog;
	};
	error?: string;
};

// Типы для комплектов ТО
export type ServiceKitItemAnalog = {
	id: number;
	serviceKitItemId: number;
	analogProductId: number;
	analogProduct?: Product;
};

export type ServiceKitItem = {
	id: number;
	kitId: number;
	productId: number;
	product?: Product;
	analogs: ServiceKitItemAnalog[];
};

export type ServiceKit = {
	id: number;
	title: string;
	name: string; // Для совместимости с фронтендом
	image?: string;
	description?: string;
	price?: number;
	createdAt?: string | Date;
	updatedAt?: string | Date;
	// Детальная информация об элементах комплекта
	kitItems?: ServiceKitItem[];
	// Упрощенная структура для фронтенда (совместимость)
	parts?: {
		name: string;
		analogs: string[] | Product[];
	}[];
};

// Типы для логов комплектов ТО
export type ServiceKitLogAction = "create" | "update" | "delete";

export type ServiceKitSnapshotForLog = {
	id: number;
	title: string;
	description: string | null;
	image: string | null;
	price: number;
};

export type ServiceKitLog = {
	id: number;
	createdAt: string | Date;
	action: ServiceKitLogAction | string;
	message?: string | null;
	serviceKitId: number;
	adminSnapshot?: AdminSnapshotForBookingLog | null;
	serviceKitSnapshot?: ServiceKitSnapshotForLog | null;
};

export type ServiceKitLogResponse = {
	data: ServiceKitLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};

export type Promotion = {
	id: number;
	title: string;
	description: string;
	image: string;
	order: number;
	buttonText: string;
	buttonLink: string;
	startDate: string | null;
	endDate: string | null;
};

export type AdminData = {
	id: number;
	first_name: string | null;
	last_name: string | null;
	phone: string;
	avatar: string | null;
	role: string;
	permissions: string[];
};

// Типы для фильтров
export interface FilterOption {
	value: string;
	label: string;
}

export interface ActiveFilter {
	key: string;
	label: string;
	value: string;
}

export interface FiltersBlockProps {
	activeFilters: ActiveFilter[];
	onResetFilters: () => void;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	searchPlaceholder?: string;
	showSearch?: boolean;
	disabled?: boolean;
	className?: string;
	children?: React.ReactNode;
	hasRealActiveFilters?: boolean; // Новое свойство для определения реальных активных фильтров
	onSelectAllByFilters?: () => void; // Функция для выделения всех товаров по фильтрам
	isLoadingBulkOperation?: boolean; // Состояние загрузки массовых операций
	selectedProductsCount?: number; // Количество выделенных товаров
	onBulkDelete?: () => void; // Функция для массового удаления
	onBulkExport?: () => void; // Функция для массового экспорта
	onClearSelection?: () => void; // Функция для снятия выделения
}

// Типы для логирования фильтров
export type FilterValueForLog = {
	filterId: number;
	filterTitle: string;
	valueId: number;
	value: string;
};

export type FilterValueFromRequest = {
	filterId: number;
	valueId: number;
};

// Типы для запросов с фильтрами
export type FilterRequest = {
	filterId: number;
	valueIds: number[];
};

export type ProductCreateRequest = {
	title: string;
	sku: string;
	brand: string;
	price?: number;
	supplierPrice?: number;
	description?: string;
	image?: string;
	categoryId?: number;
	departmentId?: number;
	filterValues?: FilterRequest[];
};

export type ProductUpdateRequest = {
	title?: string;
	sku?: string;
	brand?: string;
	price?: number;
	supplierPrice?: number;
	description?: string;
	image?: string;
	categoryId?: number;
	departmentId?: number;
	filterValues?: FilterRequest[];
};

// ===== ТИПЫ ДЛЯ ЗАКАЗОВ =====

export type OrderStatus = "created" | "confirmed" | "booked" | "ready" | "paid" | "completed" | "returned";

export type Order = {
	id: number;
	/** JSON-массив комментариев в БД; на клиенте — parseOrderCommentsFromDb */
	comments: Prisma.JsonValue;
	contactName?: string | null;
	contactPhone?: string | null;
	status: OrderStatus;
	createdAt: string | Date;
	updatedAt: string | Date;
	confirmationDate?: string | Date | null;
	finalDeliveryDate?: string | Date | null;
	assignedAt?: string | Date | null;
	statusChangeDate?: string | Date | null; // Дата присвоения текущего статуса
	managerId?: number | null;
	departmentId?: number | null;
	clientId?: number | null;
	bookingId?: number | null; // Связь с заявкой
	bookingDepartmentId?: number | null; // Адрес доставки (отдел для записей)
	deliveryPickupPointId?: number | null; // Адрес доставки (пункт выдачи; взаимоисключающе с bookingDepartmentId)
	createdBy?: number | null;
	// Связи
	manager?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		role: string;
		department?: DepartmentForLog | null;
	} | null;
	department?: DepartmentForLog | null;
	client?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		phone: string;
	} | null;
	creator?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		role: string;
		department?: DepartmentForLog | null;
	} | null;
	booking?: {
		id: number;
		scheduledDate: string | Date;
		scheduledTime: string;
		status: BookingStatus;
		contactPhone: string;
		/** Менеджер записи (часто заполнен, когда в карточке ТО нет ответственного) */
		manager?: {
			id: number;
			first_name: string | null;
			last_name: string | null;
			role: string;
			phone?: string | null;
		} | null;
		/** Клиент, указанный в записи */
		client?: {
			id: number;
			first_name: string | null;
			last_name: string | null;
			phone: string;
		} | null;
		/** Отдел для записи (не путать с bookingDepartment заказа — адрес доставки) */
		bookingDepartment?: {
			id: number;
			name: string | null;
			address: string;
			phones: string[];
			emails: string[];
		} | null;
	} | null;
	bookingDepartment?: BookingDepartment | null;
	/** Пункт выдачи как адрес доставки заказа */
	deliveryPickupPoint?: {
		id: number;
		name: string | null;
		address: string;
		phones: string[];
		emails: string[];
	} | null;
	orderItems: OrderItem[];
};

export type OrderItem = {
	id: number;
	orderId: number;
	product_sku: string;
	product_title: string;
	product_price: number;
	product_brand: string;
	product_image?: string | null;
	quantity: number;
};

export type OrderItemClient = Omit<OrderItem, "id" | "orderId"> & {
	id?: number;
	orderId?: number;
	supplierDeliveryDate?: string;
	carModel?: string;
	vinCode?: string;
	department: DepartmentForProduct;
	productId?: number;
};

export type OrderFormState = {
	clientId: string;
	departmentId: string;
	managerId: string;
	contactName: string;
	contactPhone: string;
	finalDeliveryDate: string;
	bookedUntil: string;
	readyUntil: string;
	prepaymentAmount: string;
	prepaymentDate: string;
	paymentDate: string;
	orderAmount: string;
	completionDate: string;
	returnReason: string;
	returnDate: string;
	returnAmount: string;
	returnPaymentDate: string;
	returnDocumentNumber: string;
};

// Тип для создания заказа
export type CreateOrderRequest = {
	clientId?: number; // Для заказов от пользователей
	managerId?: number; // Ответственный менеджер
	departmentId?: number; // Для заказов созданных админом (только для суперадмина)
	bookingId?: number | null; // Связь с заявкой
	bookingDepartmentId?: number | null; // Адрес доставки (отдел для записей)
	deliveryPickupPointId?: number | null; // Пункт выдачи
	orderItems: {
		product_sku: string;
		product_title: string;
		product_price: number;
		product_brand: string;
		product_image?: string | null;
		quantity: number;
		supplierDeliveryDate?: string; // Дата поставки поставщиком
		carModel?: string; // Название автомобиля
		vinCode?: string; // VIN-код автомобиля
	}[];
	// Поля для статусов заказа
	contactName?: string;
	contactPhone?: string; // 1. Новый - контактный телефон
	bookedUntil?: string; // 3. Забронирован - забронирован до
	readyUntil?: string; // 4. Готов к выдаче - отложен до
	prepaymentAmount?: number; // 4. Готов к выдаче - сумма предоплаты
	prepaymentDate?: string; // 4. Готов к выдаче - дата внесения предоплаты
	paymentDate?: string; // 5. Оплачен - дата внесения оплаты
	orderAmount?: number; // 5. Оплачен - сумма заказа (нередактируемое)
	completionDate?: string; // 6. Выполнен - дата выполнения
	returnReason?: string; // 7. Возврат - причина возврата позиции
	returnDate?: string; // 7. Возврат - дата возврата позиции
	returnAmount?: number; // 7. Возврат - сумма возврата
	returnPaymentDate?: string; // 7. Возврат - дата возврата денежных средств
	returnDocumentNumber?: string; // 7. Возврат - номер документа возврата средств
	finalDeliveryDate?: string; // 2. Подтвержденный - финальная дата поставки клиенту
	comments?: OrderCommentWire[];
	status?: OrderStatus;
};

// Тип для обновления заказа
export type UpdateOrderRequest = {
	comments?: OrderCommentWire[];
	contactName?: string | null;
	contactPhone?: string | null;
	status?: OrderStatus;
	clientId?: number | null;
	managerId?: number | null; // Назначение/снятие менеджера
	departmentId?: number | null;
	finalDeliveryDate?: string | null;
	bookingId?: number | null; // Связь с заявкой
	bookingDepartmentId?: number | null; // Адрес доставки (отдел для записей)
	deliveryPickupPointId?: number | null; // Пункт выдачи
	bookedUntil?: string | null;
	readyUntil?: string | null;
	prepaymentAmount?: number | null;
	prepaymentDate?: string | null;
	paymentDate?: string | null;
	orderAmount?: number | null;
	completionDate?: string | null;
	returnReason?: string | null;
	returnDate?: string | null;
	returnAmount?: number | null;
	returnPaymentDate?: string | null;
	returnDocumentNumber?: string | null;
	orderItems?: {
		product_sku: string;
		product_title: string;
		product_price: number;
		product_brand: string;
		product_image?: string | null;
		quantity: number;
		supplierDeliveryDate?: string; // Дата поставки поставщиком
		carModel?: string; // Название автомобиля
		vinCode?: string; // VIN-код автомобиля
	}[];
};

// Тип для ответа API заказов
export type OrderResponse = {
	orders?: Order[];
	order?: Order;
	total?: number;
	page?: number;
	totalPages?: number;
	error?: string;
};

// Типы для логов заказов

export type OrderLogAction = "create" | "update" | "assign" | "status_change" | "cancel" | "unassign";

export type OrderLog = {
	id: number;
	createdAt: string | Date;
	action: OrderLogAction | string;
	message?: string | null;
	orderId: number;
	adminSnapshot?: any;
	orderSnapshot?: any;
	managerSnapshot?: any;
	departmentSnapshot?: any;
};

export type OrderLogResponse = {
	data: OrderLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};

// Тип для фильтров заказов
export type OrderFilter = {
	status?: OrderStatus[];
	managerId?: number | null;
	departmentId?: number | null;
	clientId?: number | null;
	createdBy?: number | null;
	dateFrom?: string;
	dateTo?: string;
};

// ===== ТИПЫ ДЛЯ ЗАПИСЕЙ (BOOKING) =====

export type BookingStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

// Тип для отдела записей (BookingDepartment)
export type BookingDepartment = {
	id: number;
	name?: string | null; // Название отдела для записей (опционально, описание)
	address: string; // Адрес отдела (обязательно)
	phones: string[]; // Массив телефонов (может быть пустым или содержать до 100 телефонов)
	emails: string[]; // Массив почт (может быть пустым или содержать несколько почт)
	latitude?: number | null; // Широта для точки на карте (Яндекс.Карты)
	longitude?: number | null; // Долгота для точки на карте (Яндекс.Карты)
	createdAt: string | Date;
	updatedAt: string | Date;
};

export type Booking = {
	id: number;
	orderId?: number | null; // Связь с заказом
	scheduledDate: string | Date; // Дата записи
	scheduledTime: string; // Время в формате "14:30"
	contactPhone: string; // Телефон для связи (обязательное поле)
	clientId?: number | null; // Опционально - для незарегистрированных клиентов
	managerId?: number | null; // Опционально - менеджер назначается позже
	bookingDepartmentId: number; // Обязательно - отдел для записи
	status: BookingStatus;
	notes?: string | null; // Примечания, тип услуги и т.д.
	createdAt: string | Date;
	updatedAt: string | Date;
	// Связи
	client?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		phone: string;
	} | null;
	manager?: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		role: string;
		department?: DepartmentForLog | null;
	} | null;
	bookingDepartment: BookingDepartment;
	order?: {
		id: number;
		status: OrderStatus;
		createdAt: string | Date;
		finalDeliveryDate?: string | Date | null;
		contactPhone?: string | null;
		contactName?: string | null;
		client?: { id: number; first_name: string | null; last_name: string | null } | null;
		orderItems?: { product_price: number; quantity: number }[];
	} | null;
};

// Тип для создания записи
export type CreateBookingRequest = {
	scheduledDate: string; // Дата в формате "2024-12-25"
	scheduledTime: string; // Время в формате "14:30"
	contactPhone: string; // Телефон для связи (обязательное поле)
	clientId?: number | null; // ID зарегистрированного клиента
	managerId?: number | null; // ID менеджера (опционально)
	bookingDepartmentId: number; // ID отдела для записей (обязательно)
	orderId?: number | null; // Связь с заказом
	notes?: string; // Примечания
	// Для незарегистрированных клиентов
	clientName?: string; // Имя клиента
};

// Тип для обновления записи
export type UpdateBookingRequest = {
	scheduledDate?: string;
	scheduledTime?: string;
	contactPhone?: string; // Телефон для связи
	clientId?: number | null;
	managerId?: number | null;
	bookingDepartmentId?: number;
	orderId?: number | null; // Связь с заказом
	status?: BookingStatus;
	notes?: string;
	// Для незарегистрированных клиентов
	clientName?: string;
};

// Тип для ответа API записей
export type BookingResponse = {
	bookings?: Booking[];
	booking?: Booking;
	total?: number;
	page?: number;
	totalPages?: number;
	error?: string;
};

// Тип для фильтров записей
export type BookingFilter = {
	status?: BookingStatus[];
	managerId?: number | null;
	clientId?: number | null;
	dateFrom?: string;
	dateTo?: string;
	timeFrom?: string; // Время от
	timeTo?: string; // Время до
};

// Тип для снапшота менеджера в логах записей
export type ManagerSnapshotForBookingLog = {
	id: number;
	first_name: string | null;
	last_name: string | null;
	role: string;
	department: {
		id: number;
		name: string;
	} | null;
};

// Тип для снапшота админа в логах записей
export type AdminSnapshotForBookingLog = {
	id: number;
	first_name: string | null;
	last_name: string | null;
	/** Отчество; в старых логах может отсутствовать в JSON */
	middle_name?: string | null;
	role: string;
	department: {
		id: number;
		name: string;
	} | null;
};

// Тип для снапшота отдела записей в логах
export type BookingDepartmentSnapshotForLog = {
	id: number;
	name: string | null;
	address: string;
	phones: string[];
	emails: string[];
};

// Тип для снапшота записи в логах
export type BookingSnapshotForLog = {
	id: number;
	scheduledDate: Date | string;
	scheduledTime: string;
	contactPhone: string;
	status: string;
	managerId: number | null;
	clientId: number | null;
	bookingDepartmentId: number;
	notes: string | null;
};

// Типы для логов записей
export type BookingLogAction = "create" | "update" | "assign" | "status_change" | "cancel" | "unassign";

export type BookingLog = {
	id: number;
	createdAt: string | Date;
	action: BookingLogAction | string;
	message?: string | null;
	bookingId: number;
	adminSnapshot?: AdminSnapshotForBookingLog | null;
	bookingSnapshot?: BookingSnapshotForLog | null;
	managerSnapshot?: ManagerSnapshotForBookingLog | null;
	departmentSnapshot?: BookingDepartmentSnapshotForLog | null;
};

export type BookingLogResponse = {
	data: BookingLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};

// Типы для логов отделов записей (адресов)
export type BookingDepartmentLogAction = "create" | "update" | "delete";

export type BookingDepartmentLog = {
	id: number;
	createdAt: string | Date;
	action: BookingDepartmentLogAction | string;
	message?: string | null;
	bookingDepartmentId: number;
	adminSnapshot?: AdminSnapshotForBookingLog | null;
	bookingDepartmentSnapshot?: BookingDepartmentSnapshotForLog | null;
};

export type BookingDepartmentLogResponse = {
	data: BookingDepartmentLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};

// Пункты выдачи (аналогично адресам для записей)
export type PickupPoint = {
	id: number;
	name?: string | null;
	address: string;
	phones: string[];
	emails: string[];
	latitude?: number | null; // Широта для точки на карте (Яндекс.Карты)
	longitude?: number | null; // Долгота для точки на карте (Яндекс.Карты)
	createdAt: string | Date;
	updatedAt: string | Date;
};

export type PickupPointSnapshotForLog = {
	id: number;
	name: string | null;
	address: string;
	phones: string[];
	emails: string[];
};

export type PickupPointLogAction = "create" | "update" | "delete";

export type PickupPointLog = {
	id: number;
	createdAt: string | Date;
	action: PickupPointLogAction | string;
	message?: string | null;
	pickupPointId: number;
	adminSnapshot?: AdminSnapshotForBookingLog | null;
	pickupPointSnapshot?: PickupPointSnapshotForLog | null;
};

export type PickupPointLogResponse = {
	data: PickupPointLog[];
	total: number;
	page: number;
	totalPages: number;
	error?: string;
};
