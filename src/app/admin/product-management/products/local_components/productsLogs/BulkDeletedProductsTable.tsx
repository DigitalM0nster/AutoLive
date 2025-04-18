"use client";

import { useState } from "react";

type Snapshot = {
	id: number;
	title: string;
	sku: string;
	brand: string;
	price: number;
	department?: { name: string };
	category?: { title: string };
};

export default function BulkDeletedProductsTable({ snapshots }: { snapshots: Snapshot[] }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="text-sm">
			<button onClick={() => setOpen(!open)} className="text-blue-600 hover:underline mb-2 text-sm">
				{open ? "Скрыть удалённые товары" : `Показать удалённые товары (${snapshots.length})`}
			</button>

			{open && (
				<div className="border rounded shadow-sm overflow-x-auto max-h-[400px] overflow-y-auto">
					<table className="table-auto w-full text-sm border-collapse">
						<thead className="bg-gray-100 sticky top-0">
							<tr>
								<th className="border px-2 py-1">Артикул</th>
								<th className="border px-2 py-1">Название</th>
								<th className="border px-2 py-1">Бренд</th>
								<th className="border px-2 py-1">Цена</th>
								<th className="border px-2 py-1">Категория</th>
								<th className="border px-2 py-1">Отдел</th>
							</tr>
						</thead>
						<tbody>
							{snapshots.map((p) => (
								<tr key={p.id} className="odd:bg-white even:bg-gray-50">
									<td className="border px-2 py-1">{p.sku}</td>
									<td className="border px-2 py-1">{p.title}</td>
									<td className="border px-2 py-1">{p.brand}</td>
									<td className="border px-2 py-1">{p.price} ₽</td>
									<td className="border px-2 py-1">{p.category?.title || "—"}</td>
									<td className="border px-2 py-1">{p.department?.name || "—"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
