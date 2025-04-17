// src/app/admin/product-management/products/local_components/productsList/hooks/useProductsFetcher.tsx

import { useState, useRef } from "react";
import type { EditableProduct } from "@/lib/types";

export default function useProductsFetcher() {
	const [products, setProducts] = useState<EditableProduct[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [total, setTotal] = useState<number>(0);
	const abortControllerRef = useRef<AbortController | null>(null);

	// ↙ Явно указали возвращаемый Promise‑тип
	const fetchProducts = async (params: URLSearchParams, isLoadMore = false): Promise<{ items: EditableProduct[]; total: number }> => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		const controller = new AbortController();
		abortControllerRef.current = controller;

		setLoading(true);
		try {
			const res = await fetch(`/api/products?${params.toString()}`, {
				signal: controller.signal,
			});
			const data = await res.json();

			setTotal(data.total);

			if (isLoadMore) {
				setProducts((prev) => [...prev, ...data.products]);
			} else {
				setProducts(data.products);
			}
			setCursor(data.nextCursor);

			// ↙ Возвращаем ВСЕГДА объект с items и total
			return {
				items: data.products,
				total: data.total,
			};
		} catch (error: any) {
			if (error.name !== "AbortError") {
				console.error("Ошибка при загрузке товаров", error);
			}
			// ↙ На ошибке возвращаем пустой массив, чтобы не было undefined
			return {
				items: [],
				total,
			};
		} finally {
			setLoading(false);
		}
	};

	return {
		products,
		setProducts,
		cursor,
		setCursor,
		loading,
		fetchProducts,
		total,
	};
}
