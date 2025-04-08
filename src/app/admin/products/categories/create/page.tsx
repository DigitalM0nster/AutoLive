// src/app/admin/products/categories/create/page.tsx
"use client";

import CategoryManager from "./components/categoryManager/CategoryManager";

export default function CreateCategoryPage() {
	return (
		<CategoryManager
			isEdit={false}
			initialCategory={{
				title: "",
				image: undefined,
			}}
			initialFilters={[]}
		/>
	);
}
