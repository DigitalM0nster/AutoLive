"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Вкладки раздела заказов: список и история изменений */
export default function OrdersTabs() {
	const pathname = usePathname();
	const isLogs = pathname.includes("/orders/logs");

	return (
		<div className="tabsContainer">
			<Link href="/admin/orders" className={`tabButton ${!isLogs ? "active" : ""}`}>
				Список заказов
			</Link>
			<Link href="/admin/orders/logs" className={`tabButton ${isLogs ? "active" : ""}`}>
				История изменений
			</Link>
		</div>
	);
}
