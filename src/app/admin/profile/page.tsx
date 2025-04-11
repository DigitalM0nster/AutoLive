// src\app\admin\profile\page.tsx

"use client";

import { useEffect, useState } from "react";
import ProfileSkeleton from "./local_components/ProfileSkeleton";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast/toastService";
import { CameraIcon, XIcon } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function AdminProfilePage() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [phone, setPhone] = useState("");
	const [avatar, setAvatar] = useState<string | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");

	const [isProfileLoaded, setIsProfileLoaded] = useState(false); // 🆕 флаг: данные реально пришли
	const [isFormSubmitting, setIsFormSubmitting] = useState(false); // 🟦 отправка формы
	const [isDataLoading, setIsDataLoading] = useState(true); // 🟨 первичная загрузка данных
	const [message, setMessage] = useState("");

	const [errors, setErrors] = useState<{ currentPassword?: boolean; newPassword?: boolean }>({});

	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch("/api/admin/get-admin-data");
				if (res.ok) {
					const data = await res.json();
					console.log("Данные админа:", data);
					setFirstName(data.first_name || "");
					setLastName(data.last_name || "");
					setPhone(data.phone || "");
					setAvatar(data.avatar || null);
					setIsProfileLoaded(true);
				}
			} catch (error) {
				console.error("Ошибка при загрузке данных профиля:", error);
				setMessage("Ошибка при загрузке данных профиля.");
				setIsProfileLoaded(false);
			} finally {
				setIsDataLoading(false); // ⬅️ убираем загрузку
			}
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
		setIsFormSubmitting(true);
		setErrors({}); // сброс ошибок

		// валидация пароля
		if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
			setErrors({
				currentPassword: !currentPassword,
				newPassword: !newPassword,
			});
			showErrorToast("Укажите и текущий, и новый пароль");
			setIsFormSubmitting(false);
			return;
		}

		if (newPassword && newPassword.length < 4) {
			setErrors({ newPassword: true });
			showErrorToast("Новый пароль слишком короткий (мин. 4 символа)");
			setIsFormSubmitting(false);
			return;
		}

		const formData = new FormData();
		formData.append("first_name", firstName);
		formData.append("last_name", lastName);
		formData.append("phone", phone);
		if (avatarFile) {
			formData.append("avatar", avatarFile);
		} else if (avatar === null) {
			formData.append("removeAvatar", "true");
		}
		if (currentPassword && newPassword) {
			formData.append("currentPassword", currentPassword);
			formData.append("newPassword", newPassword);
		}

		try {
			const res = await fetch("/api/admin/profile/update", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();

			if (res.ok) {
				showSuccessToast("Профиль обновлён");
				setCurrentPassword("");
				setNewPassword("");

				// обновим user в store
				await useAuthStore.getState().initAuth();
			} else {
				// если ошибка в текущем пароле
				if (data.message === "Текущий пароль неверен") {
					setErrors({ currentPassword: true });
				}
				showErrorToast(data.message || "Ошибка при обновлении");
			}
		} catch (error) {
			console.error("Ошибка при обновлении профиля:", error);
			showErrorToast("Ошибка при обновлении профиля.");
		} finally {
			setIsFormSubmitting(false);
		}
	};

	// ЗАГЛУШКА ВО ВРЕМЯ ЗАГРУЗКИ
	if (isDataLoading) {
		return <ProfileSkeleton />;
	}

	// ЕСЛИ ДАННЫЕ НЕ ПРИШЛИ
	if (!isProfileLoaded) {
		return (
			<div className="max-w-xl mx-auto mt-28 p-6 bg-white border border-black/10 rounded-xl shadow text-center text-red-700">
				<h2 className="text-xl font-semibold mb-2">Ошибка</h2>
				<p>Не удалось загрузить данные профиля. Пожалуйста, попробуйте позже.</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto mt-28 p-6 bg-white rounded-xl shadow border">
			<h1 className="text-2xl font-bold mb-6 text-center">Редактирование профиля</h1>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* AVATAR */}
				<div className="flex justify-center">
					<div className="relative group w-36 h-36 sm:w-40 sm:h-40">
						{/* Фото */}
						<img
							src={avatar || "/images/user_placeholder.png"}
							alt="avatar"
							className="w-full h-full rounded-full object-cover border-4 border-white shadow-md transition duration-300 group-hover:brightness-90"
						/>

						{/* Затемнение + иконка камеры */}
						<label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition cursor-pointer pointer-events-auto">
							<CameraIcon className="w-6 h-6 text-white" />
							<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
						</label>

						{/* Кнопка удаления */}
						<button
							type="button"
							onClick={() => {
								setAvatar(null);
								setAvatarFile(null);
							}}
							className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition pointer-events-auto"
							title="Удалить фото"
						>
							<XIcon className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* ОСНОВНОЕ */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium mb-1">Имя</label>
						<input
							type="text"
							value={firstName}
							placeholder="Введите имя"
							onChange={(e) => setFirstName(e.target.value)}
							className="w-full border border-black/10 rounded px-3 py-2"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Фамилия</label>
						<input
							type="text"
							value={lastName}
							placeholder="Введите фамилию"
							onChange={(e) => setLastName(e.target.value)}
							className="w-full border border-black/10 rounded px-3 py-2"
						/>
					</div>
					<div className="sm:col-span-2">
						<label className="block text-sm font-medium mb-1">Телефон (логин)</label>
						<input
							type="text"
							value={phone}
							placeholder="Введите номер телефона"
							onChange={(e) => setPhone(e.target.value)}
							className="w-full border border-black/10 rounded px-3 py-2"
						/>
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
							onChange={(e) => {
								setCurrentPassword(e.target.value);
								if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: false }));
							}}
							className={`w-full border border-black/10 rounded px-3 py-2 ${errors.currentPassword ? "border-red-500 text-red-700 placeholder-red-400" : ""}`}
						/>
						<input
							type="password"
							placeholder="Новый пароль"
							value={newPassword}
							onChange={(e) => {
								setNewPassword(e.target.value);
								if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: false }));
							}}
							className={`w-full border border-black/10 rounded px-3 py-2 ${errors.newPassword ? "border-red-500 text-red-700 placeholder-red-400" : ""}`}
						/>
					</div>
				</div>

				{/* КНОПКА */}
				<div className="text-center">
					<button type="submit" disabled={isFormSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
						{isFormSubmitting ? "Сохраняем..." : "Сохранить изменения"}
					</button>
					{message && (
						<p className={`mt-3 text-sm px-4 py-2 rounded ${message.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{message}</p>
					)}
				</div>
			</form>
		</div>
	);
}
