"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import styles from "./styles.module.scss";

// Компонент кнопки добавления товара в корзину
// Используется на странице товара для добавления товара в корзину
interface AddToCartButtonProps {
	product: {
		id: number;
		title: string;
		sku: string;
		price: number;
		brand: string;
		image: string | null;
	};
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
	const addItem = useCartStore((state) => state.addItem); // Получаем функцию добавления товара из store
	const [isAdded, setIsAdded] = useState(false); // Состояние для отслеживания добавления товара

	// Функция, которая срабатывает при нажатии на кнопку
	const handleAddToCart = () => {
		// Добавляем товар в корзину с количеством 1
		addItem({
			id: product.id,
			title: product.title,
			sku: product.sku,
			price: product.price,
			brand: product.brand,
			image: product.image,
			quantity: 1,
		});

		// Показываем "Добавлено" на 2 секунды
		setIsAdded(true);
		setTimeout(() => {
			setIsAdded(false);
		}, 2000);
	};

	return (
		<div className={`button ${styles.button} ${isAdded ? styles.added : ""}`} onClick={handleAddToCart}>
			{isAdded ? "Добавлено" : "В корзину"}
		</div>
	);
}
