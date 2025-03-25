// src\app\lib\db.ts
// Определяем допустимые роли
export type Role = "superadmin" | "admin" | "manager";

// Определяем тип допустимых прав
export type Permission = "manage_admins" | "manage_managers" | "view_all_orders" | "view_own_orders" | "edit_products" | "edit_categories" | "create_orders" | "access_all";

// Массивы прав по ролям
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
	superadmin: ["manage_admins", "manage_managers", "view_all_orders", "edit_products", "edit_categories", "access_all"],
	admin: ["manage_managers", "view_own_orders", "edit_products", "edit_categories"],
	manager: ["create_orders", "view_own_orders"],
};

// Утилита для проверки прав
export function hasPermission(role: Role, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role]?.includes(permission);
}
