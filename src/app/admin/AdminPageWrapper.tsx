// src/components/admin/AdminPageWrapper.tsx
"use client";

import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import React from "react";

export default function AdminPageWrapper({ children }: { children: React.ReactNode }) {
	const headerHeight = useHeaderHeight();

	return (
		<div style={{ paddingTop: headerHeight }} className="screen">
			{children}
		</div>
	);
}
