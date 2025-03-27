// src\store\authStore.ts

import { create } from "zustand";

type Role = "superadmin" | "admin" | "manager" | "user"; // 👈 если знаешь другие роли — добавь
type User = {
	id: number;
	first_name: string;
	last_name: string;
	phone: string;
	role: Role;
};

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
			const response = await fetch("/api/user/get-user-data", {
				method: "GET",
				credentials: "include", // ⬅ важно!
			});
			const data = await response.json();

			if (response.ok) {
				set({ isLogined: true, user: data, role: data.role });
			} else {
				set({ isLogined: false, user: null, role: null });
			}
		} catch (error) {
			console.error("Ошибка авторизации:", error);
		}
	},

	login: async (phone, password) => {
		try {
			const response = await fetch("/api/user/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone, password }),
				credentials: "include", // ⬅ важно!
			});

			if (response.ok) {
				await useAuthStore.getState().initAuth();
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
		await fetch("/api/user/auth/logout", {
			method: "POST",
			credentials: "include",
		});
		set({ isLogined: false, user: null, role: null });
	},
}));
