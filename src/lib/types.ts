// src\lib\types.ts
import { Prisma } from "@prisma/client";

export type Role = "superadmin" | "admin" | "manager" | "client";
export type Department = {
	id: number;
	name: string;
	productCount?: number;
	allowedCategories: { category: Category }[];
	users: User[];
	products: { id: number; title: string; sku: string; brand: string; price: number }[];
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
		title: string;
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
		role: string;
		department?: { id: number; name: string } | null;
	};
	targetUserId?: number | null;
	targetUser: {
		id: number;
		first_name: string | null;
		last_name: string | null;
		phone: string;
		role: string;
		department?: { id: number; name: string } | null;
	};
	departmentId?: number | null;
	department?: {
		id: number;
		name: string;
	} | null;
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
		role: string;
		department?: { id: number; name: string } | null;
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
	department?: {
		id: number;
		name: string;
	};
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
	department?: {
		id: number;
		name: string;
	};
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
	department?: {
		id: number;
		name: string;
	};
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
	values: FilterValue[];
};

// Тип для выбранных значений фильтра
export type SelectedFilterValue = {
	filterId: number;
	valueIds: number[];
};

export type ProductResponse = {
	product?: Omit<Product, "filters"> & {
		categoryId: number;
		filters?: ProductFilter[];
	};
	error?: string;
};

// Типы для логов продуктов
export type ProductLogAction = "create" | "update" | "delete" | "import" | "skipped" | "duplicate" | "bulk";

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
		department?: { id: number; name: string } | null;
	};
	targetProduct?: {
		id: number;
		title: string;
		sku: string;
		brand: string;
		price: number;
		category?: { id: number; title: string };
		description?: string;
		department?: { id: number; name: string };
	};
	department?: {
		id: number;
		name: string;
	} | null;
	snapshotBefore?: any;
	snapshotAfter?: any;
	userSnapshot?: any;
	departmentSnapshot?: any;
	importLogId?: number | null; // Ссылка на лог импорта
	importLogData?: any; // Данные лога импорта для отображения
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
		department?: { id: number; name: string };
	};
	error?: string;
};

export type ServiceKit = {
	id: number;
	title: string;
	name: string; // Добавляем поле name для совместимости
	image?: string;
	description?: string;
	price?: number;
	parts?: {
		name: string; // Обновляем поле title на name для совместимости
		analogs: string[] | Product[]; // Обновляем тип для совместимости
	}[];
};

export type Promotion = {
	id: number;
	title: string;
	description: string;
	image: string;
	order: number;
	buttonText: string;
	buttonLink: string;
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
