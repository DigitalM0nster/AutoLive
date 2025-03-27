// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Start seeding...");

	const hash = await bcrypt.hash("1234", 10);

	const [superadmin, admin, manager, client] = await Promise.all([
		prisma.user.create({
			data: {
				first_name: "Супер",
				last_name: "Админ",
				phone: "9954091882",
				password: hash,
				role: "superadmin",
				status: "verified",
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Обычный",
				last_name: "Админ",
				phone: "9954091883",
				password: hash,
				role: "admin",
				status: "verified",
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Менеджер",
				last_name: "Иван",
				phone: "9954091884",
				password: hash,
				role: "manager",
				status: "verified",
				adminId: 2,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Пользователь",
				last_name: "Илья",
				phone: "9954091885",
				password: hash,
				role: "client",
				status: "verified",
			},
		}),
	]);

	const categories = [
		{ title: "Масла", slug: "masla", image: "/images/maslo.svg" },
		{ title: "Жидкости", slug: "zhidkosti", image: "/images/water.svg" },
		{ title: "Фильтра", slug: "filtry", image: "/images/filters.svg" },
		{ title: "Прокладки", slug: "prokladki", image: "/images/prokladki.svg" },
		{ title: "Приводные ремни", slug: "remni", image: "/images/grm.svg" },
		{ title: "Тормозные колодки", slug: "kolodki", image: "/images/kolodki.svg" },
		{ title: "Тормозные диски", slug: "diski", image: "/images/diski.svg" },
		{ title: "Аксессуары", slug: "aksessuary", image: "/images/aksesuary.svg" },
	];

	for (const [index, cat] of categories.entries()) {
		const category = await prisma.category.create({
			data: {
				...cat,
				Filter: {
					create: {
						title: "Производитель",
						values: {
							create: [{ value: "Mobil" }, { value: "Castrol" }],
						},
					},
				},
			},
			include: {
				Filter: {
					include: { values: true },
				},
			},
		});

		for (let i = 1; i <= 3; i++) {
			await prisma.product.create({
				data: {
					title: `${category.title} Товар ${i}`,
					sku: `${category.slug.toUpperCase()}-00${i}`,
					price: 1000 + i * 100,
					categoryId: category.id,
					productFilterValues: {
						create: {
							filterValueId: category.Filter[0].values[i % 2].id,
						},
					},
				},
			});
		}
	}

	// Добавим аналоги (первый товар в каждой категории — аналог второго)
	const allProducts = await prisma.product.findMany();
	for (let i = 0; i < allProducts.length; i += 3) {
		const p1 = allProducts[i];
		const p2 = allProducts[i + 1];
		if (p1 && p2) {
			await prisma.productAnalog.create({
				data: {
					productId: p1.id,
					analogId: p2.id,
				},
			});
		}
	}

	console.log("✅ Seed complete.");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
