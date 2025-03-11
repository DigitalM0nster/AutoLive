import { create } from "zustand";

export const useAuthStore = create((set) => ({
	isLogined: false,
	token: null,
	user: null,
	role: null,

	initAuth: async () => {
		const token = localStorage.getItem("token");
		if (!token) return;

		try {
			const response = await fetch("/api/user/get-user-data", {
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await response.json();

			if (response.ok) {
				set({ isLogined: true, token, user: data, role: data.role });
			} else {
				localStorage.removeItem("token");
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
			});
			const data = await response.json();

			if (response.ok) {
				localStorage.setItem("token", data.token);
				useAuthStore.getState().initAuth();
			} else {
				throw new Error(data.code || "UNKNOWN_ERROR");
			}
		} catch (error) {
			console.error("Ошибка входа:", error.message);
			throw error;
		}
	},

	logout: () => {
		localStorage.removeItem("token");
		set({ isLogined: false, token: null, user: null });
	},
}));
