// src/app/admin/reset-password/page.tsx

"use client";

import { useState, ChangeEvent } from "react";
import Link from "next/link";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";

export default function AdminResetPasswordPage() {
	const [phone, setPhone] = useState("");
	const [error, setError] = useState("");
	const [resetMessage, setResetMessage] = useState("");
	const [loading, setLoading] = useState(false);

	// Обработчик изменения номера телефона: оставляем только цифры
	const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value.replace(/\D/g, "");
		setPhone(newValue);
		setError("");
	};

	// Обработчик сброса пароля
	const handlePasswordReset = async () => {
		// Простейшая проверка на корректность (ожидаем 10 цифр)
		if (phone.length < 10) {
			setError("Введите корректный номер телефона");
			return;
		}
		setLoading(true);
		try {
			const response = await fetch("/api/admin/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			const data = await response.json();

			if (!response.ok) {
				setError(data.error || "Ошибка сервера, попробуйте позже");
			} else {
				console.log(data);
				// Показываем новый пароль через toast
				if (data.newPassword) {
					showSuccessToast(`Новый пароль: ${data.newPassword}`);
				}
				setResetMessage(`Пароль успешно сброшен для номера: ${phone}`);
			}
		} catch (error) {
			setError("Ошибка сети, попробуйте позже");
		}
		setLoading(false);
	};

	return (
		<div className="flex flex-col items-center justify-center bg-gray-100">
			<div className="bg-white p-8 rounded shadow-md w-full max-w-md">
				<h2 className="text-xl font-bold text-center mb-4">Восстановление пароля для администратора</h2>
				<input
					type="tel"
					value={phone}
					onChange={handlePhoneChange}
					placeholder="Введите номер телефона"
					className="w-full border border-black/10 border-gray-300 rounded px-4 py-2 mb-2"
				/>
				{error && <p className="text-red-500 mb-2">{error}</p>}
				{resetMessage && <p className="text-green-500 mb-2">{resetMessage}</p>}
				<button onClick={handlePasswordReset} disabled={loading} className="w-full bg-blue-500 text-white rounded py-2">
					{loading ? "Отправка..." : "Восстановить пароль"}
				</button>
				<div className="mt-4 text-center">
					<Link href="/admin" className="text-blue-500 hover:underline">
						Вернуться на страницу входа
					</Link>
				</div>
			</div>
		</div>
	);
}
