// src\components\ui\toast\Toast.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
	message: string;
	type?: "success" | "error";
	onClose: () => void;
	duration?: number;
};

export default function Toast({ message, type = "success", onClose, duration = 3000 }: Props) {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setVisible(false);
			onClose();
		}, duration);

		return () => clearTimeout(timeout);
	}, [duration, onClose]);

	if (!visible) return null;

	return (
		<div
			className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl text-white text-sm transition-all
			${type === "success" ? "bg-green-600" : "bg-red-600"}`}
		>
			{message}
		</div>
	);
}
