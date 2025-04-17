// prisma/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Start seeding...");

	// Создаём отделы
	const [department1, department2, department3] = await Promise.all([
		prisma.department.create({ data: { name: "Отдел №1" } }),
		prisma.department.create({ data: { name: "Отдел №2" } }),
		prisma.department.create({ data: { name: "Отдел №3" } }),
	]);

	const hash = await bcrypt.hash("1234", 10);

	// Создаём пользователей
	const [superadmin, admin1, admin2, admin3, manager1, manager2, manager3, client] = await Promise.all([
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
				first_name: "Админ",
				last_name: "1",
				phone: "9954091883",
				password: hash,
				role: "admin",
				status: "verified",
				departmentId: department1.id,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Админ",
				last_name: "2",
				phone: "9954091886",
				password: hash,
				role: "admin",
				status: "verified",
				departmentId: department2.id,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Админ",
				last_name: "3",
				phone: "9954091887",
				password: hash,
				role: "admin",
				status: "verified",
				departmentId: department3.id,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Менеджер",
				last_name: "1",
				phone: "9954091884",
				password: hash,
				role: "manager",
				status: "verified",
				departmentId: department1.id,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Менеджер",
				last_name: "2",
				phone: "9954091888",
				password: hash,
				role: "manager",
				status: "verified",
				departmentId: department2.id,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Менеджер",
				last_name: "3",
				phone: "9954091889",
				password: hash,
				role: "manager",
				status: "verified",
				departmentId: department3.id,
			},
		}),
		prisma.user.create({
			data: {
				first_name: "Пользователь",
				last_name: "Илья",
				phone: "9954091890",
				password: hash,
				role: "client",
				status: "verified",
			},
		}),
	]);

	// Категории
	const categories = [
		{ title: "Масла", image: "/images/maslo.svg" },
		{ title: "Жидкости", image: "/images/water.svg" },
		{ title: "Фильтра", image: "/images/filters.svg" },
		{ title: "Прокладки", image: "/images/prokladki.svg" },
		{ title: "Приводные ремни", image: "/images/grm.svg" },
		{ title: "Тормозные колодки", image: "/images/kolodki.svg" },
		{ title: "Тормозные диски", image: "/images/diski.svg" },
		{ title: "Аксессуары", image: "/images/aksesuary.svg" },
	];

	const createdCategories: any[] = [];

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

		createdCategories.push(category);
	}

	// Назначаем категории отделам
	await prisma.departmentCategory.createMany({
		data: [
			{ departmentId: department1.id, categoryId: createdCategories[0].id },
			{ departmentId: department1.id, categoryId: createdCategories[1].id },
			{ departmentId: department2.id, categoryId: createdCategories[2].id },
			{ departmentId: department2.id, categoryId: createdCategories[3].id },
			{ departmentId: department3.id, categoryId: createdCategories[4].id },
			{ departmentId: department3.id, categoryId: createdCategories[5].id },
		],
	});

	// Мапа для проверки доступности категории в отделе
	const allowedMap: Record<number, Set<number>> = {
		[department1.id]: new Set([createdCategories[0].id, createdCategories[1].id]),
		[department2.id]: new Set([createdCategories[2].id, createdCategories[3].id]),
		[department3.id]: new Set([createdCategories[4].id, createdCategories[5].id]),
	};

	// Создание товаров по каждой категории в каждом отделе
	for (const department of [department1, department2, department3]) {
		for (const [i, category] of createdCategories.entries()) {
			const skuPrefix = category.title.replace(/\s/g, "").toUpperCase();
			const isAllowed = allowedMap[department.id]?.has(category.id);

			for (let j = 1; j <= 3; j++) {
				await prisma.product.create({
					data: {
						title: `${category.title} Товар ${j}`,
						sku: `${skuPrefix}-00${j}`,
						price: 1000 + j * 100,
						categoryId: isAllowed ? category.id : null,
						departmentId: department.id,
						productFilterValues: isAllowed
							? {
									create: {
										filterValueId: category.Filter[0].values[j % 2].id,
									},
							  }
							: undefined,
					},
				});
			}
		}
	}

	// Добавим аналоги
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

	// 🌟 Начальные акции для superadmin
	const initialPromotions = [
		{
			title: "Весенняя распродажа",
			description: "Скидки до 20% на все масла",
			image: "/images/promotions/spring-sale.png",
			buttonText: "Узнать больше",
			buttonLink: "/promotions/spring-sale",
			order: 1,
		},
		{
			title: "Летняя акция",
			description: "Специальные цены на жидкости",
			image: "/images/promotions/summer-sale.png",
			buttonText: "Подробнее",
			buttonLink: "/promotions/summer-sale",
			order: 2,
		},
	];

	for (const promo of initialPromotions) {
		await prisma.promotion.create({ data: promo });
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
