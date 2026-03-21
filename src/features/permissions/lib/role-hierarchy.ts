/**
 * Hierarquia de roles e funções de verificação de acesso
 * SUPER_ADMIN(100) > ADMIN(80) > SUBSCRIBER_VIP(60) > SUBSCRIBER(40) > MEMBER(20)
 */

export type UserRoleType =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SUBSCRIBER_VIP"
  | "SUBSCRIBER"
  | "MEMBER";

const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SUBSCRIBER_VIP: 60,
  SUBSCRIBER: 40,
  MEMBER: 20,
};

/**
 * Verifica se o role do usuário tem acesso suficiente
 * Ex: hasAccess("ADMIN", "MEMBER") → true (80 >= 20)
 * Ex: hasAccess("MEMBER", "ADMIN") → false (20 < 80)
 */
export function hasAccess(
  userRole: UserRoleType,
  requiredRole: UserRoleType
): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/**
 * Verifica se o usuário é admin (ADMIN ou SUPER_ADMIN)
 */
export function isAdmin(role: UserRoleType): boolean {
  return hasAccess(role, "ADMIN");
}

/**
 * Verifica se o usuário é super admin
 */
export function isSuperAdmin(role: UserRoleType): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Verifica se o usuário é assinante (SUBSCRIBER, SUBSCRIBER_VIP, ADMIN, SUPER_ADMIN)
 */
export function isSubscriber(role: UserRoleType): boolean {
  return hasAccess(role, "SUBSCRIBER");
}

/**
 * Retorna o nível numérico do role
 */
export function getRoleLevel(role: UserRoleType): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Lista de todos os roles disponíveis (para dropdowns no admin)
 */
export const ALL_ROLES: { value: UserRoleType; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUBSCRIBER_VIP", label: "Assinante VIP" },
  { value: "SUBSCRIBER", label: "Assinante" },
  { value: "MEMBER", label: "Membro" },
];
