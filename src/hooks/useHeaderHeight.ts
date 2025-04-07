// src/hooks/useHeaderHeight.ts
import { useEffect, useState } from "react";

export function useHeaderHeight() {
	const [height, setHeight] = useState(0);

	useEffect(() => {
		const updateHeight = () => {
			const el = document.getElementById("admin-header");
			if (el) setHeight(el.offsetHeight);
		};

		updateHeight();

		window.addEventListener("resize", updateHeight);
		return () => window.removeEventListener("resize", updateHeight);
	}, []);

	return height;
}
