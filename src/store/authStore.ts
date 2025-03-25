import { create } from "zustand";

type Role = "manager" | "admin" | "superadmin"; // 👈 если знаешь другие роли — добавь
type User = {
	id: number;
	name: string;
	phone: string;
	role: Role;
	// добавь сюда другие поля, если знаешь
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
		} catch (error: any) {
			console.error("Ошибка входа:", error.message);
			throw error;
		}
	},

	logout: () => {
		localStorage.removeItem("token");
		set({ isLogined: false, token: null, user: null, role: null });
	},
}));
