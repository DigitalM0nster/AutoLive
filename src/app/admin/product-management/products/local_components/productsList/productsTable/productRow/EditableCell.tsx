// src\app\admin\product-management\products\local_components\productsList\productsTable\productRow\EditableCell.tsx

import React from "react";

type EditableCellProps = {
	value: string;
	onChange: (val: string) => void;
	error?: string;
	type?: "text" | "number";
	placeholder?: string;
	className?: string;
};

export default function EditableCell({ value, onChange, error, type = "text", placeholder = "", className = "" }: EditableCellProps) {
	return (
		<input
			type={type}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className={`w-full border px-1 py-0.5 text-sm rounded ${error ? "border-red-500 bg-red-100" : ""} ${className}`}
		/>
	);
}
