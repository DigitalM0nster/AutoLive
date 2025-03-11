import { create } from "zustand";

export const useUiStore = create((set) => ({
	isActiveLoginPopup: false,
	isActiveRegisterPopup: false,
	isActiveOrderPopup: false,
	isLoading: true,

	// ПОПАП ЛОГИНА
	activateLoginPopup: () => set({ isActiveLoginPopup: true }),
	deactivateLoginPopup: () => set({ isActiveLoginPopup: false }),

	// ПОПАП Регистрации
	activateRegisterPopup: () => set({ isActiveRegisterPopup: true }),
	deactivateRegisterPopup: () => set({ isActiveRegisterPopup: false }),

	// ПОПАП ЗАЯКИ
	activateOrderPopup: () => set({ isActiveOrderPopup: true }),
	deactivateOrderPopup: () => set({ isActiveOrderPopup: false }),

	// Загрузка
	startLoading: () => set({ isLoading: true }),
	stopLoading: () => set({ isLoading: false }),
}));
