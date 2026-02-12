import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CategoryLogsComponent from "@/app/admin/categories/local_components/categoryLogs/CategoryLogsComponent";

export default async function CategoryLogsPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const categoryId = parseInt(id, 10);

	if (isNaN(categoryId)) {
		notFound();
	}

	const category = await prisma.category.findUnique({
		where: { id: categoryId },
		select: { id: true, title: true },
	});

	if (!category) {
		notFound();
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/categories/${id}`} className="tabButton">
						Редактирование категории
					</Link>
					<Link href={`/admin/categories/${id}/logs`} className="tabButton active">
						История изменений
					</Link>
				</div>
				<CategoryLogsComponent categoryId={categoryId} />
			</div>
		</div>
	);
}
