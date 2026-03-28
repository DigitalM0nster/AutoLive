"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderCommentAuthorSnapshot, OrderCommentEntry } from "@/lib/orderComments";
import styles from "./OrderCommentsSection.module.scss";

type OrderCommentsSectionProps = {
	comments: OrderCommentEntry[];
	onCommentsChange: (next: OrderCommentEntry[]) => void;
	canEdit: boolean;
	isSuperadmin: boolean;
	commentAddOpen: boolean;
	onCommentAddOpenChange: (open: boolean) => void;
	commentDraft: string;
	onCommentDraftChange: (text: string) => void;
};

function getAuthorDisplayName(snapshot: OrderCommentAuthorSnapshot | null): string {
	if (!snapshot) return "—";
	const fio = [snapshot.last_name, snapshot.first_name, snapshot.middle_name].filter(Boolean).join(" ").trim();
	return fio || snapshot.role || "—";
}

function getRoleNameRu(role: string): string {
	switch (role) {
		case "superadmin":
			return "Суперадмин";
		case "admin":
			return "Администратор";
		case "manager":
			return "Менеджер";
		case "client":
			return "Пользователь";
		default:
			return role || "—";
	}
}

function buildAuthorTooltip(aid: number | null, snap: OrderCommentAuthorSnapshot | null): string | undefined {
	const parts: string[] = [];
	if (aid != null) parts.push(`ID: ${aid}`);
	if (snap?.phone) parts.push(`Тел.: ${snap.phone}`);
	if (snap?.department?.name) parts.push(`Отдел: ${snap.department.name}`);
	if (snap?.role) parts.push(getRoleNameRu(snap.role));
	return parts.length ? parts.join("\n") : undefined;
}

