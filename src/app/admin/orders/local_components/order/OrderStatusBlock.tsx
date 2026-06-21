"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./OrderStatusBlock.module.scss";

export type OrderStatusTone = "created" | "confirmed" | "booked" | "ready" | "paid" | "completed" | "returned";

const TONE_MODIFIERS: Record<OrderStatusTone, string> = {
	created: styles.toneCreated,
	confirmed: styles.toneConfirmed,
	booked: styles.toneBooked,
	ready: styles.toneReady,
	paid: styles.tonePaid,
	completed: styles.toneCompleted,
	returned: styles.toneReturned,
};

function formatStatusDate(value?: string | Date | null): string {
	if (!value) return "";
	const date = new Date(value);
	if (isNaN(date.getTime())) return "";
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

type OrderStatusBlockProps = {
	step: number;
	title: string;
	tone: OrderStatusTone;
	isActive: boolean;
	statusDate?: string | null;
	/** Краткая подсказка по шагу — что заполнять и в каком смысле */
	description?: string;
	children: ReactNode;
};

/** Компактная карточка шага статуса заказа — заголовок + сворачиваемое тело */
export default function OrderStatusBlock({ step, title, tone, isActive, statusDate, description, children }: OrderStatusBlockProps) {
	const [isExpanded, setIsExpanded] = useState(isActive);

	useEffect(() => {
		setIsExpanded(isActive);
	}, [isActive]);

	const toggleExpand = () => setIsExpanded((prev) => !prev);

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			toggleExpand();
		}
	};

	const formattedDate = statusDate ? formatStatusDate(statusDate) : "";

	return (
		<article
			className={[styles.statusBlock, TONE_MODIFIERS[tone], isExpanded && styles.isExpanded, isActive && styles.isCurrent].filter(Boolean).join(" ")}
		>
			<header
				className={styles.statusHead}
				onClick={toggleExpand}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
				aria-expanded={isExpanded}
			>
				<span className={styles.stepBadge}>{step}</span>
				<div className={styles.headMain}>
					<h3 className={styles.title}>{title}</h3>
					<div className={styles.headMeta}>
						{isActive ? <span className={styles.currentChip}>Текущий шаг</span> : null}
						{formattedDate ? <span className={styles.dateChip}>Присвоен: {formattedDate}</span> : null}
					</div>
				</div>
				<ChevronDown size={18} strokeWidth={2} className={styles.expandIcon} aria-hidden />
			</header>
			<div className={styles.statusBody} aria-hidden={!isExpanded}>
				<div className={styles.statusBodyInner}>
					{description ? <p className={styles.stepIntro}>{description}</p> : null}
					{children}
				</div>
			</div>
		</article>
	);
}

type OrderStatusFieldGroupProps = {
	title: string;
	hint?: string;
	/** Метка «необязательно» — для полей, которые можно пропустить */
	optional?: boolean;
	children: ReactNode;
};

/** Логическая группа полей внутри шага статуса */
export function OrderStatusFieldGroup({ title, hint, optional, children }: OrderStatusFieldGroupProps) {
	return (
		<section className={styles.fieldGroup}>
			<div className={styles.fieldGroupHead}>
				<div className={styles.fieldGroupTitleRow}>
					<h4 className={styles.fieldGroupTitle}>{title}</h4>
					{optional ? <span className={styles.fieldGroupOptional}>Необязательно</span> : null}
				</div>
				{hint ? <p className={styles.fieldGroupHint}>{hint}</p> : null}
			</div>
			<div className={styles.fieldGroupBody}>{children}</div>
		</section>
	);
}
