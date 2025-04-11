// src\lib\types.ts

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
};

export type Product = {
	id: number;
	sku: string;
	title: string;
	description: string;
	price: number;
	image?: string | null;
	brand: string;
	createdAt: string;
	updatedAt: string;
	categoryId?: number;
	categoryTitle?: string;
	filters: {
		filterId: number;
		valueId: number;
		value: string;
	}[];
};
export type NewProduct = Omit<Product, "id"> & { id: "new"; isEditing: true };
export type EditableProduct = Product | NewProduct;

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
