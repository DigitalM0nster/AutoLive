// src\app\admin\product-management\products\local_components\productsList\productsTable\productRow\DepartmentSelect.tsx

type Props = {
	value: string;
	onChange: (value: string) => void;
	departments: { id: number; name: string }[];
	error?: string;
};

export default function DepartmentSelect({ value, onChange, departments, error }: Props) {
	return (
		<div>
			<select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full border px-1 py-0.5 text-sm rounded ${error ? "border-red-500 bg-red-100" : ""}`}>
				<option value="">Выберите отдел</option>
				{departments.map((dep) => (
					<option key={dep.id} value={dep.id}>
						{dep.name}
					</option>
				))}
			</select>
			{error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
		</div>
	);
}
