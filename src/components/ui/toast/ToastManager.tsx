// src/components/ui/toast/ToastManager.tsx

"use client";

import { useEffect, useState } from "react";
import Toast from "./Toast";
import { registerToast } from "./toastService";

export default function ToastManager() {
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	useEffect(() => {
		registerToast((msg, type) => setToast({ message: msg, type }));
	}, []);

	if (!toast) return null;

	return <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />;
}
