"use client";

import { useMemo, useState } from "react";

type Snapshot = {
	id: number;
	title: string;
	sku: string;
	brand: string;
	price: number;
	department?: { name: string };
	category?: { title: string };
};

type Props = {
	type: "bulk" | "import";
	count: number;
	snapshots: Snapshot[];
	message?: string | null;
	filename?: string;
	imagePolicy?: string;
	created?: number;
	updated?: number;
	skipped?: number;
	markupSummary?: string;
};

export default function BulkOrImportDetails({ type, count, snapshots, message, filename, imagePolicy, created, updated, skipped, markupSummary }: Props) {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [departmentFilter, setDepartmentFilter] = useState("");

	const limit = 10;

	const filtered = useMemo(() => {
		return snapshots.filter((snap) => {
			const matchesSku = snap.sku.toLowerCase().includes(search.toLowerCase());
			const matchesDept = departmentFilter === "" || (departmentFilter === "(null)" && !snap.department?.name) || snap.department?.name === departmentFilter;
			return matchesSku && matchesDept;
		});
	}, [search, departmentFilter, snapshots]);

	const totalPages = Math.ceil(filtered.length / limit);
	const pageItems = filtered.slice((page - 1) * limit, page * limit);

	// извлекаем все отделы
	const departments = useMemo(() => {
		const set = new Set<string>();
		for (const snap of snapshots) {
			if (snap.department?.name) {
				set.add(snap.department.name);
			} else {
				set.add("(null)");
			}
		}
		return Array.from(set).sort();
	}, [snapshots]);

	return (
		<div className="space-y-3 text-sm">
			{type === "bulk" && (
				<p>
					Удалено товаров: <strong>{count}</strong>
				</p>
			)}

			{type === "import" && (
				<>
					<p>
						<strong>Файл:</strong> {filename}
					</p>
					<p>
						Создано: {created} / Обновлено: {updated} / Пропущено: {skipped}
					</p>
					{imagePolicy && <p>Изображения: {imagePolicy === "replace" ? "Заменялись" : "Сохранялись"}</p>}
					{markupSummary && <p className="text-xs text-gray-500">Наценка: {markupSummary}</p>}
				</>
			)}

			{message && <p className="text-sm mt-1">{message}</p>}

			{snapshots.length > 0 && (
				<>
					{/* Поиск и фильтр */}
					<div className="flex flex-wrap gap-3 items-center">
						<input
							type="text"
							placeholder="Поиск по артикулу"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="border px-2 py-1 rounded w-60 text-sm"
						/>

						<select
							value={departmentFilter}
							onChange={(e) => {
								setDepartmentFilter(e.target.value);
								setPage(1);
							}}
							className="border px-2 py-1 rounded text-sm"
						>
							<option value="">Все отделы</option>
							{departments.map((dep) => (
								<option key={dep} value={dep}>
									{dep === "(null)" ? "Без отдела" : dep}
								</option>
							))}
						</select>

						<span className="text-xs text-gray-600">Найдено: {filtered.length}</span>
					</div>

					{/* Таблица */}
					<div className="border rounded shadow-sm overflow-x-auto mt-2">
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
								{pageItems.map((p) => (
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

					{/* пагинация */}
					{totalPages > 1 && (
						<div className="flex justify-end gap-3 items-center mt-2 p-2">
							<button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs px-2 py-1 bg-gray-100 rounded disabled:opacity-50">
								Назад
							</button>
							<span className="text-xs text-gray-600">
								Страница {page} из {totalPages}
							</span>
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className="text-xs px-2 py-1 bg-gray-100 rounded disabled:opacity-50"
							>
								Вперёд
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
