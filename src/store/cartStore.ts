// src/store/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Тип товара в корзине
interface CartItem {
	id: number; // ID товара
	title: string; // Название товара
	sku: string; // Артикул
	price: number; // Цена
	brand: string; // Бренд
	image: string | null; // Изображение
	quantity: number; // Количество
}

// Интерфейс хранилища корзины
interface CartStore {
	items: CartItem[]; // Массив товаров в корзине
	addItem: (item: CartItem) => void; // Функция добавления товара
	removeItem: (id: number) => void; // Функция удаления товара
	updateQuantity: (id: number, quantity: number) => void; // Функция обновления количества
	clearCart: () => void; // Функция очистки корзины
	getTotalItems: () => number; // Функция получения общего количества товаров
	getTotalPrice: () => number; // Функция получения общей стоимости
}

// Создаем хранилище корзины с сохранением в localStorage
export const useCartStore = create<CartStore>()(
	persist(
		(set, get) => ({
			// Начальное состояние - пустая корзина
			items: [],

			// Добавление товара в корзину
			addItem: (item) => {
				const currentItems = get().items;
				const existingItem = currentItems.find((i) => i.id === item.id);

				if (existingItem) {
					// Если товар уже есть в корзине, увеличиваем количество
					set({
						items: currentItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)),
					});
				} else {
					// Если товара нет в корзине, добавляем его
					set({ items: [...currentItems, item] });
				}
			},

			// Удаление товара из корзины
			removeItem: (id) => {
				set({ items: get().items.filter((item) => item.id !== id) });
			},

			// Обновление количества товара
			updateQuantity: (id, quantity) => {
				if (quantity <= 0) {
					// Если количество <= 0, удаляем товар
					get().removeItem(id);
				} else {
					set({
						items: get().items.map((item) => (item.id === id ? { ...item, quantity } : item)),
					});
				}
			},

			// Очистка корзины
			clearCart: () => {
				set({ items: [] });
			},

			// Получение общего количества товаров (сумма всех quantity)
			getTotalItems: () => {
				return get().items.reduce((total, item) => total + item.quantity, 0);
			},

			// Получение общей стоимости корзины
			getTotalPrice: () => {
				return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
			},
		}),
		{
			// Настройки persist для сохранения в localStorage
			name: "cart-storage", // Ключ в localStorage
		}
	)
);
