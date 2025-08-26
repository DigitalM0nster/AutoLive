"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type GlobalLoadingContextValue = {
	activeRequests: number;
	isLoading: boolean;
	beginManualLoading: () => void;
	endManualLoading: () => void;
};

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(null);

export function useGlobalLoading(): GlobalLoadingContextValue {
	const ctx = useContext(GlobalLoadingContext);
	if (!ctx) {
		throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
	}
	return ctx;
}

export default function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
	// Счётчик активных запросов. Когда > 0 — показываем индикатор.
	const [activeRequests, setActiveRequests] = useState(0);
	// Вспомогательный счётчик для ручных операций, не связанных с fetch
	const manualCounterRef = useRef(0);
	const originalFetchRef = useRef<typeof window.fetch | null>(null);

	const increment = useCallback(() => {
		setActiveRequests((curr) => curr + 1);
	}, []);

	const decrement = useCallback(() => {
		setActiveRequests((curr) => (curr > 0 ? curr - 1 : 0));
	}, []);

	const beginManualLoading = useCallback(() => {
		manualCounterRef.current += 1;
		increment();
	}, [increment]);

	const endManualLoading = useCallback(() => {
		if (manualCounterRef.current > 0) {
			manualCounterRef.current -= 1;
			decrement();
		}
	}, [decrement]);

	// Перехватываем window.fetch, чтобы автоматически управлять индикатором загрузки
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (originalFetchRef.current) return;

		originalFetchRef.current = window.fetch.bind(window);

		window.fetch = async (...args) => {
			// Определяем метод запроса
			let method = "GET";
			try {
				if (args[0] instanceof Request) {
					method = (args[0] as Request).method || "GET";
				} else if (args[1] && typeof args[1] === "object" && (args[1] as RequestInit).method) {
					method = (args[1] as RequestInit).method || "GET";
				}
			} catch {}

			const upper = method.toUpperCase();
			const track = upper === "POST" || upper === "PUT" || upper === "PATCH" || upper === "DELETE";

			if (track) increment();
			try {
				const result = await originalFetchRef.current!(...args);
				return result;
			} catch (err) {
				throw err;
			} finally {
				if (track) decrement();
			}
		};

		return () => {
			if (originalFetchRef.current) {
				window.fetch = originalFetchRef.current;
				originalFetchRef.current = null;
			}
		};
	}, [increment, decrement]);

	const value = useMemo<GlobalLoadingContextValue>(
		() => ({
			activeRequests,
			isLoading: activeRequests > 0,
			beginManualLoading,
			endManualLoading,
		}),
		[activeRequests, beginManualLoading, endManualLoading]
	);

	return <GlobalLoadingContext.Provider value={value}>{children}</GlobalLoadingContext.Provider>;
}
