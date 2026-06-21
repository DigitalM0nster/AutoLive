"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import styles from "./styles.module.scss";

type CategoryRow = {
	id: number;
	title: string;
	image?: string;
	filtersCount: number;
	visibleOnSite?: boolean;
};

type SortableTableRowProps = CategoryRow & {
	onDeleteRequest: (category: CategoryRow) => void;
	canDelete: boolean;
	canDrag: boolean;
};

function filtersLabel(count: number) {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return "фильтр";
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "фильтра";
	return "фильтров";
}

export default function SortableTableRow({
	id,
	title,
	image,
	filtersCount,
	visibleOnSite = true,
	onDeleteRequest,
	canDelete,
	canDrag,
}: SortableTableRowProps) {
	const sortableProps = useSortable({ id });

	const style = canDrag ?
		{
			transform: CSS.Transform.toString(sortableProps.transform),
			transition: sortableProps.transition,
		}
	:	undefined;

	const dragAttributes = canDrag ? sortableProps.attributes : {};
	const dragListeners = canDrag ? sortableProps.listeners : {};
	const dragRef = canDrag ? sortableProps.setNodeRef : undefined;

	return (
		<article
			ref={dragRef}
			style={style}
			className={[styles.categoryRow, canDrag && sortableProps.isDragging ? styles.isDragging : ""].filter(Boolean).join(" ")}
		>
			{canDrag ?
				<div
					className={styles.dragHandle}
					title="Перетащите для изменения порядка"
					{...dragAttributes}
					{...dragListeners}
				>
					<span className={styles.gripIcon} aria-hidden />
				</div>
			:	<span className={styles.dragSpacer} aria-hidden />}

			<Link href={`/admin/categories/${id}`} className={styles.rowLink}>
				<div className={styles.thumb}>
					{image ?
						<img src={image} alt="" className={styles.thumbImage} />
					:	<span className={styles.noThumb} aria-hidden />}
				</div>

				<div className={styles.rowInfo}>
					<span className={styles.rowTitle}>{title}</span>
					<span className={styles.rowMeta}>
						<span>ID {id}</span>
						<span className={styles.metaSep} aria-hidden>
							·
						</span>
						<span>
							{filtersCount} {filtersLabel(filtersCount)}
						</span>
						{!visibleOnSite ?
							<span className={styles.hiddenBadge}>Скрыта на сайте</span>
						:	null}
					</span>
				</div>

				<ChevronRight size={18} className={styles.rowChevron} aria-hidden />
			</Link>

			{canDelete ?
				<button
					type="button"
					className={styles.deleteBtn}
					onClick={() => onDeleteRequest({ id, title, image, filtersCount, visibleOnSite })}
					aria-label={`Удалить категорию ${title}`}
				>
					<Trash2 size={15} aria-hidden />
				</button>
			:	null}
		</article>
	);
}
