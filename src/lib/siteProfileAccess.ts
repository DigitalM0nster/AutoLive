import type { Role } from "@/lib/rolesConfig";

/** Роли, которым доступен личный кабинет на публичном сайте */
export const SITE_PROFILE_ROLES: Role[] = ["client", "superadmin", "admin", "manager"];

export function canAccessSiteProfile(role: Role | null | undefined): role is Role {
	return role != null && SITE_PROFILE_ROLES.includes(role);
}
