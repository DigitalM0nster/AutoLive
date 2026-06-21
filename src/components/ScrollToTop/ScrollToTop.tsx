"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** При клиентской навигации возвращает скролл в начало страницы */
export default function ScrollToTop() {
	const pathname = usePathname();
	const isFirstRender = useRef(true);

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		window.scrollTo({ top: 0, left: 0, behavior: "instant" });
	}, [pathname]);

	return null;
}
