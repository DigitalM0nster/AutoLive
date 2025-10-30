"use client";

import { useCartStore } from "@/store/cartStore";
import styles from "./styles.module.scss";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";

// Компонент для отображения контента страницы корзины
export default function CartContent() {
	const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();
	const router = useRouter();

	const [clientName, setClientName] = useState("");
	const [clientPhoneRaw, setClientPhoneRaw] = useState(""); // только цифры из PhoneInput
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const totalPrice = getTotalPrice();

	// Если корзина пуста, показываем сообщение
	if (items.length === 0) {
		return (
			<div className={styles.cartEmpty}>
				<h1 className="pageTitle">Корзина пуста</h1>
				<p>Добавьте товары в корзину, чтобы увидеть их здесь</p>
				<div className={`button ${styles.buttonBack}`} onClick={() => router.push("/")}>
					На главную
				</div>
			</div>
		);
	}

	return (
		<div className={styles.cartContainer}>
			<h1 className="pageTitle">Корзина</h1>

			{/* Список товаров */}
			<div className={styles.cartItems}>
				{items.map((item) => (
					<div key={item.id} className={styles.cartItem}>
						{/* Изображение товара */}
						<div className={styles.itemImage}>{item.image ? <img src={item.image} alt={item.title} /> : <img src="/images/no-image.png" alt="Нет изображения" />}</div>

						{/* Информация о товаре */}
						<div className={styles.itemInfo}>
							<h3 className={styles.itemTitle}>{item.title}</h3>
							<div className={styles.itemDetails}>
								<div className={styles.itemSku}>Артикул: {item.sku}</div>
								<div className={styles.itemBrand}>Бренд: {item.brand}</div>
								<div className={styles.itemPrice}>Цена: {item.price}₽</div>
							</div>
						</div>

						{/* Управление количеством */}
						<div className={styles.itemControls}>
							<div className={styles.quantityControl}>
								<button className={styles.quantityButton} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
									-
								</button>
								<span className={styles.quantityValue}>{item.quantity}</span>
								<button className={styles.quantityButton} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
									+
								</button>
							</div>
							<div className={styles.itemTotalPrice}>{item.price * item.quantity}₽</div>
							<button className={styles.removeButton} onClick={() => removeItem(item.id)}>
								Удалить
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Итоговая информация */}
			<div className={styles.cartSummary}>
				<div className={styles.summaryRow}>
					<span>Товаров в корзине:</span>
					<span>{items.reduce((total, item) => total + item.quantity, 0)}</span>
				</div>
				<div className={styles.summaryRow}>
					<span>Общая сумма:</span>
					<span className={styles.totalAmount}>{totalPrice}₽</span>
				</div>

				{/* Форма оформления заказа */}
				<div className={styles.checkoutForm}>
					<div className={styles.formRow}>
						<label className={styles.formLabel}>Ваше имя</label>
						<input className={styles.formInput} placeholder="Иван" value={clientName} onChange={(e) => setClientName(e.target.value)} />
					</div>
					<div className={styles.formRow}>
						<label className={styles.formLabel}>Телефон</label>
						<PhoneInput value={clientPhoneRaw} onValueChange={(raw) => setClientPhoneRaw(raw)} inputClassName={styles.formInput} />
					</div>

					{error && <div className={styles.formError}>{error}</div>}
					{success && <div className={styles.formSuccess}>{success}</div>}
				</div>

				<div className={styles.summaryActions}>
					<button className={`button ${styles.buttonClear}`} onClick={clearCart} disabled={submitting}>
						Очистить корзину
					</button>
					<button
						className={`button ${styles.buttonOrder}`}
						disabled={submitting || !clientName.trim() || clientPhoneRaw.length < 10}
						onClick={async () => {
							setError(null);
							setSuccess(null);
							setSubmitting(true);
							try {
								const payload = {
									name: clientName.trim(),
									phone: clientPhoneRaw,
									orderItems: items.map((it) => ({
										product_sku: it.sku,
										product_title: it.title,
										product_price: it.price,
										product_brand: it.brand,
										product_image: it.image,
										quantity: it.quantity,
									})),
								};

								const res = await fetch("/api/orders/public", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify(payload),
								});
								const data = await res.json();
								if (!res.ok) {
									throw new Error(data?.error || "Не удалось оформить заказ");
								}
								setSuccess("Заявка отправлена! Мы свяжемся с вами по телефону.");
								clearCart();
							} catch (e: any) {
								setError(e.message || "Ошибка оформления заказа");
							} finally {
								setSubmitting(false);
							}
						}}
					>
						{submitting ? "Отправка..." : "Оформить заказ"}
					</button>
				</div>
			</div>
		</div>
	);
}
