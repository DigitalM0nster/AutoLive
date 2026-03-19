"use client";

import { Trash2 } from "lucide-react";

/**
 * Блок «Объект был удалён» для логов: иконка, текст, дата и кто удалил.
 * Используется внутри блока удаления в таблицах логов.
 */
type DeletedBlockNoticeProps = {
	/** Отформатированная дата удаления (например из formatDate(log.createdAt)) */
	deletedAt?: string;
	/** Кто удалил (например из getAdminName(log.admin)) */
	deletedBy?: string;
};

export default function DeletedBlockNotice({ deletedAt, deletedBy }: DeletedBlockNoticeProps) {
	const hasMeta = deletedAt || deletedBy;
	return (
		<div className="deletedBlockNotice">
			<Trash2 size={18} aria-hidden />
			<span className="deletedBlockNoticeText">Объект был удалён</span>
			{hasMeta && (
				<span className="deletedBlockNoticeMeta">
					{deletedAt && <>Дата: {deletedAt}</>}
					{deletedAt && deletedBy && " · "}
					{deletedBy && <>Кем: {deletedBy}</>}
				</span>
			)}
		</div>
	);
}
