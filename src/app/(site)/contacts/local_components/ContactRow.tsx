// Строка контакта: иконка (адрес/телефон/почта/часы) + текст. Цвет иконки задаётся через проп iconClassName (класс с color в CSS).

import React from "react";
import rowStyles from "./ContactRow.module.scss";

function iconClass(iconClassName?: string): string {
	return [rowStyles.iconWrap, iconClassName].filter(Boolean).join(" ");
}

const IconAddress = ({ iconClassName }: { iconClassName?: string }) => (
	<svg className={iconClass(iconClassName)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
		<circle cx="12" cy="10" r="3" />
	</svg>
);

const IconPhone = ({ iconClassName }: { iconClassName?: string }) => (
	<svg className={iconClass(iconClassName)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
	</svg>
);

const IconEmail = ({ iconClassName }: { iconClassName?: string }) => (
	<svg className={iconClass(iconClassName)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
		<polyline points="22,6 12,13 2,6" />
	</svg>
);

const IconClock = ({ iconClassName }: { iconClassName?: string }) => (
	<svg className={iconClass(iconClassName)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
		<circle cx="12" cy="12" r="10" />
		<polyline points="12 6 12 12 16 14" />
	</svg>
);

type IconType = "address" | "phone" | "email" | "hours";

function renderIcon(type: IconType, iconClassName?: string): React.ReactNode {
	switch (type) {
		case "address": return <IconAddress iconClassName={iconClassName} />;
		case "phone": return <IconPhone iconClassName={iconClassName} />;
		case "email": return <IconEmail iconClassName={iconClassName} />;
		case "hours": return <IconClock iconClassName={iconClassName} />;
	}
}

type Props = {
	type: IconType;
	children: React.ReactNode;
	/** Для карточек адресов — приглушённый текст */
	secondary?: boolean;
	/** Класс для иконки (например, цвет через color в CSS) */
	iconClassName?: string;
};

export function ContactRow({ type, children, secondary, iconClassName }: Props) {
	return (
		<div className={rowStyles.row}>
			{renderIcon(type, iconClassName)}
			<span className={secondary ? rowStyles.textSecondary : rowStyles.text}>{children}</span>
		</div>
	);
}

/** Одна иконка, несколько строк (каждый телефон/email — отдельная строка) */
type RowListProps = {
	type: "phone" | "email";
	items: string[];
	secondary?: boolean;
	/** Класс для иконки (например, цвет через color в CSS) */
	iconClassName?: string;
};

export function ContactRowList({ type, items, secondary, iconClassName }: RowListProps) {
	if (items.length === 0) return null;
	const lineClass = secondary ? rowStyles.lineSecondary : rowStyles.line;
	return (
		<div className={rowStyles.row}>
			{renderIcon(type, iconClassName)}
			<div className={rowStyles.lines}>
				{items.map((item) => (
					<span key={item} className={lineClass}>{item}</span>
				))}
			</div>
		</div>
	);
}
