import { create } from "zustand";

type UiStore = {
	isActiveLoginPopup: boolean;
	isActiveRegisterPopup: boolean;
	isActiveOrderPopup: boolean;
	isLoading: boolean;

	activateLoginPopup: () => void;
	deactivateLoginPopup: () => void;

	activateRegisterPopup: () => void;
	deactivateRegisterPopup: () => void;

	activateOrderPopup: () => void;
	deactivateOrderPopup: () => void;

	startLoading: () => void;
	stopLoading: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
	isActiveLoginPopup: false,
	isActiveRegisterPopup: false,
	isActiveOrderPopup: false,
	isLoading: true,

	// ПОПАП ЛОГИНА
	activateLoginPopup: () => set({ isActiveLoginPopup: true }),
	deactivateLoginPopup: () => set({ isActiveLoginPopup: false }),

	// ПОПАП РЕГИСТРАЦИИ
	activateRegisterPopup: () => set({ isActiveRegisterPopup: true }),
	deactivateRegisterPopup: () => set({ isActiveRegisterPopup: false }),

	// ПОПАП ЗАКАЗА
	activateOrderPopup: () => set({ isActiveOrderPopup: true }),
	deactivateOrderPopup: () => set({ isActiveOrderPopup: false }),

	// ЗАГРУЗКА
	startLoading: () => set({ isLoading: true }),
	stopLoading: () => set({ isLoading: false }),
}));
