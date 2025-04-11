/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false, // ОТКЛЮЧАЕМ strict mode, чтобы не было ошибки findDOMNode
	api: {
		bodyParser: {
			sizeLimit: "50mb", // Увеличиваем лимит на размер файла
		},
	},
};

export default nextConfig;
