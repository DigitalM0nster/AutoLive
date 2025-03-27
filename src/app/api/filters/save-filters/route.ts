// src/app/api/filters/save-filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
	try {
		const { categoryId, filters } = await req.json();

		if (!categoryId || !Array.isArray(filters)) {
			return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
		}

		const titles = new Set<string>();

		for (const filter of filters) {
			if (filter.markedForDelete && !filter.isNew) {
				await prisma.filterValue.deleteMany({ where: { filterId: filter.id } });
				await prisma.filter.delete({ where: { id: filter.id } });
				continue;
			}

			let title = filter.title?.trim();
			if (!title || title.length < 2 || title.length > 100) {
				return NextResponse.json({ error: `Неверное название фильтра: "${title}"` }, { status: 400 });
			}

			if (titles.has(title)) {
				return NextResponse.json({ error: `Повторяющееся название фильтра: "${title}"` }, { status: 400 });
			}
			titles.add(title);

			if (filter.type === "boolean" && filter.values.length > 0) {
				return NextResponse.json({ error: `Фильтр "${title}" типа boolean не должен иметь значений` }, { status: 400 });
			}

			if (filter.type === "range" && filter.values.length < 2) {
				return NextResponse.json({ error: `Фильтр "${title}" типа range должен иметь минимум два значения` }, { status: 400 });
			}

			const valueSet = new Set<string>();
			for (const val of filter.values) {
				if (val.markedForDelete) continue;
				const v = val.value?.trim();
				if (!v) return NextResponse.json({ error: `Пустое значение в фильтре "${title}"` }, { status: 400 });
				if (valueSet.has(v)) return NextResponse.json({ error: `Дублирующееся значение "${v}" в фильтре "${title}"` }, { status: 400 });
				if (filter.type === "range" && isNaN(Number(v))) return NextResponse.json({ error: `Значение "${v}" в "${title}" должно быть числом (range)` }, { status: 400 });
				valueSet.add(v);
			}

			let filterId = filter.id;
			if (filter.isNew) {
				const created = await prisma.filter.create({
					data: {
						title,
						type: filter.type,
						categoryId,
					},
				});
				filterId = created.id;
			} else if (filter.changed) {
				await prisma.filter.update({
					where: { id: filter.id },
					data: { title, type: filter.type },
				});
			}

			for (const val of filter.values) {
				if (val.markedForDelete && !val.isNew) {
					await prisma.productFilterValue.deleteMany({ where: { filterValueId: val.id } });
					await prisma.filterValue.delete({ where: { id: val.id } });
					continue;
				}

				if (val.isNew) {
					await prisma.filterValue.create({
						data: {
							value: val.value.trim(),
							filterId,
						},
					});
				} else if (val.changed) {
					await prisma.filterValue.update({
						where: { id: val.id },
						data: { value: val.value.trim() },
					});
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("Ошибка при сохранении фильтров:", err);
		return NextResponse.json({ error: (err as any)?.message || "Ошибка сервера" }, { status: 500 });
	}
}
