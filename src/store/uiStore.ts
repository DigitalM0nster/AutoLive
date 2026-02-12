import { create } from "zustand";
import { HomepageContentData } from "@/app/api/homepage-content/route";

type UiStore = {
	isActiveLoginPopup: boolean;
	isActiveRegisterPopup: boolean;
	isActiveOrderPopup: boolean;
	isLoading: boolean;
	homepageFormData: HomepageContentData | null;

	activateLoginPopup: () => void;
	deactivateLoginPopup: () => void;

	activateRegisterPopup: () => void;
	deactivateRegisterPopup: () => void;

	activateOrderPopup: () => void;
	deactivateOrderPopup: () => void;

	startLoading: () => void;
	stopLoading: () => void;

	headerHeight: number;
	setHeaderHeight: (height: number) => void;
};

export const useUiStore = create<UiStore>((set) => ({
	isActiveLoginPopup: false,
	isActiveRegisterPopup: false,
	isActiveOrderPopup: false,
	isLoading: true,
	homepageFormData: null,

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

	// ШАПКА
	headerHeight: 0,
	setHeaderHeight: (height: number) => set({ headerHeight: height }),
}));
