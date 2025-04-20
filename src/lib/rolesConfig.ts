// src/lib/rolesConfig.ts

export type Role = "superadmin" | "admin" | "manager" | "client";

export type Permission =
	| "view_departments"
	| "manage_departments"
	| "manage_admins"
	| "manage_managers"
	| "view_orders"
	| "view_products"
	| "edit_products"
	| "edit_categories"
	| "create_orders"
	| "access_all"
	| "view_products_logs";

export type Scope = "all" | "department" | "own";

export type RolePermission = {
	permission: Permission;
	scope: Scope;
};

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
	superadmin: [
		{ permission: "view_products_logs", scope: "all" },
		{ permission: "view_departments", scope: "all" },
		{ permission: "manage_departments", scope: "all" },
		{ permission: "manage_admins", scope: "all" },
		{ permission: "manage_managers", scope: "all" },
		{ permission: "view_orders", scope: "all" },
		{ permission: "view_products", scope: "all" },
		{ permission: "edit_products", scope: "all" },
		{ permission: "edit_categories", scope: "all" },
		{ permission: "access_all", scope: "all" },
	],
	admin: [
		{ permission: "view_products_logs", scope: "department" },
		{ permission: "view_departments", scope: "department" },
		{ permission: "manage_departments", scope: "department" },
		{ permission: "manage_managers", scope: "department" },
		{ permission: "view_products", scope: "department" },
		{ permission: "view_orders", scope: "department" },
		{ permission: "edit_products", scope: "department" },
		{ permission: "edit_categories", scope: "department" },
	],
	manager: [
		{ permission: "view_products", scope: "department" },
		{ permission: "create_orders", scope: "own" },
		{ permission: "view_orders", scope: "own" },
	],
	client: [],
};

export function hasPermission(role: Role, permission: Permission): RolePermission | null {
	const perms = ROLE_PERMISSIONS[role];
	return perms.find((p) => p.permission === permission) || null;
}
