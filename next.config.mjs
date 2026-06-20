/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false, // ОТКЛЮЧАЕМ strict mode, чтобы не было ошибки findDOMNode
	// Доступ по IP в локальной сети (например 192.168.0.110:3000) — без этого Next.js ругается на cross-origin и возможны проблемы с загрузкой
	allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.0.110"],
	async redirects() {
		return [
			{ source: "/catalog", destination: "/products", permanent: true },
			// Next.js 16 резервирует сегмент /auth — старые URL API для совместимости
			{ source: "/api/user/auth/login", destination: "/api/user/login", permanent: false },
			{ source: "/api/user/auth/logout", destination: "/api/user/logout", permanent: false },
			{ source: "/api/user/auth/reset-password", destination: "/api/user/reset-password", permanent: false },
			{ source: "/api/user/auth/register/:path*", destination: "/api/user/register/:path*", permanent: false },
			{ source: "/api/user/auth/register", destination: "/api/user/register", permanent: false },
			{ source: "/api/admin/auth/:path*", destination: "/api/admin/:path*", permanent: false },
		];
	},
};

export default nextConfig;
