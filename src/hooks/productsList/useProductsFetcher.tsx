import { useState, useRef } from "react";
import type { EditableProduct } from "@/lib/types";

export default function useProductsFetcher() {
	const [products, setProducts] = useState<EditableProduct[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);

	const fetchProducts = async (params: URLSearchParams, isLoadMore = false) => {
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

			if (isLoadMore) {
				setProducts((prev) => [...prev, ...data.products]);
			} else {
				setProducts(data.products);
			}
			setCursor(data.nextCursor);
		} catch (error: any) {
			if (error.name !== "AbortError") {
				console.error("Ошибка при загрузке товаров", error);
			}
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
	};
}
