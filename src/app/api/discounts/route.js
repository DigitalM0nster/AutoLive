export async function GET() {
	const discounts = [
		{
			id: 1,
			title: "Подарочный комплект ТО",
			description: "Подарочный комплект ТО всем клиентам до 05.05.2024",
			image: "/images/discount1.jpg",
		},
		{
			id: 2,
			title: "Скидка 50% на комплект ТО",
			description: "Скидка 50% на ТО всем клиентам до 10.06.2024",
			image: "/images/discount2.jpg",
		},
		{
			id: 3,
			title: "Бесплатная диагностика",
			description: "Бесплатная диагностика авто при записи на ТО до 01.07.2024",
			image: "/images/discount3.jpg",
		},
	];

	return Response.json(discounts);
}
