// src\store\authStore.ts

import { create } from "zustand";
import { User, Role } from "@/lib/types";

type AuthStore = {
	isLogined: boolean;
	token: string | null;
	user: User | null;
	role: Role | null;

	initAuth: () => Promise<void>;
	login: (phone: string, password: string) => Promise<void>;
	logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
	isLogined: false,
	token: null,
	user: null,
	role: null,

	initAuth: async () => {
		try {
			const response = await fetch("/api/user/session", {
				method: "GET",
				credentials: "include",
			});

			const data = await response.json();

			if (response.ok && data.authenticated && data.user) {
				set({
					isLogined: true,
					user: data.user,
					role: data.user.role,
				});
			} else {
				set({ isLogined: false, user: null, role: null });
			}
		} catch (error) {
			console.error("Ошибка при получении данных пользователя:", error);
			set({ isLogined: false, user: null, role: null });
		}
	},

	login: async (phone, password) => {
		try {
			const response = await fetch("/api/user/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone, password }),
				credentials: "include",
			});

			if (response.ok) {
				await useAuthStore.getState().initAuth();
				console.log(response);
			} else {
				const data = await response.json();
				throw new Error(data.code || "UNKNOWN_ERROR");
			}
		} catch (error: any) {
			console.error("Ошибка входа:", error.message);
			throw error;
		}
	},

	logout: async () => {
		await fetch("/api/admin/logout", {
			method: "POST",
			credentials: "include",
		}).catch(() => {});

		await fetch("/api/user/logout", {
			method: "POST",
			credentials: "include",
		}).catch(() => {});

		set({ isLogined: false, user: null, role: null });

		// ⬇️ повторная проверка куки после выхода
		await useAuthStore.getState().initAuth();
	},
}));
