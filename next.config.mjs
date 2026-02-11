/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false, // ОТКЛЮЧАЕМ strict mode, чтобы не было ошибки findDOMNode
	// Доступ по IP в локальной сети (например 192.168.0.110:3000) — без этого Next.js ругается на cross-origin и возможны проблемы с загрузкой
	allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.0.110"],
};

export default nextConfig;
