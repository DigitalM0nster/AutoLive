// src/lib/rolesConfig.ts

export type Role = "superadmin" | "admin" | "manager" | "client";

export type Permission = "manage_admins" | "manage_managers" | "view_all_orders" | "view_own_orders" | "edit_products" | "edit_categories" | "create_orders" | "access_all";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
	superadmin: ["manage_admins", "manage_managers", "view_all_orders", "edit_products", "edit_categories", "access_all"],
	admin: ["manage_managers", "view_own_orders", "edit_products", "edit_categories"],
	manager: ["create_orders", "view_own_orders"],
	client: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role]?.includes(permission);
}
