// src\lib\types.ts
import { Prisma } from "@prisma/client";

export type Role = "superadmin" | "admin" | "manager" | "client";
export type Department = {
	id: number;
	name: string;
};

export type User = {
	id: number;
	first_name: string;
	last_name: string;
	avatar: string;
	phone: string;
	role: Role;
	department?: Department;
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

export type EditableProductId = number | `new${string}`;
// 💡 API-ответ для списка товаров
export type ProductListItem = {
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
	department?: {
		id: number;
		name: string;
	};
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
export type NewProduct = ProductListItem & {
	id: "new";
	isEditing: true;
	filters: any[];
};

// ✏️ UI: редактируемый товар
export type EditableProduct = {
	id: EditableProductId;
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
	image?: string;
	description?: string;
	price?: number;
	parts?: {
		title: string;
		analogs: Product[];
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
