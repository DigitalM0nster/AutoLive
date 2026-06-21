"use client";

import { useEffect } from "react";
import { initAdminTableDragScroll } from "@/lib/adminTableDragScroll";

/** Включает drag-scroll (ЛКМ) для всех таблиц админки */
export default function AdminTableDragScroll() {
	useEffect(() => {
		initAdminTableDragScroll();
	}, []);

	return null;
}
