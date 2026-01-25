// src/lib/rolesConfig.ts

export type Role = "superadmin" | "admin" | "manager" | "client";

export type Permission =
	| "view_departments"
	| "manage_departments"
	| "view_departments_logs"
	| "manage_departments_logs"
	| "manage_admins"
	| "manage_managers"
	| "view_orders"
	| "manage_orders"
	| "assign_orders"
	| "view_orders_logs"
	| "view_products"
	| "edit_products"
	| "edit_categories"
	| "create_orders"
	| "create_users"
	| "access_all"
	| "view_products_logs"
	| "view_users_logs"
	| "manage_users_logs"
	| "delete_users"
	| "view_bookings"
	| "manage_bookings";

export type Scope = "all" | "department" | "own";

export type RolePermission = {
	permission: Permission;
	scope: Scope;
};

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
	superadmin: [
		{ permission: "view_products_logs", scope: "all" },
		{ permission: "view_users_logs", scope: "all" },
		{ permission: "manage_users_logs", scope: "all" },
		{ permission: "view_departments_logs", scope: "all" },
		{ permission: "manage_departments_logs", scope: "all" },
		{ permission: "delete_users", scope: "all" },
		{ permission: "create_users", scope: "all" },
		{ permission: "view_departments", scope: "all" },
		{ permission: "manage_departments", scope: "all" },
		{ permission: "manage_admins", scope: "all" },
		{ permission: "manage_managers", scope: "all" },
		{ permission: "view_orders", scope: "all" },
		{ permission: "create_orders", scope: "all" },
		{ permission: "manage_orders", scope: "all" },
		{ permission: "assign_orders", scope: "all" },
		{ permission: "view_orders_logs", scope: "all" },
		{ permission: "view_products", scope: "all" },
		{ permission: "edit_products", scope: "all" },
		{ permission: "edit_categories", scope: "all" },
		{ permission: "view_bookings", scope: "all" },
		{ permission: "manage_bookings", scope: "all" },
		{ permission: "access_all", scope: "all" },
	],
	admin: [
		{ permission: "view_products_logs", scope: "department" },
		{ permission: "view_users_logs", scope: "all" }, // Админы могут просматривать логи всех пользователей
		{ permission: "view_departments_logs", scope: "all" }, // Админы могут просматривать логи всех отделов
		{ permission: "delete_users", scope: "department" },
		{ permission: "create_users", scope: "department" },
		{ permission: "view_departments", scope: "department" },
		{ permission: "manage_departments", scope: "department" },
		{ permission: "manage_managers", scope: "department" },
		{ permission: "view_products", scope: "department" },
		{ permission: "view_orders", scope: "all" },
		{ permission: "create_orders", scope: "department" },
		{ permission: "manage_orders", scope: "department" },
		{ permission: "assign_orders", scope: "department" },
		{ permission: "view_orders_logs", scope: "all" },
		{ permission: "edit_products", scope: "department" },
		{ permission: "edit_categories", scope: "department" },
		{ permission: "view_bookings", scope: "all" },
		{ permission: "manage_bookings", scope: "all" },
	],
	manager: [
		{ permission: "view_products", scope: "department" },
		{ permission: "view_products_logs", scope: "department" }, // Менеджеры могут просматривать логи всех продуктов
		{ permission: "view_users_logs", scope: "all" }, // Менеджеры могут просматривать логи всех пользователей
		{ permission: "view_departments_logs", scope: "all" }, // Менеджеры могут просматривать логи всех отделов
		{ permission: "create_orders", scope: "own" },
		{ permission: "view_orders", scope: "all" }, // Менеджеры могут просматривать все заказы (только просмотр)
		{ permission: "manage_orders", scope: "own" }, // Менеджеры могут редактировать только свои заказы
		{ permission: "assign_orders", scope: "own" },
		{ permission: "view_orders_logs", scope: "all" }, // Менеджеры могут просматривать логи всех заказов
		{ permission: "view_bookings", scope: "all" },
	],
	client: [],
};

export function hasPermission(role: Role, permission: Permission): RolePermission | null {
	const perms = ROLE_PERMISSIONS[role];
	return perms.find((p) => p.permission === permission) || null;
}
