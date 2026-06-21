"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import type { FooterContactBlock, FooterContactItem, FooterIconKey } from "@/lib/footerDisplay";
import { FOOTER_ICON_OPTIONS, createEmptyFooterContactItem } from "@/lib/footerDisplay";
import { FooterLucideIcon } from "@/lib/footerLucideIcons";
import { formatPhoneDisplay, isValidPhoneDigits, normalizePhoneDigits, phoneToTelHref } from "@/lib/phoneUtils";
import styles from "../FooterEditor.module.scss";

type FooterContactBlockCardProps = {
	block: FooterContactBlock;
	index: number;
	onChange: (index: number, patch: Partial<FooterContactBlock>) => void;
	onRemove: (index: number) => void;
};

function formatLinesCount(count: number): string {
	if (count === 0) return "Нет строк";

	const mod10 = count % 10;
	const mod100 = count % 100;

	if (mod10 === 1 && mod100 !== 11) return `${count} строка`;
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} строки`;
	return `${count} строк`;
}

export default function FooterContactBlockCard({ block, index, onChange, onRemove }: FooterContactBlockCardProps) {
	const [expanded, setExpanded] = useState(true);
	const patch = (partial: Partial<FooterContactBlock>) => onChange(index, partial);

	const displayTitle = block.title?.trim() || "Без названия";
	const filledItemsCount = block.items.filter((item) => item.value.trim() !== "").length;
	const iconLabel = FOOTER_ICON_OPTIONS.find((opt) => opt.value === block.icon)?.label ?? "Иконка";

	const updateItem = (itemIndex: number, partial: Partial<FooterContactItem>) => {
		const items = [...block.items];
		items[itemIndex] = { ...items[itemIndex], ...partial };
		patch({ items });
	};

	const removeItem = (itemIndex: number) => patch({ items: block.items.filter((_, i) => i !== itemIndex) });

	const addItem = () => patch({ items: [...block.items, createEmptyFooterContactItem()] });

	return (
		<article className={[styles.blockCard, expanded ? styles.isExpanded : ""].filter(Boolean).join(" ")}>
			<header className={styles.blockCardHead}>
				<div className={styles.blockCardSummary}>
					<span className={styles.blockIconBadge} aria-hidden>
						<FooterLucideIcon icon={block.icon} size={22} strokeWidth={1.75} />
					</span>

					<div className={styles.blockHeadMain}>
						<span className={[styles.blockCardTitle, !block.title?.trim() ? styles.isPlaceholder : ""].filter(Boolean).join(" ")}>
							{displayTitle}
						</span>
						<span className={styles.blockCardMeta}>
							<span className={styles.blockMetaChip}>{formatLinesCount(filledItemsCount)}</span>
							<span className={styles.blockMetaDot} aria-hidden />
							<span>{iconLabel}</span>
						</span>
					</div>
				</div>

				<button type="button" className={styles.removeBlockBtn} onClick={() => onRemove(index)}>
					Удалить
				</button>
			</header>

			<div className={styles.blockCardBody} id={`footer-block-panel-${block.id}`} aria-hidden={!expanded}>
				<div className={styles.blockCardBodyInner}>
					<div className={styles.fieldGroup}>
						<label>Заголовок</label>
						<input
							type="text"
							value={block.title ?? ""}
							onChange={(e) => patch({ title: e.target.value.trim() || null })}
							placeholder="Например: Пункты выдачи"
						/>
					</div>

					<div className={styles.fieldGroup}>
						<label>Иконка блока</label>
						<div className={styles.iconPicker}>
							<div className={styles.iconPickerCurrent}>
								<div className={styles.iconPreviewLarge} aria-hidden>
									<FooterLucideIcon icon={block.icon} size={26} strokeWidth={1.75} />
								</div>
								<div className={styles.iconPreviewMeta}>
									<span className={styles.iconPreviewLabel}>
										{FOOTER_ICON_OPTIONS.find((opt) => opt.value === block.icon)?.label ?? "Иконка"}
									</span>
									<span className={styles.iconPreviewHint}>Так будет выглядеть рядом с заголовком на сайте</span>
								</div>
							</div>

							<div className={styles.iconPickerRail} role="radiogroup" aria-label="Выбор иконки блока">
								{FOOTER_ICON_OPTIONS.map((opt) => {
									const isSelected = block.icon === opt.value;
									return (
										<button
											key={opt.value}
											type="button"
											role="radio"
											aria-checked={isSelected}
											aria-label={opt.label}
											title={opt.label}
											className={[styles.iconChip, isSelected ? styles.isSelected : ""].filter(Boolean).join(" ")}
											onClick={() => patch({ icon: opt.value as FooterIconKey })}
										>
											<FooterLucideIcon icon={opt.value} size={20} strokeWidth={1.75} />
										</button>
									);
								})}
							</div>
						</div>
					</div>

					<div className={styles.fieldGroup}>
						<label>Строки списка</label>
						{block.items.length === 0 ?
							<p className={styles.emptyListNote}>Пока нет строк — добавьте адрес, телефон или любой текст.</p>
						:	null}
						<div className={styles.listStack}>
							{block.items.map((item, itemIndex) => (
								<div key={`${block.id}-item-${itemIndex}`} className={styles.listItemCard}>
									<div className={styles.listItemHead}>
										<span className={styles.listItemIndex}>Строка {itemIndex + 1}</span>
										<button type="button" className={styles.listItemRemove} onClick={() => removeItem(itemIndex)} aria-label="Удалить строку">
											Удалить
										</button>
									</div>

									<div className={styles.typeSwitch} role="group" aria-label="Тип строки">
										<button
											type="button"
											className={[styles.typeSwitchBtn, item.type === "text" ? styles.isActive : ""].filter(Boolean).join(" ")}
											onClick={() => updateItem(itemIndex, { type: "text" })}
										>
											Текст
										</button>
										<button
											type="button"
											className={[styles.typeSwitchBtn, item.type === "phone" ? styles.isActive : ""].filter(Boolean).join(" ")}
											onClick={() => updateItem(itemIndex, { type: "phone" })}
										>
											Телефон
										</button>
									</div>

									{item.type === "phone" ?
										<div className={styles.listItemPhoneWrap}>
											<PhoneInput
												value={normalizePhoneDigits(item.value)}
												onValueChange={(raw) => updateItem(itemIndex, { value: raw })}
												inputClassName={styles.listItemInput}
											/>
											{isValidPhoneDigits(item.value) ?
												<p className={styles.listItemPhoneHint}>
													Ссылка:{" "}
													<a href={phoneToTelHref(item.value)}>{formatPhoneDisplay(item.value)}</a>
												</p>
											:	null}
										</div>
									:	<input
											className={styles.listItemInput}
											type="text"
											value={item.value}
											onChange={(e) => updateItem(itemIndex, { value: e.target.value })}
											placeholder="Адрес или текст для отображения"
										/>
									}
								</div>
							))}
						</div>
						<button type="button" className={styles.addListBtn} onClick={addItem}>
							+ Добавить строку
						</button>
					</div>
				</div>
			</div>

			<button
				type="button"
				className={styles.blockExpandBar}
				onClick={() => setExpanded((prev) => !prev)}
				aria-expanded={expanded}
				aria-controls={`footer-block-panel-${block.id}`}
			>
				<span>{expanded ? "Свернуть" : "Развернуть"}</span>
				<ChevronDown size={18} strokeWidth={2} className={styles.blockExpandIcon} aria-hidden />
			</button>
		</article>
	);
}
