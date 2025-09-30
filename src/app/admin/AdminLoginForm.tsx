"use client";

import Link from "next/link";
import { useState } from "react";
import { showErrorToast } from "@/components/ui/toast/ToastProvider";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";

export default function AdminLoginForm() {
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	// Отдельные состояния для ошибок каждого поля
	const [phoneError, setPhoneError] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		// Сброс ошибок перед новой попыткой
		setPhoneError("");
		setPasswordError("");

		let hasError = false;
		if (phone.trim() === "") {
			setPhoneError("Введите телефон");
			showErrorToast("Введите телефон");
			hasError = true;
		}
		if (password.trim() === "") {
			setPasswordError("Введите пароль");
			showErrorToast("Введите пароль");
			hasError = true;
		}
		if (hasError) return;

		if (loading) return;
		setLoading(true);

		try {
			const res = await fetch("/api/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone, password }),
				credentials: "include",
			});

			const data = await res.json();
			setLoading(false);

			if (!res.ok) {
				// При ошибке можно анализировать message и, например,
				// если ошибка содержит "телефон" или "пароль", подсвечивать соответствующее поле
				if (data.error.toLowerCase().includes("телефон")) {
					setPhoneError(data.error);
				} else if (data.error.toLowerCase().includes("пароль")) {
					setPasswordError(data.error);
				}
				showErrorToast(data.error || "Ошибка авторизации");
			} else {
				// Очистка ошибок при успешном логине
				setPhoneError("");
				setPasswordError("");
				window.location.href = "/admin/dashboard";
			}
		} catch (error) {
			setLoading(false);
			showErrorToast("Ошибка сети, попробуйте позже");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleLogin();
		}
	};

	return (
		<div className="max-w-md mx-auto p-8 bg-white/80 rounded shadow-lg">
			<h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Вход в админ-панель</h2>

			<div className="space-y-4">
				<div>
					<PhoneInput
						value={phone}
						onValueChange={(rawValue: string, formattedValue: string) => setPhone(rawValue)}
						inputClassName={`w-full px-4 py-3 rounded-lg border border-black/10 transition 
              ${phoneError ? "border-red-500" : "border-gray-300"} 
              focus:outline-none focus:ring-2 focus:ring-blue-500`}
						onKeyDown={handleKeyDown}
					/>
					{phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
				</div>

				<div>
					<input
						type="password"
						placeholder="Пароль"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						onKeyDown={handleKeyDown}
						className={`w-full px-4 py-3 rounded-lg border border-black/10 transition 
              ${passwordError ? "border-red-500" : "border-gray-300"} 
              focus:outline-none focus:ring-2 focus:ring-blue-500`}
					/>
					{passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
				</div>

				<button
					onClick={handleLogin}
					disabled={loading}
					className={`w-full py-3 rounded-lg text-white font-semibold transition-all ${
						loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-md hover:shadow-lg"
					}`}
				>
					{loading ? "Вход..." : "Войти"}
				</button>
			</div>

			<div className="mt-4 text-center">
				<Link href="/admin/reset-password" className="text-blue-500 hover:underline">
					Забыли пароль?
				</Link>
			</div>
		</div>
	);
}
