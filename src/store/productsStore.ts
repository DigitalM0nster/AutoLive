// src/store/productsStore.ts
import { create } from "zustand";
import type { EditableProduct, Category, Department } from "@/lib/types";

interface ProductsStore {
	products: EditableProduct[];
	deletableProductId: number | null;
	setDeletableProductId: (id: number | null) => void;

	isAddingNewProduct: boolean;
	setIsAddingNewProduct: (v: boolean) => void;

	loading: boolean;
	error: string | null;

	page: number;
	setPage: (page: number) => void;
	total: number;
	limit: number;

	fetchProducts: (page?: number, filters?: Record<string, any>) => Promise<void>;
	updateProduct: (product: EditableProduct) => Promise<void>;
	deleteProduct: (id: number) => Promise<void>;

	duplicateInfo: { existing: EditableProduct; pending: EditableProduct } | null;
	setDuplicateInfo: (value: ProductsStore["duplicateInfo"]) => void;
	clearDuplicateInfo: () => void;
	confirmDuplicateUpdate: () => Promise<void>;

	departments: Department[];
	departmentCounts: Record<string, number>;
	setDepartmentCounts: (counts: Record<string, number>) => void;
	categories: Category[];
	categoryNoneCount: number;
	categoryCounts: Record<string, number>;
	setCategoryCounts: (counts: Record<string, number>) => void;
	loadReferenceData: () => Promise<void>;

	selectedProductIds: number[];
	toggleProductSelection: (id: number) => void;
	selectAllProductsPerPage: () => void;
	clearSelection: () => void;

	selectAllMatchingProducts: (filters: Record<string, string>) => Promise<void>;

	sortBy: string | null;
	sortOrder: "asc" | "desc";
	setSorting: (field: string) => void;
}

export const useProductsStore = create<ProductsStore>((set, get) => ({
	products: [],
	deletableProductId: null,
	setDeletableProductId: (id) => set({ deletableProductId: id }),

	isAddingNewProduct: false,
	setIsAddingNewProduct: (v) => set({ isAddingNewProduct: v }),

	loading: false,
	error: null,

	page: 1,
	setPage: (page) => set({ page }),
	total: 0,
	limit: 10,

	duplicateInfo: null,
	setDuplicateInfo: (info) => set({ duplicateInfo: info }),
	clearDuplicateInfo: () => set({ duplicateInfo: null }),

	departments: [],
	departmentCounts: {} as Record<string, number>,
	setDepartmentCounts: (counts: Record<string, number>) => set({ departmentCounts: counts }),
	categories: [],
	categoryNoneCount: 0,
	categoryCounts: {} as Record<string, number>,
	setCategoryCounts: (counts: Record<string, number>) => set({ categoryCounts: counts }),
	loadReferenceData: async () => {
		try {
			const res = await fetch("/api/products/filters");
			if (!res.ok) throw new Error("Ошибка загрузки справочников");
			const data = await res.json();
			set({
				departments: data.departments || [],
				categories: data.categories || [],
				categoryNoneCount: data.categoryNoneCount || 0,
				categoryCounts: data.categoryCounts || {},
				departmentCounts: data.departmentCounts || {},
			});
		} catch (e) {
			console.error("Ошибка загрузки справочников:", e);
		}
	},

	fetchProducts: async (page = get().page, filters = {}) => {
		set({ loading: true, error: null, page });

		try {
			const { limit, sortBy, sortOrder } = get();

			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== "" && v !== undefined)),
			});

			if (sortBy) params.append("sortBy", sortBy);
			if (sortOrder) params.append("sortOrder", sortOrder);

			const res = await fetch(`/api/products?${params.toString()}`);
			if (!res.ok) throw new Error(`Ошибка ${res.status}`);

			const json = await res.json();
			set({
				products: json.products,
				total: json.total,
				limit: json.limit,
				loading: false,
			});
		} catch (err: any) {
			set({ error: err.message || "Неизвестная ошибка", loading: false });
		}
	},

	updateProduct: async (product) => {
		try {
			const res = await fetch(`/api/products/${product.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(product),
			});
			if (!res.ok) throw new Error(`Ошибка ${res.status}`);
			const data = await res.json();
			const updated = data.product;

			// 🧠 дополняем categoryId, если сервер прислал только category
			if (updated.category && updated.category.id) {
				updated.categoryId = updated.category.id;
				updated.categoryTitle = updated.category.title;
			}

			set((state) => ({
				products: state.products.map((p) => (p.id === updated.id ? updated : p)),
			}));

			return updated;
		} catch (err: any) {
			console.error("Ошибка обновления товара:", err);
			throw err;
		}
	},

	deleteProduct: async (id) => {
		try {
			const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
			if (!res.ok) throw new Error(`Ошибка ${res.status}`);
			await get().fetchProducts(get().page);
		} catch (err: any) {
			console.error("Ошибка удаления товара:", err);
			throw err;
		}
	},

	confirmDuplicateUpdate: async () => {
		const { duplicateInfo, updateProduct, clearDuplicateInfo, setIsAddingNewProduct } = get();
		if (!duplicateInfo) return;

		try {
			await updateProduct({
				...duplicateInfo.pending,
				id: duplicateInfo.existing.id,
			});
			clearDuplicateInfo();
			setIsAddingNewProduct(false);
		} catch (e) {
			console.error("Ошибка при подтверждении дубликата:", e);
		}
	},

	selectedProductIds: [],
	toggleProductSelection: (id) =>
		set((state) => {
			const alreadySelected = state.selectedProductIds.includes(id);
			return {
				selectedProductIds: alreadySelected ? state.selectedProductIds.filter((pid) => pid !== id) : [...state.selectedProductIds, id],
			};
		}),
	selectAllProductsPerPage: () => {
		const allIds = get().products.map((p) => p.id);
		set({ selectedProductIds: allIds });
	},
	selectAllMatchingProducts: async (filters = {}) => {
		const params = new URLSearchParams(filters);
		const res = await fetch("/api/products/filter-matching-products?" + params.toString());
		if (!res.ok) throw new Error("Ошибка получения ID товаров");
		const data = await res.json();
		set({ selectedProductIds: data.ids });
	},
	clearSelection: () => set({ selectedProductIds: [] }),

	sortBy: null,
	sortOrder: "asc",
	setSorting: (field) => {
		const { sortBy, sortOrder } = get();
		if (sortBy === field) {
			set({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
		} else {
			set({ sortBy: field, sortOrder: "asc" });
		}
	},
}));
