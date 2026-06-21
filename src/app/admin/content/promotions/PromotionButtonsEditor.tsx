"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import { normalizePhoneDigits } from "@/lib/phoneUtils";
import styles from "../local_components/styles.module.scss";
import {
	createEmptyPromotionButton,
	PROMOTION_BUTTONS_MAX,
	type PromotionButton,
	type PromotionButtonType,
} from "@/lib/promotionButtons";
import { getSitePageLabel } from "@/lib/sitePagesCatalog";

type SitePageRow = {
	path: string;
	label: string;
	group: string;
};

type Props = {
	buttons: PromotionButton[];
	onChange: (buttons: PromotionButton[]) => void;
};

const TYPE_LABELS: Record<PromotionButtonType, string> = {
	phone: "Телефон",
	link: "Внешняя ссылка",
	internal: "Страница сайта",
	request: "Оставить заявку",
};

function updateButton(buttons: PromotionButton[], id: string, patch: Partial<PromotionButton>): PromotionButton[] {
	return buttons.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

export default function PromotionButtonsEditor({ buttons, onChange }: Props) {
	const canAdd = buttons.length < PROMOTION_BUTTONS_MAX;

	const addButton = (type: PromotionButtonType) => {
		if (!canAdd) return;
		onChange([...buttons, createEmptyPromotionButton(type, buttons.length)]);
	};

	const removeButton = (id: string) => {
		onChange(buttons.filter((b) => b.id !== id));
	};

	return (
		<div className={styles.promotionButtonsEditor}>
			<p className={styles.sectionNote}>До {PROMOTION_BUTTONS_MAX} кнопок на акцию. Для типа «Телефон» на кнопке отображается только номер.</p>

			{buttons.map((button, index) => (
				<PromotionButtonRow
					key={button.id}
					button={button}
					index={index}
					onChange={(patch) => onChange(updateButton(buttons, button.id, patch))}
					onRemove={() => removeButton(button.id)}
				/>
			))}

			{canAdd ? (
				<button type="button" className={styles.promotionButtonsAddTrigger} onClick={() => addButton("link")}>
					<span className={styles.promotionButtonsAddIcon} aria-hidden="true">
						+
					</span>
					<span>Добавить кнопку</span>
				</button>
			) : null}
		</div>
	);
}

function PromotionButtonRow({
	button,
	index,
	onChange,
	onRemove,
}: {
	button: PromotionButton;
	index: number;
	onChange: (patch: Partial<PromotionButton>) => void;
	onRemove: () => void;
}) {
	return (
		<div className={styles.promotionButtonCard}>
			<div className={styles.promotionButtonCardHead}>
				<span className={styles.promotionButtonCardTitle}>
					Кнопка {index + 1}: {TYPE_LABELS[button.type]}
				</span>
				<button type="button" className={styles.promotionButtonRemove} onClick={onRemove}>
					<Trash2 size={16} aria-hidden="true" />
					<span>Удалить</span>
				</button>
			</div>

			<div className="formRow">
				<div className="formField">
					<label>Тип</label>
					<select
						value={button.type}
						onChange={(e) => {
							const type = e.target.value as PromotionButtonType;
							const fresh = createEmptyPromotionButton(type, index);
							onChange({ ...fresh, id: button.id });
						}}
					>
						{(Object.keys(TYPE_LABELS) as PromotionButtonType[]).map((type) => (
							<option key={type} value={type}>
								{TYPE_LABELS[type]}
							</option>
						))}
					</select>
				</div>
				{button.type !== "phone" ? (
					<div className="formField">
						<label>Текст кнопки</label>
						<input type="text" value={button.label} onChange={(e) => onChange({ label: e.target.value })} />
					</div>
				) : null}
			</div>

			{button.type === "phone" ? (
				<div className="formRow">
					<div className="formField fullWidth">
						<label>Номер телефона (текст кнопки)</label>
						<PhoneInput
							value={normalizePhoneDigits(button.label)}
							onValueChange={(rawValue: string) => onChange({ label: rawValue })}
							inputClassName={styles.promotionPhoneInput}
						/>
					</div>
				</div>
			) : null}

			{button.type === "link" ? (
				<div className="formRow">
					<div className="formField fullWidth">
						<label>Ссылка</label>
						<input
							type="url"
							placeholder="https://..."
							value={button.href ?? ""}
							onChange={(e) => onChange({ href: e.target.value })}
						/>
					</div>
					<div className="formField">
						<label className={styles.checkboxLabel}>
							<input
								type="checkbox"
								className={styles.checkboxInput}
								checked={Boolean(button.openInNewTab)}
								onChange={(e) => onChange({ openInNewTab: e.target.checked })}
							/>
							Открывать в новом окне
						</label>
					</div>
				</div>
			) : null}

			{button.type === "internal" ? (
				<div className="formRow">
					<div className="formField fullWidth">
						<label>Страница сайта</label>
						<SitePagePicker
							value={button.internalPath ?? ""}
							onChange={(path) => onChange({ internalPath: path })}
						/>
					</div>
					<div className="formField">
						<label className={styles.checkboxLabel}>
							<input
								type="checkbox"
								className={styles.checkboxInput}
								checked={Boolean(button.openInNewTab)}
								onChange={(e) => onChange({ openInNewTab: e.target.checked })}
							/>
							Открывать в новом окне
						</label>
					</div>
				</div>
			) : null}

			{button.type === "request" ? (
				<p className={styles.sectionNote}>Откроется форма заявки, как на главной. В админке будет указано, с какой акции пришла заявка.</p>
			) : null}
		</div>
	);
}

type SitePagePanelLayout = {
	placement: "below" | "above";
	left: number;
	width: number;
	maxHeight: number;
	top?: number;
	bottom?: number;
};

const SITE_PAGES_PAGE_SIZE = 10;
const VIEWPORT_PAD = 12;
const PANEL_GAP = 6;
const FIXED_BUTTONS_RESERVE = 96;
const MIN_PANEL_HEIGHT = 160;
const PREFERRED_PANEL_HEIGHT = 280;

function SitePagePicker({ value, onChange }: { value: string; onChange: (path: string) => void }) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [items, setItems] = useState<SitePageRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [panelLayout, setPanelLayout] = useState<SitePagePanelLayout | null>(null);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);

	const displayLabel = useMemo(() => {
		if (!value.trim()) return "Выберите страницу";
		const fromList = items.find((i) => i.path === value);
		return fromList?.label ?? getSitePageLabel(value);
	}, [value, items]);

	const updatePanelLayout = useCallback(() => {
		const trigger = triggerRef.current;
		if (!trigger) return;

		const rect = trigger.getBoundingClientRect();
		const viewportHeight = window.innerHeight;

		let width = rect.width;
		if (width > window.innerWidth - VIEWPORT_PAD * 2) {
			width = window.innerWidth - VIEWPORT_PAD * 2;
		}

		let left = rect.left;
		if (left + width > window.innerWidth - VIEWPORT_PAD) {
			left = Math.max(VIEWPORT_PAD, window.innerWidth - VIEWPORT_PAD - width);
		}

		const maxBelow = viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_PAD - FIXED_BUTTONS_RESERVE;
		const maxAbove = rect.top - PANEL_GAP - VIEWPORT_PAD;
		const preferAbove = maxBelow < MIN_PANEL_HEIGHT && maxAbove > maxBelow;
		const placement = preferAbove ? "above" : "below";
		const maxHeight = Math.max(120, Math.min(PREFERRED_PANEL_HEIGHT, placement === "below" ? maxBelow : maxAbove));

		const layout: SitePagePanelLayout = {
			placement,
			left,
			width,
			maxHeight,
		};

		if (placement === "above") {
			layout.bottom = viewportHeight - rect.top + PANEL_GAP;
		} else {
			layout.top = rect.bottom + PANEL_GAP;
		}

		setPanelLayout(layout);
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	useLayoutEffect(() => {
		if (!open) {
			setPanelLayout(null);
			return;
		}

		updatePanelLayout();
	}, [open, updatePanelLayout]);

	useEffect(() => {
		if (!open) return;

		const onMove = () => updatePanelLayout();
		window.addEventListener("resize", onMove);
		window.addEventListener("scroll", onMove, true);
		return () => {
			window.removeEventListener("resize", onMove);
			window.removeEventListener("scroll", onMove, true);
		};
	}, [open, updatePanelLayout]);

	const handleQueryChange = (nextQuery: string) => {
		setQuery(nextQuery);
		setPage(1);
	};
	const clearQuery = () => {
		setQuery("");
		setPage(1);
	};

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		const timer = window.setTimeout(async () => {
			setLoading(true);
			try {
				const params = new URLSearchParams({
					q: query,
					limit: String(SITE_PAGES_PAGE_SIZE),
					page: String(page),
				});
				const res = await fetch(`/api/admin/site-pages?${params}`, { credentials: "include" });
				const data = await res.json();
				if (cancelled) return;
				setItems(Array.isArray(data.items) ? data.items : []);
				setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 0);
			} catch {
				if (!cancelled) setItems([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 280);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [open, query, page]);

	useEffect(() => {
		const onDocClick = (e: MouseEvent) => {
			const target = e.target as Node;
			if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
			setOpen(false);
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, []);

	const panel =
		open && mounted && panelLayout
			? createPortal(
					<div
						ref={panelRef}
						className={styles.sitePagePickerPanel}
						style={{
							position: "fixed",
							top: panelLayout.top,
							bottom: panelLayout.bottom,
							left: panelLayout.left,
							width: panelLayout.width,
							maxHeight: panelLayout.maxHeight,
							zIndex: 12000,
						}}
					>
						<div className={`searchInput ${styles.sitePagePickerSearchWrap}`}>
							<input
								type="text"
								placeholder="Поиск страницы..."
								value={query}
								onChange={(e) => handleQueryChange(e.target.value)}
								autoFocus
							/>
							{query.trim() ? (
								<div
									role="button"
									tabIndex={0}
									className="clearSearchButton"
									onClick={clearQuery}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											clearQuery();
										}
									}}
									aria-label="Очистить поиск"
								/>
							) : null}
						</div>
						<div className={styles.sitePagePickerList}>
							{loading ? <div className={styles.sitePagePickerEmpty}>Загрузка…</div> : null}
							{!loading && items.length === 0 ? <div className={styles.sitePagePickerEmpty}>Ничего не найдено</div> : null}
							{!loading
								? items.map((item) => (
										<button
											key={item.path}
											type="button"
											className={[styles.sitePagePickerOption, value === item.path ? styles.sitePagePickerOptionActive : ""]
												.filter(Boolean)
												.join(" ")}
											onClick={() => {
												onChange(item.path);
												setOpen(false);
											}}
										>
											<span className={styles.sitePagePickerOptionLabel}>{item.label}</span>
											<span className={styles.sitePagePickerOptionHint}>{item.path}</span>
										</button>
									))
								: null}
						</div>
						{!loading && totalPages > 1 ? (
							<div className={styles.sitePagePickerPagination}>
								<button
									type="button"
									className={styles.sitePagePickerPaginationButton}
									disabled={page <= 1}
									onClick={() => setPage((current) => Math.max(1, current - 1))}
								>
									Назад
								</button>
								<span className={styles.sitePagePickerPaginationInfo}>
									{page} / {totalPages}
								</span>
								<button
									type="button"
									className={styles.sitePagePickerPaginationButton}
									disabled={page >= totalPages}
									onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
								>
									Далее
								</button>
							</div>
						) : null}
					</div>,
					document.body,
				)
			: null;

	return (
		<div className={styles.sitePagePicker}>
			<button
				ref={triggerRef}
				type="button"
				className={styles.sitePagePickerTrigger}
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-haspopup="listbox"
			>
				<span>{displayLabel}</span>
				<span className={styles.sitePagePickerChevron} aria-hidden="true" />
			</button>
			{panel}
		</div>
	);
}
