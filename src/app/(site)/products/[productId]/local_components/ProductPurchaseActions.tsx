"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import styles from "../styles.module.scss";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 99;

interface ProductPurchaseActionsProps {
	product: {
		id: number;
		title: string;
		sku: string;
		price: number;
		brand: string;
		image: string | null;
	};
}

function CartIcon() {
	return (
		<svg className={styles.cartIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M6 6h15l-1.5 9h-12L6 6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
			<path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="9.5" cy="19.5" r="1.25" fill="currentColor" />
			<circle cx="16.5" cy="19.5" r="1.25" fill="currentColor" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg className={styles.cartIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export default function ProductPurchaseActions({ product }: ProductPurchaseActionsProps) {
	const addItem = useCartStore((state) => state.addItem);
	const [quantity, setQuantity] = useState(MIN_QUANTITY);
	const [isAdded, setIsAdded] = useState(false);

	const decreaseQuantity = () => {
		setQuantity((prev) => Math.max(MIN_QUANTITY, prev - 1));
	};

	const increaseQuantity = () => {
		setQuantity((prev) => Math.min(MAX_QUANTITY, prev + 1));
	};

	const handleAddToCart = () => {
		addItem({
			id: product.id,
			title: product.title,
			sku: product.sku,
			price: product.price,
			brand: product.brand,
			image: product.image,
			quantity,
		});

		setIsAdded(true);
		setTimeout(() => {
			setIsAdded(false);
		}, 2000);
	};

	return (
		<div className={styles.purchaseBlock}>
			<div className={styles.quantityField}>
				<span className={styles.quantityLabel} id={`product-quantity-label-${product.id}`}>
					Количество
				</span>
				<div className={styles.quantityControl} role="group" aria-labelledby={`product-quantity-label-${product.id}`}>
					<button
						type="button"
						className={styles.quantityButton}
						onClick={decreaseQuantity}
						disabled={quantity <= MIN_QUANTITY}
						aria-label="Уменьшить количество"
					>
						−
					</button>
					<span className={styles.quantityValue} aria-live="polite">
						{quantity}
					</span>
					<button
						type="button"
						className={styles.quantityButton}
						onClick={increaseQuantity}
						disabled={quantity >= MAX_QUANTITY}
						aria-label="Увеличить количество"
					>
						+
					</button>
				</div>
			</div>

			<button type="button" className={[styles.cartButton, isAdded && styles.added].filter(Boolean).join(" ")} onClick={handleAddToCart}>
				{isAdded ? <CheckIcon /> : <CartIcon />}
				<span>{isAdded ? "Добавлено в корзину" : "Добавить в корзину"}</span>
			</button>
		</div>
	);
}
