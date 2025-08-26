"use client";

import React from "react";
import { useGlobalLoading } from "./GlobalLoadingProvider";

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
			<div
				className="globalLoadingContainer"
				style={{
					background: "#fff",
					borderRadius: 8,
					padding: "12px 16px",
					boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
					display: "flex",
					alignItems: "center",
					gap: 10,
				}}
			>
				<div
					className="globalLoadingDot"
					style={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						background: "#0ea5e9",
						marginRight: 8,
					}}
				/>
				<div className="globalLoadingText" style={{ color: "#111", fontSize: 14 }}>
					Загрузка...
				</div>
			</div>
		</div>
	);
}
