"use client";

import React from "react";

export type RelationMetaLine = { label: string; value: React.ReactNode };

type Props = {
	/** Заголовок: ссылка, статус */
	title: React.ReactNode;
	/** Строки под заголовком */
	metaLines: RelationMetaLine[];
	actions?: React.ReactNode;
};

/**
 * Компактная карточка привязанной записи/заказа в шапке.
 * Использует те же классы, что и выбранный результат поиска (bookingLinkSelected*),
 * чтобы визуально совпадать с уже знакомым блоком, без «ряженого» productItem.
 */
export default function LinkedRelationCard({ title, metaLines, actions }: Props) {
	return (
		<div className="bookingLinkInlineSearch">
			<div className="bookingLinkSelectedCard">
				<div className="bookingLinkSelectedTitle">{title}</div>
				{metaLines.map((line, i) => (
					<div key={i} className="bookingLinkSelectedMeta">
						<strong>{line.label}</strong> {line.value}
					</div>
				))}
			</div>
			{actions ? <div className="bookingLinkActions">{actions}</div> : null}
		</div>
	);
}
