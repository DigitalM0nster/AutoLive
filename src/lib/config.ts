// src\lib\config.ts
const CONFIG = {
	STORE_NAME: "AutoLive", // 🔥 Название магазина (можно менять)
	DOMAIN: "autolive.com", // 🌍 Домен (меняется для нового владельца)
	CITY: "Волгоград",
	BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000", // 🌐 Базовый URL для API
} as const; // 👈 добавляем 'as const', чтобы сохранить точные значения и типы

export default CONFIG;
