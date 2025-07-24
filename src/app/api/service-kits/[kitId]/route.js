// src/app/api/service-kits/[kitId]/route.js

export async function GET(request, { params }) {
	const { kitId } = params;

	// Здесь должно быть обращение к базе данных
	// Пока используем моковые данные как в get-kits
	const kits = [
		{
			id: "1",
			name: "Комплект ТО для Hyundai",
			title: "Комплект ТО для Hyundai",
			image: "/images/huyndaiKitExample.jpg",
			description: "Фильтры, масло и кольцо масляной пробки для Kia Rio и Hyundai Solaris",
			price: 800,
			slug: "hyundai-kit",
			parts: [
				{
					name: "Масляный фильтр",
					analogs: ["Оригинал", "Mann", "Bosch", "Filtron"],
				},
				{
					name: "Воздушный фильтр",
					analogs: ["Оригинал", "Mann", "Bosch", "Filtron"],
				},
				{
					name: "Салонный фильтр",
					analogs: ["Оригинал", "Mann", "Bosch", "Filtron"],
				},
				{
					name: "Масло моторное 5W30",
					analogs: ["Оригинал", "Shell", "Castrol", "Mobil"],
				},
			],
		},
		{
			id: "2",
			name: "Комплект ТО для Toyota",
			title: "Комплект ТО для Toyota",
			image: "/images/toyotaKitExample.jpg",
			description: "Оригинальные запчасти для ТО Toyota Corolla и Camry",
			price: 1200,
			slug: "toyota-kit",
			parts: [
				{
					name: "Масляный фильтр Toyota",
					analogs: ["Оригинал", "Mann", "Bosch"],
				},
				{
					name: "Воздушный фильтр Toyota",
					analogs: ["Оригинал", "Mann", "Bosch"],
				},
				{
					name: "Салонный фильтр Toyota",
					analogs: ["Оригинал", "Mann", "Bosch"],
				},
				{
					name: "Масло моторное 0W20",
					analogs: ["Оригинал", "Shell", "Castrol"],
				},
			],
		},
		{
			id: "3",
			name: "Комплект ТО для BMW",
			title: "Комплект ТО для BMW",
			image: "/images/bmwKitExample.jpg",
			description: "Фильтры, масло и свечи зажигания для BMW 3, 5 серии",
			price: 1500,
			slug: "bmw-kit",
			parts: [
				{
					name: "Масляный фильтр BMW",
					analogs: ["Оригинал", "Mann", "Bosch", "Mahle"],
				},
				{
					name: "Воздушный фильтр BMW",
					analogs: ["Оригинал", "Mann", "Bosch", "Mahle"],
				},
				{
					name: "Салонный фильтр BMW",
					analogs: ["Оригинал", "Mann", "Bosch", "Mahle"],
				},
				{
					name: "Масло моторное 5W30 LL-01",
					analogs: ["Оригинал", "Castrol", "Mobil", "Liqui Moly"],
				},
				{
					name: "Свечи зажигания",
					analogs: ["Оригинал", "Bosch", "NGK", "Denso"],
				},
			],
		},
	];

	const kit = kits.find((kit) => kit.id === kitId);

	if (!kit) {
		return Response.json({ error: "Комплект не найден" }, { status: 404 });
	}

	return Response.json(kit);
}
