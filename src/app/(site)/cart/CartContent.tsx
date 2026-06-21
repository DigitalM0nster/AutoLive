"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import PersonalDataConsent from "@/components/user/personalDataConsent/PersonalDataConsent";
import { formatPhoneDisplay } from "@/lib/phoneUtils";
import styles from "./styles.module.scss";

const MAX_QUANTITY = 99;

function formatPrice(value: number): string {
	return `${value.toLocaleString("ru-RU")} ₽`;
}

function normalizeBrand(brand?: string | null): string | null {
	const value = brand?.trim();
	if (!value || value.toLowerCase() === "unknown") return null;
	return value;
}

function digitsFromPhone(phone: string): string {
	return phone.replace(/\D/g, "");
}

function pluralPositions(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod100 >= 11 && mod100 <= 14) return "позиций";
	if (mod10 === 1) return "позиция";
	if (mod10 >= 2 && mod10 <= 4) return "позиции";
	return "позиций";
}

export default function CartContent() {
	const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();
	const { user, role, initAuth } = useAuthStore();

	const [clientName, setClientName] = useState("");
	const [clientPhoneRaw, setClientPhoneRaw] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [orderSuccess, setOrderSuccess] = useState<{ orderId: number; phone: string } | null>(null);
	const [personalDataConsent, setPersonalDataConsent] = useState(false);
	const [consentShowError, setConsentShowError] = useState(false);

	const totalPrice = getTotalPrice();
	const totalItems = items.reduce((total, item) => total + item.quantity, 0);

	useEffect(() => {
		void initAuth();
	}, [initAuth]);

	useEffect(() => {
		if (role !== "client" || !user) return;
		const parts = [user.first_name, user.last_name].filter(Boolean);
		if (parts.length) {
			setClientName((prev) => (prev.trim() === "" ? parts.join(" ") : prev));
		}
		const digits = digitsFromPhone(user.phone || "");
		if (digits.length >= 10) {
			setClientPhoneRaw((prev) => (prev.length < 10 ? digits : prev));
		}
	}, [role, user]);

	if (orderSuccess) {
		const contactPhone = formatPhoneDisplay(orderSuccess.phone);

		return (
			<div className={styles.stateCard}>
				<div className={styles.stateIcon} aria-hidden="true" />
				<h2 className={styles.stateTitle}>Заказ успешно оформлен</h2>
				<p className={styles.stateSuccess}>Номер заказа: {orderSuccess.orderId}</p>
				<p className={styles.stateText}>
					Для подтверждения заказа мы свяжемся с вами по телефону, который вы указали:{" "}
					<span className={styles.statePhone}>{contactPhone}</span>.
				</p>
				<Link href="/" className={styles.primaryButton}>
					На главную
				</Link>
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className={styles.stateCard}>
				<div className={`${styles.stateIcon} ${styles.empty}`} aria-hidden="true" />
				<h2 className={styles.stateTitle}>Корзина пуста</h2>
				<p className={styles.stateText}>Добавьте материалы из каталога — они появятся здесь для оформления заказа.</p>
				<div className={styles.stateActions}>
					<Link href="/categories" className={styles.primaryButton}>
						К каталогу
					</Link>
					<Link href="/" className={styles.secondaryButton}>
						На главную
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.cartLayout}>
			<section className={styles.itemsSection} aria-label="Товары в корзине">
				<div className={styles.itemsHeader}>
					<h2 className={styles.sectionTitle}>Состав заказа</h2>
					<span className={styles.itemsCount}>
						{totalItems} {pluralPositions(totalItems)}
					</span>
				</div>

				<div className={styles.cartItems}>
					{items.map((item) => {
						const brand = normalizeBrand(item.brand);

						return (
							<article key={item.id} className={styles.cartItem}>
								<Link href={`/products/${item.id}`} className={styles.itemMedia}>
									{item.image ?
										<img src={item.image} alt="" />
									:	<span className={styles.itemMediaPlaceholder} aria-hidden="true" />}
								</Link>

								<div className={styles.itemBody}>
									<Link href={`/products/${item.id}`} className={styles.itemTitle}>
										{item.title}
									</Link>

									<div className={styles.itemMeta}>
										{item.sku ? <span className={styles.skuChip}>{item.sku}</span> : null}
										{brand ? <span className={styles.brandChip}>{brand}</span> : null}
									</div>

									<span className={styles.unitPrice}>{formatPrice(item.price)} / шт.</span>
								</div>

								<div className={styles.itemActions}>
									<div className={styles.quantityControl}>
										<button
											type="button"
											className={styles.quantityButton}
											onClick={() => updateQuantity(item.id, item.quantity - 1)}
											disabled={item.quantity <= 1}
											aria-label="Уменьшить количество"
										>
											−
										</button>
										<span className={styles.quantityValue}>{item.quantity}</span>
										<button
											type="button"
											className={styles.quantityButton}
											onClick={() => updateQuantity(item.id, Math.min(MAX_QUANTITY, item.quantity + 1))}
											disabled={item.quantity >= MAX_QUANTITY}
											aria-label="Увеличить количество"
										>
											+
										</button>
									</div>

									<span className={styles.lineTotal}>{formatPrice(item.price * item.quantity)}</span>

									<button type="button" className={styles.removeButton} onClick={() => removeItem(item.id)}>
										Удалить
									</button>
								</div>
							</article>
						);
					})}
				</div>
			</section>

			<aside className={styles.checkoutPanel}>
				<div className={styles.summaryBlock}>
					<h2 className={styles.sectionTitle}>Итого</h2>

					<div className={styles.summaryRow}>
						<span>Товаров</span>
						<span>{totalItems}</span>
					</div>

					<div className={styles.summaryTotalRow}>
						<span className={styles.summaryTotalLabel}>К оплате</span>
						<span className={styles.summaryTotalValue}>{formatPrice(totalPrice)}</span>
					</div>
				</div>

				<div className={styles.checkoutForm}>
					<h3 className={styles.formTitle}>Контактные данные</h3>

					{role === "client" ?
						<p className={styles.formHint}>Вы вошли в аккаунт — заявка будет видна в разделе «Личный кабинет».</p>
					:	null}

					<div className={styles.formRow}>
						<label className={styles.formLabel} htmlFor="cart-client-name">
							Ваше имя
						</label>
						<input
							id="cart-client-name"
							className={styles.formInput}
							placeholder="Иван"
							value={clientName}
							onChange={(e) => setClientName(e.target.value)}
						/>
					</div>

					<div className={styles.formRow}>
						<label className={styles.formLabel} htmlFor="cart-client-phone">
							Телефон
						</label>
						<PhoneInput value={clientPhoneRaw} onValueChange={setClientPhoneRaw} inputClassName={styles.formInput} />
						<p className={styles.formHint}>Для подтверждения заказа позвоним на этот номер.</p>
					</div>

					<PersonalDataConsent
						id="cart-pd-consent"
						wrapperClassName={styles.consentBlock}
						checked={personalDataConsent}
						onChange={(value) => {
							setPersonalDataConsent(value);
							if (value) setConsentShowError(false);
						}}
						showError={consentShowError}
					/>

					{error ? <div className={styles.formError}>{error}</div> : null}
				</div>

				<div className={styles.checkoutActions}>
					<button
						type="button"
						className={styles.orderButton}
						disabled={submitting || !clientName.trim() || clientPhoneRaw.length < 10 || !personalDataConsent}
						onClick={async () => {
							setError(null);
							if (!personalDataConsent) {
								setConsentShowError(true);
								setError("Нужно согласие на обработку персональных данных.");
								return;
							}
							setConsentShowError(false);
							setSubmitting(true);
							try {
								const payload = {
									name: clientName.trim(),
									phone: clientPhoneRaw,
									personal_data_consent: true as const,
									orderItems: items.map((item) => ({
										product_sku: item.sku,
										product_title: item.title,
										product_price: item.price,
										product_brand: item.brand,
										product_image: item.image,
										quantity: item.quantity,
									})),
								};

								const res = await fetch("/api/orders/public", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									credentials: "include",
									body: JSON.stringify(payload),
								});
								const data = await res.json();
								if (!res.ok) {
									throw new Error(data?.error || "Не удалось оформить заказ");
								}
								clearCart();
								setOrderSuccess({ orderId: data.orderId, phone: clientPhoneRaw });
								window.scrollTo({ top: 0, behavior: "smooth" });
							} catch (submitError: unknown) {
								const message = submitError instanceof Error ? submitError.message : "Ошибка оформления заказа";
								setError(message);
							} finally {
								setSubmitting(false);
							}
						}}
					>
						{submitting ? "Отправка…" : "Оформить заказ"}
					</button>

					<button type="button" className={styles.clearButton} onClick={clearCart} disabled={submitting}>
						Очистить корзину
					</button>
				</div>
			</aside>
		</div>
	);
}
