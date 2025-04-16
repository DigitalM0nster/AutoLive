"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error";

let showToastFn: ((msg: string, type: ToastType) => void) | null = null;

export const showSuccessToast = (msg: string) => {
	showToastFn?.(msg, "success");
};

export const showErrorToast = (msg: string) => {
	showToastFn?.(msg, "error");
};

export default function ToastProvider() {
	const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		showToastFn = (msg: string, type: ToastType) => {
			setToast({ message: msg, type });
			setVisible(true);
		};
	}, []);

	useEffect(() => {
		if (!visible) return;

		const timeout = setTimeout(() => {
			setVisible(false);
			setToast(null);
		}, 10000);

		return () => clearTimeout(timeout);
	}, [visible]);

	if (!toast || !visible) return null;

	return (
		<div
			className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl text-white text-sm transition-all
			${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
		>
			{toast.message}
		</div>
	);
}
