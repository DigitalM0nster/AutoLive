// src/app/admin/profile/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function AdminProfilePage() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [phone, setPhone] = useState("");
	const [avatar, setAvatar] = useState<string | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");

	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		const fetchData = async () => {
			const res = await fetch("/api/admin/get-admin-data");
			const data = await res.json();
			setFirstName(data.first_name || "");
			setLastName(data.last_name || "");
			setPhone(data.phone || "");
			setAvatar(data.avatar || null);
		};
		fetchData();
	}, []);

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setAvatarFile(file);
			const reader = new FileReader();
			reader.onload = () => {
				setAvatar(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");

		const formData = new FormData();
		formData.append("first_name", firstName);
		formData.append("last_name", lastName);
		formData.append("phone", phone);
		if (avatarFile) formData.append("avatar", avatarFile);
		if (currentPassword && newPassword) {
			formData.append("currentPassword", currentPassword);
			formData.append("newPassword", newPassword);
		}

		const res = await fetch("/api/admin/profile/update", {
			method: "POST",
			body: formData,
		});

		const data = await res.json();
		setLoading(false);
		if (res.ok) {
			setMessage("✅ Профиль обновлён");
			setCurrentPassword("");
			setNewPassword("");
		} else {
			setMessage(data.message || "❌ Ошибка при обновлении");
		}
	};

	return (
		<div className="max-w-2xl mx-auto mt-28 p-6 bg-white rounded-xl shadow border">
			<h1 className="text-2xl font-bold mb-6 text-center">Редактирование профиля</h1>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* AVATAR */}
				<div className="flex flex-col items-center">
					<div className="relative">
						<img
							src={avatar?.startsWith("data:") || avatar?.startsWith("http") ? avatar : "/images/user_placeholder.png"}
							alt="avatar"
							className="w-24 h-24 rounded-full object-cover border shadow"
						/>

						<label className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-700">
							Изменить
							<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
						</label>
					</div>
				</div>

				{/* ОСНОВНОЕ */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium mb-1">Имя</label>
						<input type="text" value={firstName} placeholder="Введите имя" onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded px-3 py-2" />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Фамилия</label>
						<input
							type="text"
							value={lastName}
							placeholder="Введите фамилию"
							onChange={(e) => setLastName(e.target.value)}
							className="w-full border rounded px-3 py-2"
						/>
					</div>
					<div className="sm:col-span-2">
						<label className="block text-sm font-medium mb-1">Телефон (логин)</label>
						<input type="text" value={phone} placeholder="9954091882" onChange={(e) => setPhone(e.target.value)} className="w-full border rounded px-3 py-2" />
					</div>
				</div>

				{/* ПАРОЛЬ */}
				<div className="pt-4 border-t">
					<h2 className="text-lg font-semibold mb-2">Смена пароля</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<input
							type="password"
							placeholder="Текущий пароль"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							className="w-full border rounded px-3 py-2"
						/>
						<input
							type="password"
							placeholder="Новый пароль"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full border rounded px-3 py-2"
						/>
					</div>
				</div>

				{/* КНОПКА */}
				<div className="text-center">
					<button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
						{loading ? "Сохраняем..." : "Сохранить изменения"}
					</button>
					{message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
				</div>
			</form>
		</div>
	);
}
