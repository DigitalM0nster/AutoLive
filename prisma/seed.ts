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

		const skuPrefix = category.title.replace(/\s/g, "").toUpperCase();
		for (let i = 1; i <= 3; i++) {
			await prisma.product.create({
				data: {
					title: `${category.title} Товар ${i}`,
					sku: `${skuPrefix}-00${i}`,
					price: 1000 + i * 100,
					categoryId: category.id,
					departmentId: department1.id,
					productFilterValues: {
						create: {
							filterValueId: category.Filter[0].values[i % 2].id,
						},
					},
				},
			});
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
