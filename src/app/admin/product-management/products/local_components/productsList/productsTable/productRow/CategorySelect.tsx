// src\app\admin\product-management\products\local_components\productsList\productsTable\productRow\CategorySelect.tsx

import { Category } from "@/lib/types";

type Props = {
	value: string;
	onChange: (value: string) => void;
	categories: Category[];
};

export default function CategorySelect({ value, onChange, categories }: Props) {
	return (
		<select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border px-1 py-0.5 text-sm rounded">
			<option value="">Выбрать...</option>
			{categories.map((cat) => (
				<option key={cat.id} value={cat.id}>
					{cat.title}
				</option>
			))}
		</select>
	);
}
