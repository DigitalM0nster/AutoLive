// src/lib/rolesConfig.ts

export type Role = "superadmin" | "admin" | "manager" | "client";

export type Permission = "manage_admins" | "manage_managers" | "view_orders" | "edit_products" | "edit_categories" | "create_orders" | "access_all";

export type Scope = "all" | "department" | "own";

export type RolePermission = {
	permission: Permission;
	scope: Scope;
};

export const ROLE_PERMISSIONS: Record<Role, RolePermission[]> = {
	superadmin: [
		{ permission: "manage_admins", scope: "all" },
		{ permission: "manage_managers", scope: "all" },
		{ permission: "view_orders", scope: "all" },
		{ permission: "edit_products", scope: "all" },
		{ permission: "edit_categories", scope: "all" },
		{ permission: "access_all", scope: "all" },
	],
	admin: [
		{ permission: "manage_managers", scope: "department" },
		{ permission: "view_orders", scope: "department" },
		{ permission: "edit_products", scope: "department" },
		{ permission: "edit_categories", scope: "department" },
	],
	manager: [
		{ permission: "create_orders", scope: "own" },
		{ permission: "view_orders", scope: "own" },
	],
	client: [],
};

export function hasPermission(role: Role, permission: Permission): RolePermission | null {
	const perms = ROLE_PERMISSIONS[role];
	return perms.find((p) => p.permission === permission) || null;
}
