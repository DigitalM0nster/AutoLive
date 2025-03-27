// src/app/admin/ClientLoginForm.tsx
"use client";

import { useState } from "react";

export default function AdminLoginForm() {
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleLogin = async () => {
		const res = await fetch("/api/admin/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ phone, password }),
			credentials: "include",
		});

		const data = await res.json();

		if (!res.ok) {
			setError(data.error || "Ошибка авторизации");
		} else {
			window.location.href = "/admin/dashboard";
		}
	};

	return (
		<div>
			<h2>Вход в админку</h2>
			<input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
			<input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
			<button onClick={handleLogin}>Войти</button>
			{error && <p>{error}</p>}
		</div>
	);
}
