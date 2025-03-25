// src\lib\types.ts

export type Category = {
	id: number;
	name: string;
	products?: Product[];
	image_url: string;
	filters?: {
		id: number;
		name: string;
		values: {
			id: number;
			value: string;
		}[];
	}[];
};

export type Product = {
	id: number;
	name: string;
	price: number;
	image_url: string;
	filters: {
		filter_id: number;
		value_id: number;
		value: string;
	}[];
};

export type ProductFilter = {
	id: number;
	name: string;
	selected_values: {
		id: number;
		value: string;
	}[];
};

export type ProductResponse = {
	product?: Omit<Product, "filters"> & {
		category_id: number;
		filters?: ProductFilter[];
	};
	error?: string;
};

export type ServiceKit = {
	id: number;
	name: string;
	image?: string;
	description?: string;
	price?: number;
	parts?: {
		name: string;
		analogs: string[];
	}[];
};

export type Discount = {
	id: number;
	title: string;
	description: string;
	image: string;
};
