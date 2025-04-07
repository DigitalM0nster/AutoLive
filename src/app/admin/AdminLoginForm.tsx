"use client";

import { useState } from "react";

export default function AdminLoginForm() {
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		if (loading) return;
		setLoading(true);
		const res = await fetch("/api/admin/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ phone, password }),
			credentials: "include",
		});

		const data = await res.json();
		setLoading(false);

		if (!res.ok) {
			setError(data.error || "Ошибка авторизации");
		} else {
			window.location.href = "/admin/dashboard";
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleLogin();
		}
	};

	return (
		<div className="max-w-md mx-auto mt-20 p-8 bg-white/80 backdrop-blur rounded-2xl shadow-lg border">
			<h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Вход в админку</h2>

			<div className="space-y-4">
				<input
					type="text"
					placeholder="Телефон"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					onKeyDown={handleKeyDown}
					className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
				/>

				<input
					type="password"
					placeholder="Пароль"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={handleKeyDown}
					className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
				/>

				<button
					onClick={handleLogin}
					disabled={loading}
					className={`w-full py-3 rounded-lg text-white font-semibold transition-all ${
						loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-md hover:shadow-lg"
					}`}
				>
					{loading ? "Вход..." : "Войти"}
				</button>

				{error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
			</div>
		</div>
	);
}
