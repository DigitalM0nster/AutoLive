// src/drizzle/schema.ts
import { mysqlTable, varchar, int, timestamp, text, float, boolean, json, mysqlEnum, primaryKey, unique } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ------------------------------
// 🔐 Пользователи и роли
// ------------------------------
export const users = mysqlTable("user", {
	id: int("id").primaryKey().autoincrement(),
	phone: varchar("phone", { length: 255 }).notNull().unique(),
	password: varchar("password", { length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	middleName: varchar("middle_name", { length: 255 }),
	role: mysqlEnum("role", ["superadmin", "admin", "manager", "client"]).notNull(),
	status: mysqlEnum("status", ["unverified", "verified"]).default("unverified").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	departmentId: int("department_id"),
});

// Определение отношений для пользователей
export const usersRelations = relations(users, ({ many, one }) => ({
	managerOrders: many(orders, { relationName: "ManagerOrders" }),
	clientOrders: many(orders, { relationName: "ClientOrders" }),
	department: one(departments, {
		fields: [users.departmentId],
		references: [departments.id],
		relationName: "DepartmentUsers",
	}),
	importLogs: many(importLogs),
	productLogs: many(productLogs),
	bulkActionLogs: many(bulkActionLogs),
	adminUserLogs: many(userLogs, { relationName: "AdminUserLogs" }),
	targetUserLogs: many(userLogs, { relationName: "TargetUserLogs" }),
}));

// ------------------------------
// СМС SMS
// ------------------------------
export const smsCodes = mysqlTable("sms_code", {
	id: int("id").primaryKey().autoincrement(),
	phone: varchar("phone", { length: 255 }).notNull(),
	code: varchar("code", { length: 10 }).notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	used: boolean("used").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ------------------------------
// 📦 Категории и товары
// ------------------------------
export const categories = mysqlTable("category", {
	id: int("id").primaryKey().autoincrement(),
	title: varchar("title", { length: 255 }).notNull().unique(),
	image: varchar("image", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	order: int("order").default(0).notNull(),
});

// Определение отношений для категорий
export const categoriesRelations = relations(categories, ({ many }) => ({
	products: many(products),
	filters: many(filters),
	markupRules: many(markupRules),
	allowedDepartments: many(departmentCategories),
}));

export const products = mysqlTable("product", {
	id: int("id").primaryKey().autoincrement(),
	title: varchar("title", { length: 255 }).notNull(),
	sku: varchar("sku", { length: 255 }).notNull(),
	brand: varchar("brand", { length: 255 }).default("UNKNOWN").notNull(),
	price: float("price").notNull(),
	supplierPrice: float("supplier_price"),
	description: text("description"),
	image: varchar("image", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
	categoryId: int("category_id"),
	departmentId: int("department_id").notNull(),
});

// Определение отношений для товаров
export const productsRelations = relations(products, ({ many, one }) => ({
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id],
	}),
	department: one(departments, {
		fields: [products.departmentId],
		references: [departments.id],
	}),
	productFilterValues: many(productFilterValues),
	analogsFrom: many(productAnalogs, { relationName: "ProductToAnalog" }),
	analogsTo: many(productAnalogs, { relationName: "AnalogToProduct" }),
	serviceKitItems: many(serviceKitItems, { relationName: "KitItemProduct" }),
	analogInKits: many(serviceKitItems, { relationName: "KitItemAnalog" }),
	logs: many(productLogs),
}));

// ------------------------------
// 🧩 Фильтры
// ------------------------------
export const filters = mysqlTable("filter", {
	id: int("id").primaryKey().autoincrement(),
	title: varchar("title", { length: 255 }).notNull(),
	type: mysqlEnum("type", ["select", "multi", "range", "boolean"]).default("select").notNull(),
	categoryId: int("category_id").notNull(),
});

// Определение отношений для фильтров
export const filtersRelations = relations(filters, ({ one, many }) => ({
	category: one(categories, {
		fields: [filters.categoryId],
		references: [categories.id],
	}),
	values: many(filterValues),
}));

export const filterValues = mysqlTable("filter_value", {
	id: int("id").primaryKey().autoincrement(),
	value: varchar("value", { length: 255 }).notNull(),
	filterId: int("filter_id").notNull(),
});

// Определение отношений для значений фильтров
export const filterValuesRelations = relations(filterValues, ({ one, many }) => ({
	filter: one(filters, {
		fields: [filterValues.filterId],
		references: [filters.id],
	}),
	productFilterValues: many(productFilterValues),
}));

export const productFilterValues = mysqlTable(
	"product_filter_value",
	{
		id: int("id").primaryKey().autoincrement(),
		productId: int("product_id").notNull(),
		filterValueId: int("filter_value_id").notNull(),
	},
	(table) => ({
		unq: unique().on(table.productId, table.filterValueId),
	})
);

// Определение отношений для связи товаров и значений фильтров
export const productFilterValuesRelations = relations(productFilterValues, ({ one }) => ({
	product: one(products, {
		fields: [productFilterValues.productId],
		references: [products.id],
	}),
	filterValue: one(filterValues, {
		fields: [productFilterValues.filterValueId],
		references: [filterValues.id],
	}),
}));

// ------------------------------
// 🔄 Аналоги
// ------------------------------
export const productAnalogs = mysqlTable(
	"product_analog",
	{
		id: int("id").primaryKey().autoincrement(),
		productId: int("product_id").notNull(),
		analogId: int("analog_id").notNull(),
	},
	(table) => ({
		unq: unique().on(table.productId, table.analogId),
	})
);

// Определение отношений для аналогов товаров
export const productAnalogsRelations = relations(productAnalogs, ({ one }) => ({
	product: one(products, {
		fields: [productAnalogs.productId],
		references: [products.id],
		relationName: "ProductToAnalog",
	}),
	analog: one(products, {
		fields: [productAnalogs.analogId],
		references: [products.id],
		relationName: "AnalogToProduct",
	}),
}));

// ------------------------------
// 🛠 Комплекты ТО
// ------------------------------
export const serviceKits = mysqlTable("service_kit", {
	id: int("id").primaryKey().autoincrement(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	image: varchar("image", { length: 255 }),
	price: float("price").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Определение отношений для комплектов ТО
export const serviceKitsRelations = relations(serviceKits, ({ many }) => ({
	kitItems: many(serviceKitItems),
}));

export const serviceKitItems = mysqlTable("service_kit_item", {
	id: int("id").primaryKey().autoincrement(),
	kitId: int("kit_id").notNull(),
	productId: int("product_id").notNull(),
	analogProductId: int("analog_product_id"),
});

// Определение отношений для элементов комплектов ТО
export const serviceKitItemsRelations = relations(serviceKitItems, ({ one }) => ({
	kit: one(serviceKits, {
		fields: [serviceKitItems.kitId],
		references: [serviceKits.id],
	}),
	product: one(products, {
		fields: [serviceKitItems.productId],
		references: [products.id],
		relationName: "KitItemProduct",
	}),
	analogProduct: one(products, {
		fields: [serviceKitItems.analogProductId],
		references: [products.id],
		relationName: "KitItemAnalog",
	}),
}));

// ------------------------------
// 📑 Заказы
// ------------------------------
export const orders = mysqlTable("order", {
	id: int("id").primaryKey().autoincrement(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	status: mysqlEnum("status", ["pending", "confirmed", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	managerId: int("manager_id").notNull(),
	departmentId: int("department_id"),
	clientId: int("client_id").notNull(),
});

// Определение отношений для заказов
export const ordersRelations = relations(orders, ({ one, many }) => ({
	manager: one(users, {
		fields: [orders.managerId],
		references: [users.id],
		relationName: "ManagerOrders",
	}),
	client: one(users, {
		fields: [orders.clientId],
		references: [users.id],
		relationName: "ClientOrders",
	}),
	department: one(departments, {
		fields: [orders.departmentId],
		references: [departments.id],
	}),
	orderItems: many(orderItems),
}));

export const orderItems = mysqlTable("order_item", {
	id: int("id").primaryKey().autoincrement(),
	orderId: int("order_id").notNull(),
	sku: varchar("product_sku", { length: 255 }).notNull(),
	title: varchar("product_title", { length: 255 }).notNull(),
	price: float("product_price").notNull(),
	brand: varchar("product_brand", { length: 255 }).notNull(),
	image: varchar("product_image", { length: 255 }),
	quantity: int("quantity").default(1).notNull(),
});

// Определение отношений для элементов заказа
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id],
	}),
}));

// ------------------------------
// 🎁 Акции
// ------------------------------
export const promotions = mysqlTable("promotion", {
	id: int("id").primaryKey().autoincrement(),
	image: varchar("image", { length: 255 }).notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	buttonText: varchar("button_text", { length: 255 }),
	buttonLink: varchar("button_link", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	order: int("order").default(0).notNull(),
});

// ------------------------------
// БАЗА
// ------------------------------
export const suppliers = mysqlTable("supplier", {
	id: int("id").primaryKey().autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Определение отношений для поставщиков
export const suppliersRelations = relations(suppliers, ({ many }) => ({
	formats: many(priceFormats),
}));

export const priceFormats = mysqlTable("price_format", {
	id: int("id").primaryKey().autoincrement(),
	supplierId: int("supplier_id").notNull(),
	columns: json("columns").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Определение отношений для форматов цен
export const priceFormatsRelations = relations(priceFormats, ({ one }) => ({
	supplier: one(suppliers, {
		fields: [priceFormats.supplierId],
		references: [suppliers.id],
	}),
}));

// ------------------------------
// 🏢 Отделы
// ------------------------------
export const departments = mysqlTable("department", {
	id: int("id").primaryKey().autoincrement(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Определение отношений для отделов
export const departmentsRelations = relations(departments, ({ many }) => ({
	users: many(users, { relationName: "DepartmentUsers" }),
	products: many(products),
	orders: many(orders),
	markupRules: many(markupRules),
	allowedCategories: many(departmentCategories),
	productLogs: many(productLogs),
	bulkActionLogs: many(bulkActionLogs),
	importLogs: many(importLogs),
	userLogs: many(userLogs),
}));

export const departmentCategories = mysqlTable(
	"department_category",
	{
		id: int("id").primaryKey().autoincrement(),
		departmentId: int("department_id").notNull(),
		categoryId: int("category_id").notNull(),
	},
	(table) => ({
		unq: unique().on(table.departmentId, table.categoryId),
	})
);

// Определение отношений для связи отделов и категорий
export const departmentCategoriesRelations = relations(departmentCategories, ({ one }) => ({
	department: one(departments, {
		fields: [departmentCategories.departmentId],
		references: [departments.id],
	}),
	category: one(categories, {
		fields: [departmentCategories.categoryId],
		references: [categories.id],
	}),
}));

// ------------------------------
// НАЦЕНКА
// ------------------------------
export const markupRules = mysqlTable("markup_rule", {
	id: int("id").primaryKey().autoincrement(),
	departmentId: int("department_id"),
	categoryId: int("category_id"),
	brand: varchar("brand", { length: 255 }),
	priceFrom: float("price_from").default(0).notNull(),
	priceTo: float("price_to"),
	markup: float("markup").default(1.0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Определение отношений для правил наценки
export const markupRulesRelations = relations(markupRules, ({ one }) => ({
	department: one(departments, {
		fields: [markupRules.departmentId],
		references: [departments.id],
	}),
	category: one(categories, {
		fields: [markupRules.categoryId],
		references: [categories.id],
	}),
}));

// ------------------------------
// ЛОГИРОВАНИЕ
// ------------------------------
export const importLogs = mysqlTable("import_log", {
	id: int("id").primaryKey().autoincrement(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	created: int("created").notNull(),
	updated: int("updated").notNull(),
	skipped: int("skipped").default(0).notNull(),
	imagePolicy: varchar("image_policy", { length: 255 }),
	markupSummary: varchar("markup_summary", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	userId: int("user_id").notNull(),
	message: text("message"),
	count: int("count").notNull(),
	departmentId: int("department_id"),
	snapshots: json("snapshots"),
	snapshotBefore: json("snapshot_before"),
	snapshotAfter: json("snapshot_after"),
});

// Определение отношений для логов импорта
export const importLogsRelations = relations(importLogs, ({ one }) => ({
	user: one(users, {
		fields: [importLogs.userId],
		references: [users.id],
	}),
	department: one(departments, {
		fields: [importLogs.departmentId],
		references: [departments.id],
	}),
}));

export const productLogs = mysqlTable("product_log", {
	id: int("id").primaryKey().autoincrement(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	action: varchar("action", { length: 255 }).notNull(),
	message: text("message"),
	userId: int("user_id").notNull(),
	departmentId: int("department_id"),
	productId: int("product_id"),
	snapshotBefore: json("snapshot_before"),
	snapshotAfter: json("snapshot_after"),
});

// Определение отношений для логов товаров
export const productLogsRelations = relations(productLogs, ({ one }) => ({
	user: one(users, {
		fields: [productLogs.userId],
		references: [users.id],
	}),
	department: one(departments, {
		fields: [productLogs.departmentId],
		references: [departments.id],
	}),
	product: one(products, {
		fields: [productLogs.productId],
		references: [products.id],
	}),
}));

export const bulkActionLogs = mysqlTable("bulk_action_log", {
	id: int("id").primaryKey().autoincrement(),
	userId: int("user_id").notNull(),
	departmentId: int("department_id"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	action: varchar("action", { length: 255 }).notNull(),
	message: text("message"),
	snapshots: json("snapshots").notNull(),
	count: int("count").notNull(),
});

// Определение отношений для логов массовых действий
export const bulkActionLogsRelations = relations(bulkActionLogs, ({ one }) => ({
	user: one(users, {
		fields: [bulkActionLogs.userId],
		references: [users.id],
	}),
	department: one(departments, {
		fields: [bulkActionLogs.departmentId],
		references: [departments.id],
	}),
}));

export const userLogs = mysqlTable("user_log", {
	id: int("id").primaryKey().autoincrement(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	action: varchar("action", { length: 255 }).notNull(),
	message: text("message"),
	adminId: int("admin_id").notNull(),
	targetUserId: int("target_user_id"),
	departmentId: int("department_id"),
	snapshotBefore: json("snapshot_before"),
	snapshotAfter: json("snapshot_after"),
	userId: int("user_id"),
});

// Определение отношений для логов пользователей
export const userLogsRelations = relations(userLogs, ({ one }) => ({
	admin: one(users, {
		fields: [userLogs.adminId],
		references: [users.id],
		relationName: "AdminUserLogs",
	}),
	targetUser: one(users, {
		fields: [userLogs.targetUserId],
		references: [users.id],
		relationName: "TargetUserLogs",
	}),
	department: one(departments, {
		fields: [userLogs.departmentId],
		references: [departments.id],
	}),
	user: one(users, {
		fields: [userLogs.userId],
		references: [users.id],
	}),
}));
