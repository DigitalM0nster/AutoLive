export async function GET() {
	const kits = [
		{
			id: 1,
			name: "Комплект ТО для Hyundai",
			image: "/images/huyndaiKitExample.jpg",
			description: "Фильтры, масло и кольцо масляной пробки для Kia Rio и Hyundai Solaris",
			price: 800,
			slug: "hyundai-kit",
		},
		{
			id: 2,
			name: "Комплект ТО для Toyota",
			image: "/images/toyotaKitExample.jpg",
			description: "Оригинальные запчасти для ТО Toyota Corolla и Camry",
			price: 1200,
			slug: "toyota-kit",
		},
		{
			id: 3,
			name: "Комплект ТО для BMW",
			image: "/images/bmwKitExample.jpg",
			description: "Фильтры, масло и свечи зажигания для BMW 3, 5 серии",
			price: 1500,
			slug: "bmw-kit",
		},
	];

	return Response.json(kits);
}
