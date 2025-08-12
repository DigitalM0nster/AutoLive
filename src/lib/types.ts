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
	orders: { id: number; title: string; status: string; createdAt: string }[];
};

export type User = {
	id: number;
	first_name: string;
	last_name: string;
	middle_name: string;
	avatar: string;
	phone: string;
	role: Role;
	department?: Department;
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

export type Category = {
	id: number;
	title: string;
	image?: string | null;
	products?: Product[];
	filters?: {
		id: number;
		title: string;
		values: {
			id: number;
			value: string;
		}[];
	}[];
	productCount?: number;
	allowedDepartments?: { departmentId: number }[];
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

export type ProductResponse = {
	product?: Omit<Product, "filters"> & {
		categoryId: number;
		filters?: ProductFilter[];
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

export type FilterType = "select" | "multi" | "range" | "boolean";

export type FilterValue = {
	id: number;
	value: string;
};

export type Filter = {
	id: number;
	title: string;
	type: FilterType;
	values: FilterValue[];
};

export type EditableFilter = {
	id?: number;
	title: string;
	type: FilterType;
	values: {
		id?: number;
		value: string;
	}[];
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
}
