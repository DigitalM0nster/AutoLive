// src\app\lib\db.ts
const CONFIG = {
	STORE_NAME: "AutoLive", // 🔥 Название магазина (можно менять)
	DOMAIN: "autolive.com", // 🌍 Домен (меняется для нового владельца)
	CITY: "Волгоград",
} as const; // 👈 добавляем 'as const', чтобы сохранить точные значения и типы

export default CONFIG;