export default function OrderCommentsSection({
	comments,
	onCommentsChange,
	canEdit,
	isSuperadmin,
	commentAddOpen,
	onCommentAddOpenChange,
	commentDraft,
	onCommentDraftChange,
}: OrderCommentsSectionProps) {
	const router = useRouter();
	const [existingUsers, setExistingUsers] = useState<
		Map<number, { id: number; first_name: string; last_name: string; middle_name: string | null; phone: string; role: string }>
	>(new Map());

	const checkUsersExistence = useCallback(async (userIds: number[]) => {
		if (userIds.length === 0) return;
		try {
			const params = new URLSearchParams();
			params.set("userIds", userIds.join(","));
			const res = await fetch(`/api/users/check-existence?${params}`, { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				const users = data.existingUsers || {};
				setExistingUsers(new Map(Object.entries(users).map(([id, u]: [string, any]) => [parseInt(id, 10), u])));
			}
		} catch (e) {
			console.error("Ошибка проверки пользователей (комментарии заказа):", e);
		}
	}, []);

	useEffect(() => {
		const ids = [...new Set(comments.map((c) => c.authorId).filter((id): id is number => typeof id === "number" && Number.isFinite(id)))];
		void checkUsersExistence(ids);
	}, [comments, checkUsersExistence]);

	const formatDateTime = (iso: string) => {
		if (!iso) return "—";
		const d = new Date(iso);
		if (isNaN(d.getTime())) return "—";
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const openAdd = () => {
		onCommentAddOpenChange(true);
		onCommentDraftChange("");
	};

	const closeAdd = () => {
		onCommentAddOpenChange(false);
		onCommentDraftChange("");
	};

	const removeComment = (id: string) => {
		onCommentsChange(comments.filter((c) => c.id !== id));
	};

	/** Одна строка: имя / ссылка / снепшот + лаконичная пометка «удалён»; детали — в title */
	const renderAuthorLine = (comment: OrderCommentEntry) => {
		const aid = comment.authorId;
		const snap = comment.authorSnapshot;
		const tip = buildAuthorTooltip(aid, snap);

		if (aid == null && !snap) {
			return (
				<span className={styles.authorValueMuted} title={tip}>
					не указан
				</span>
			);
		}

		if (aid == null && snap) {
			return (
				<span className={styles.authorLineInner} title={tip}>
					<span className={styles.authorName}>{getAuthorDisplayName(snap)}</span>
					<span className={styles.authorDeletedBadge}>аккаунт удалён</span>
				</span>
			);
		}

		if (aid != null && snap) {
			const userExists = existingUsers.has(aid);
			const actualUser = existingUsers.get(aid);
			const nameFromSnap = getAuthorDisplayName(snap);
			const nameLive =
				actualUser &&
				[actualUser.last_name, actualUser.first_name, actualUser.middle_name].filter(Boolean).join(" ").trim();

			if (userExists) {
				return (
					<span className={styles.authorLineInner} title={tip}>
						<a
							href={`/admin/users/${aid}`}
							className={`itemLink ${styles.authorLink}`}
							onClick={(e) => {
								e.preventDefault();
								router.push(`/admin/users/${aid}`);
							}}
						>
							{nameLive || nameFromSnap}
						</a>
						{snap.role ? <span className={styles.authorRoleMuted}>· {getRoleNameRu(snap.role)}</span> : null}
					</span>
				);
			}

			return (
				<span className={styles.authorLineInner} title={tip}>
					<span className={styles.authorName}>{nameFromSnap}</span>
					<span className={styles.authorDeletedBadge}>аккаунт удалён</span>
				</span>
			);
		}

		if (aid != null) {
			const userExists = existingUsers.has(aid);
			const actualUser = existingUsers.get(aid);
			const short =
				userExists && actualUser
					? [actualUser.last_name, actualUser.first_name].filter(Boolean).join(" ").trim() || `ID ${aid}`
					: `ID ${aid}`;

			if (userExists) {
				return (
					<span className={styles.authorLineInner} title={tip}>
						<a
							href={`/admin/users/${aid}`}
							className={`itemLink ${styles.authorLink}`}
							onClick={(e) => {
								e.preventDefault();
								router.push(`/admin/users/${aid}`);
							}}
						>
							{short}
						</a>
					</span>
				);
			}

			return (
				<span className={styles.authorLineInner} title={tip}>
					<span className={styles.authorName}>{short}</span>
					<span className={styles.authorDeletedBadge}>аккаунт удалён</span>
				</span>
			);
		}

		return <span className={styles.authorValueMuted}>—</span>;
	};

	return (
		<div className={`formField`}>
			<label>Комментарии</label>
			<div className={styles.commentsWrap}>
				{comments.length > 0 ? (
					<div className={styles.commentList}>
						{comments.map((comment) => (
							<div key={comment.id} className={styles.commentCard}>
								<div className={styles.commentCardTop}>
									<time className={styles.commentDate} dateTime={comment.createdAt}>
										{formatDateTime(comment.createdAt)}
									</time>
									{canEdit && isSuperadmin ? (
										<button type="button" className={styles.removeCommentButtonTop} onClick={() => removeComment(comment.id)}>
											Удалить
										</button>
									) : null}
								</div>
								<div className={styles.commentBody}>{comment.text}</div>
								<div className={styles.authorLine}>
									<span className={styles.authorLineLabel}>Автор</span>
									{renderAuthorLine(comment)}
								</div>
							</div>
						))}
					</div>
				) : null}

				{canEdit ? (
					<div className={styles.addRow}>
						{!commentAddOpen ? (
							<button type="button" className={styles.addDashedButton} onClick={openAdd}>
								<span className={styles.addIcon} aria-hidden>
									+
								</span>
								Добавить
							</button>
						) : (
							<div className={`${styles.commentCard} ${styles.draftCard}`}>
								<div className={styles.commentCardTop}>
									<span className={styles.draftCardTitle}>Новый комментарий</span>
									<button type="button" className={styles.removeCommentButtonTop} onClick={closeAdd}>
										Удалить
									</button>
								</div>
								<textarea
									className={styles.draftInput}
									rows={4}
									value={commentDraft}
									onChange={(e) => onCommentDraftChange(e.target.value)}
									placeholder="Текст комментария"
								/>
							</div>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}
