// src\components\ui\toast\ToastProvider.tsx
"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Toast from "./Toast";

type ToastType = "success" | "error";

type ToastState = {
	message: string;
	type: ToastType;
};

type ToastContextType = {
	toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toastState, setToastState] = useState<ToastState | null>(null);

	const toast = useCallback((message: string, type: ToastType = "success") => {
		setToastState({ message, type });
	}, []);

	const clearToast = () => setToastState(null);

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			{toastState && <Toast message={toastState.message} type={toastState.type} onClose={clearToast} />}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) throw new Error("useToast должен использоваться внутри ToastProvider");
	return context.toast;
}
