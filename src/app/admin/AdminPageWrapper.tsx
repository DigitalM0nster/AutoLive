// src/components/admin/AdminPageWrapper.tsx
"use client";

import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import React from "react";

export default function AdminPageWrapper({ children }: { children: React.ReactNode }) {
	const headerHeight = useHeaderHeight();

	return (
		<div
			className="screen bg-gray-50"
			// style={{ paddingTop: headerHeight }}
		>
			{children}
		</div>
	);
}
