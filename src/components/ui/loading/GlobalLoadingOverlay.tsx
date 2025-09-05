"use client";

import React from "react";
import { useGlobalLoading } from "./GlobalLoadingProvider";
import Loading from "./Loading";

// Простой оверлей загрузки. Не редактируем CSS/SCSS — используем инлайн-стили.
export default function GlobalLoadingOverlay() {
	const { isLoading } = useGlobalLoading();

	if (!isLoading) return null;

	return (
		<div
			className="globalLoadingOverlay"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(0,0,0,0.25)",
				zIndex: 9999,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Loading white={true} />
		</div>
	);
}
