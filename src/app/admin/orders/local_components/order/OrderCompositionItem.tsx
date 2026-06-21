"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import DatePickerField from "@/components/ui/datePicker/DatePickerField";
import datePickerFieldStyles from "@/components/ui/datePicker/DatePickerField.module.scss";
import type { OrderItemClient } from "@/lib/types";
import { formatProductPrice } from "@/lib/productSearchDisplay";
import styles from "./OrderCompositionItem.module.scss";

export type OrderCompositionItemProps = {
	item: OrderItemClient;
	index: number;
	isExpanded: boolean;
	canEditOrderItems: boolean;
	canEditSupplierDates: boolean;
	supplierDatePlaceholder?: string;
	fieldErrors: Set<string>;
	skuKey: string;
	conflictMessage?: string | null;
	onToggleExpand: (sku: string, e?: React.MouseEvent) => void;
	onRemove: (sku: string) => void;
	onProductFieldChange: (sku: string, field: keyof OrderItemClient, value: string) => void;
	onQuantityChange: (sku: string, quantity: number) => void;
	clearFieldError: (field: string) => void;
};

/** Компактная премиальная карточка позиции в составе заказа */
export function OrderCompositionItem({
	item,
	index,
	isExpanded,
	canEditOrderItems,
	canEditSupplierDates,
	supplierDatePlaceholder = "Необязательно",
	fieldErrors,
	skuKey,
	conflictMessage,
	onToggleExpand,
	onRemove,
	onProductFieldChange,
	onQuantityChange,
	clearFieldError,
}: OrderCompositionItemProps) {
	const lineTotal = item.product_price * item.quantity;
	const lineMainReadonly = !canEditOrderItems;
	const dateRowReadonly = !canEditSupplierDates;
	const carModel = item.carModel?.trim();
	const vinCode = item.vinCode?.trim();

	return (
		<article className={[styles.card, isExpanded && styles.isExpanded].filter(Boolean).join(" ")}>
			<div className={styles.head} onClick={(e) => onToggleExpand(item.product_sku, e)}>
				<span className={styles.index}>{index + 1}</span>
				<div className={styles.thumb}>
					{item.product_image ? (
						<img src={item.product_image} alt={item.product_title} className={styles.thumbImage} loading="lazy" />
					) : (
						<span className={styles.thumbEmpty}>Нет фото</span>
					)}
				</div>
				<div className={styles.main}>
					<div className={styles.titleRow}>
						<div className={styles.title}>
							{item.productId ? (
								<Link href={`/admin/product-management/products/${item.productId}`} target="_blank" onClick={(e) => e.stopPropagation()}>
									{item.product_title}
								</Link>
							) : (
								item.product_title
							)}
						</div>
						<span className={styles.lineTotal}>{formatProductPrice(lineTotal)}</span>
					</div>
					<div className={styles.chips}>
						<span className={styles.chip}>{item.product_sku}</span>
						{item.product_brand ? <span className={styles.chip}>{item.product_brand}</span> : null}
						<span className={[styles.chip, styles.chipQty].join(" ")}>×{item.quantity}</span>
						<span className={[styles.chip, styles.chipMuted].join(" ")}>{formatProductPrice(item.product_price)} / шт</span>
						{item.department?.name ? <span className={[styles.chip, styles.chipMuted].join(" ")}>{item.department.name}</span> : null}
					</div>
					{(carModel || vinCode) && (
						<div className={styles.extraLine}>
							{carModel ? `Авто: ${carModel}` : null}
							{carModel && vinCode ? " · " : null}
							{vinCode ? `VIN: ${vinCode}` : null}
						</div>
					)}
				</div>
			</div>

			<div className={styles.actions}>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(item.product_sku);
					}}
					className={styles.removeBtn}
					disabled={!canEditOrderItems}
				>
					Удалить
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggleExpand(item.product_sku, e);
					}}
					className={[styles.expandBtn, isExpanded && styles.isExpanded].filter(Boolean).join(" ")}
				>
					Подробнее
					<ChevronDown size={14} strokeWidth={2} className={[styles.expandIcon, isExpanded && styles.isExpanded].filter(Boolean).join(" ")} aria-hidden />
				</button>
			</div>

			<div className={[styles.dateRow, dateRowReadonly && styles.readonlySegment].filter(Boolean).join(" ")} onClick={(e) => e.stopPropagation()}>
				<DatePickerField
					label="Дата поставки поставщиком"
					value={item.supplierDeliveryDate || ""}
					onChange={(date) => {
						onProductFieldChange(item.product_sku, "supplierDeliveryDate", date || "");
						clearFieldError("supplierDeliveryDate");
						clearFieldError(skuKey);
					}}
					onFocus={() => {
						clearFieldError("supplierDeliveryDate");
						clearFieldError(skuKey);
					}}
					placeholder={supplierDatePlaceholder}
					className={
						fieldErrors.has("supplierDeliveryDate") || fieldErrors.has(skuKey) || Boolean(conflictMessage)
							? datePickerFieldStyles.error
							: undefined
					}
					disabled={!canEditSupplierDates}
				/>
				{conflictMessage ? <p className={styles.conflictHint}>{conflictMessage}</p> : null}
			</div>

			{isExpanded ? (
				<div className={styles.details}>
					<div className={`itemInfoBlock${lineMainReadonly ? " productItemReadonlySegment" : ""}`}>
					<div className="formField formFieldGroup">
						<div className="formField">
							<div className="formFieldTitle">Данные о товаре</div>
							<div className="formFieldInfo">
								<div className="itemInfoFields">
									<div className="infoField">
										<span className="infoLabel">Артикул:</span>
										<div className="text">{item.product_sku}</div>
									</div>
									<div className="infoField">
										<span className="infoLabel">Бренд:</span>
										<div className="text">{item.product_brand}</div>
									</div>
									<div className="infoField">
										<span className="infoLabel">Отдел:</span>
										<div className="text">
											{item.department?.id ? (
												<Link href={`/admin/departments/${item.department.id}`} className="itemLink" target="_blank">
													{item.department.name}
												</Link>
											) : (
												"—"
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="formField">
							<input
								type="text"
								value={item.carModel || ""}
								onChange={(e) => {
									onProductFieldChange(item.product_sku, "carModel", e.target.value);
									clearFieldError(`carModel_${item.product_sku}`);
								}}
								onFocus={() => clearFieldError(`carModel_${item.product_sku}`)}
								placeholder="Модель автомобиля"
								className={`textInput${fieldErrors.has(`carModel_${item.product_sku}`) ? " error" : ""}`}
								disabled={!canEditOrderItems}
							/>
							<input
								type="text"
								value={item.vinCode || ""}
								onChange={(e) => {
									onProductFieldChange(item.product_sku, "vinCode", e.target.value);
									clearFieldError(`vinCode_${item.product_sku}`);
								}}
								onFocus={() => clearFieldError(`vinCode_${item.product_sku}`)}
								placeholder="VIN-код"
								className={`textInput${fieldErrors.has(`vinCode_${item.product_sku}`) ? " error" : ""}`}
								disabled={!canEditOrderItems}
							/>
						</div>
					</div>

					<div className="formField formFieldGroup">
						<div className="formField">
							<div className="formFieldTitle">Количество</div>
							<div className="quantityControls">
								<button type="button" onClick={() => onQuantityChange(item.product_sku, item.quantity - 1)} className="quantityButton" disabled={!canEditOrderItems}>
									-
								</button>
								<input
									type="number"
									value={item.quantity}
									onChange={(e) => onQuantityChange(item.product_sku, parseInt(e.target.value, 10) || 0)}
									min="1"
									className="quantityInput"
									disabled={!canEditOrderItems}
								/>
								<button type="button" onClick={() => onQuantityChange(item.product_sku, item.quantity + 1)} className="quantityButton" disabled={!canEditOrderItems}>
									+
								</button>
							</div>
						</div>
						<div className="formField">
							<label>Цена за ед.</label>
							<input type="text" value={`${item.product_price} ₽`} disabled className="priceInput" />
						</div>
					</div>
					<div className="formField">
						<label>Сумма</label>
						<input type="text" value={`${lineTotal.toLocaleString("ru-RU")} ₽`} disabled className="totalInput" />
					</div>
					</div>
				</div>
			) : null}
		</article>
	);
}

type OrderCompositionToolbarProps = {
	count: number;
	total: number;
};

export function OrderCompositionToolbar({ count, total }: OrderCompositionToolbarProps) {
	return (
		<div className={styles.toolbar}>
			<span className={styles.stats}>
				<span className={styles.countBadge}>{count} поз.</span>
				<span className={styles.totalBadge}>{total.toLocaleString("ru-RU")} ₽</span>
			</span>
		</div>
	);
}

export { styles as orderCompositionStyles };
