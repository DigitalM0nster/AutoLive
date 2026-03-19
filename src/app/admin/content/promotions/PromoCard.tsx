"use client";

import Link from "next/link";
import { Promotion } from "@/lib/types";
import { GripVertical, ImageIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./promotionsList.module.scss";

function formatPromoDates(start: string | null | undefined, end: string | null | undefined): string {
	if (!start && !end) return "";
	const s = start ? new Date(start).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : null;
	const e = end ? new Date(end).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : null;
	if (s && e) return `${s} — ${e}`;
	return s || e || "";
}

type Props = {
	promo: Promotion;
	onDelete: () => void;
};

export default function PromoCard({ promo, onDelete }: Props) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promo.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} className={styles.promoCard}>
			<div {...listeners} className={styles.promoCardDrag} title="Перетащить">
				<GripVertical size={18} />
			</div>

			{promo.image ? (
				<img src={promo.image} alt={promo.title} className={styles.promoCardImage} />
			) : (
				<div className={styles.promoCardImagePlaceholder} title="Нет изображения">
					<ImageIcon size={28} />
					<span>Нет фото</span>
				</div>
			)}

			<div className={styles.promoCardBody}>
				<h3 className={styles.promoCardTitle}>{promo.title}</h3>
				{(promo.startDate != null || promo.endDate != null) && (
					<p className={styles.promoCardDates}>
						{formatPromoDates(promo.startDate, promo.endDate)}
					</p>
				)}
				{promo.description ? <p className={styles.promoCardDescription}>{promo.description}</p> : null}
				{promo.buttonText && promo.buttonLink ? (
					<a href={promo.buttonLink} target="_blank" rel="noreferrer" className={styles.promoCardButtonLink}>
						{promo.buttonText}
					</a>
				) : null}
			</div>

			<div className={styles.promoCardActions}>
				<Link href={`/admin/content/promotions/${promo.id}`} className={styles.promoCardLink}>
					Редактировать
				</Link>
				<button type="button" onClick={onDelete} className={styles.promoCardDelete}>
					Удалить
				</button>
			</div>
		</div>
	);
}
