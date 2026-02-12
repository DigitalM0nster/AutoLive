"use client";

import Link from "next/link";
import { Promotion } from "@/lib/types";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "../local_components/styles.module.scss";

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

			{promo.image && <img src={promo.image} alt={promo.title} className={styles.promoCardImage} />}

			<div className={styles.promoCardBody}>
				<h3 className={styles.promoCardTitle}>{promo.title}</h3>
				<p className={styles.promoCardDescription}>{promo.description}</p>
				{promo.buttonText && promo.buttonLink && (
					<a href={promo.buttonLink} target="_blank" rel="noreferrer" className={styles.promoCardButtonLink}>
						{promo.buttonText}
					</a>
				)}
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
