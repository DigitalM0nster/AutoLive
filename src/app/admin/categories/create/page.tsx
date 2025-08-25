// src/app/admin/categories/create/page.tsx
"use client";

import CategoryPageClient from "../local_components/CategoryPageClient";

export default function CategoryCreatePage() {
	return <CategoryPageClient isCreateMode={true} />;
}
