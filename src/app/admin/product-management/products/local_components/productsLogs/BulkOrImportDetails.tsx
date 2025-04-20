// BulkOrImportDetails.tsx

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

	const departments = useMemo(() => {
		const set = new Set<string>();
		for (const snap of snapshots) {
			if (snap.department?.name) set.add(snap.department.name);
			else set.add("(null)");
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
				<div className="space-y-1">
					<p className="text-sm text-gray-700">
						<strong>Файл импорта:</strong> <span className="text-gray-900">{filename}</span>
					</p>

					<div className="flex flex-wrap items-center gap-3 text-xs">
						<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Создано: {created}</span>
						<span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Обновлено: {updated}</span>
						{skipped !== undefined && skipped > 0 && <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Пропущено: {skipped}</span>}
						{imagePolicy && (
							<span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Изображения: {imagePolicy === "replace" ? "Заменялись" : "Сохранялись"}</span>
						)}
					</div>

					{markupSummary && <p className="text-xs text-gray-500 mt-1">Наценка: {markupSummary}</p>}

					<p className="text-xs text-gray-600">
						Импортировано товаров: {snapshots.length} —{" "}
						{(() => {
							const counts = snapshots.reduce((acc: Record<string, number>, snap) => {
								const name = snap.department?.name || "Без отдела";
								acc[name] = (acc[name] || 0) + 1;
								return acc;
							}, {});

							return Object.entries(counts)
								.map(([name, count]) => `${name} — ${count} шт.`)
								.join(", ");
						})()}
					</p>
				</div>
			)}

			{message && <p className="text-sm mt-1">{message}</p>}

			{snapshots.length > 0 && (
				<>
					<div className="flex flex-wrap gap-3 items-center">
						<input
							type="text"
							placeholder="Поиск по артикулу"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							className="border border-gray-300 px-3 py-1.5 rounded text-xs w-60"
						/>

						<select
							value={departmentFilter}
							onChange={(e) => {
								setDepartmentFilter(e.target.value);
								setPage(1);
							}}
							className="border border-gray-300 px-3 py-1.5 rounded text-xs"
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

					<div className="w-full overflow-x-auto mt-2">
						<div className="min-w-[900px] text-xs">
							{/* Заголовок */}
							<div className="grid grid-cols-[120px_200px_140px_100px_180px_160px] bg-gray-200 text-gray-700 font-medium px-4 py-2">
								<div>Артикул</div>
								<div>Название</div>
								<div>Бренд</div>
								<div>Цена</div>
								<div>Категория</div>
								<div>Отдел</div>
							</div>

							{/* Товары */}
							{pageItems.map((p) => (
								<div
									key={`${p.id ?? `${p.sku}-${p.brand}`}`}
									className="grid grid-cols-[120px_200px_140px_100px_180px_160px] px-4 py-2 border-t border-gray-100 hover:bg-gray-50 transition-colors"
								>
									<div className="text-gray-700">{p.sku}</div>
									<div className="text-gray-700">{p.title}</div>
									<div className="text-gray-700">{p.brand}</div>
									<div className="text-gray-700">{p.price.toLocaleString("ru-RU")} ₽</div>
									<div className="text-gray-700">{p.category?.title || "—"}</div>
									<div className="text-gray-700">{p.department?.name || "—"}</div>
								</div>
							))}
						</div>
					</div>

					{totalPages > 1 && (
						<div className="flex justify-center gap-2 items-center mt-4">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
							>
								Назад
							</button>
							<span className="text-xs text-gray-600">
								Страница {page} из {totalPages}
							</span>
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className="text-xs px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
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
