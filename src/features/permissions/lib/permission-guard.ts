/**
 * Middleware de verificação de permissões por recurso
 * Consulta a tabela Permission para verificar o nível mínimo de acesso
 */

import { prisma } from "@/shared/lib/db";
import { hasAccess, type UserRoleType } from "./role-hierarchy";
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";

/**
 * Verifica se o usuário tem permissão para acessar um recurso
 * Se o recurso não tem restrição cadastrada, acesso é liberado
 */
export async function checkPermission(
  resource: string,
  userRole: UserRoleType
): Promise<boolean> {
  const permission = await prisma.permission.findUnique({
    where: { resource },
  });

  if (!permission) return true;
  return hasAccess(userRole, permission.minRole as UserRoleType);
}

/**
 * Guard para API routes: verifica autenticação e role mínimo
 * Retorna o usuário se autorizado, ou NextResponse de erro
 */
export async function requireRole(minRole: UserRoleType): Promise<
  | { authorized: true; user: { id: string; role: UserRoleType; email: string } }
  | { authorized: false; response: NextResponse }
> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  const userRole = (session.user as { role?: string }).role as UserRoleType;

  if (!hasAccess(userRole, minRole)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: {
      id: session.user.id as string,
      role: userRole,
      email: session.user.email as string,
    },
  };
}

/**
 * Guard para API routes: verifica permissão de recurso específico
 */
export async function requirePermission(resource: string): Promise<
  | { authorized: true; user: { id: string; role: UserRoleType; email: string } }
  | { authorized: false; response: NextResponse }
> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      ),
    };
  }

  const userRole = (session.user as { role?: string }).role as UserRoleType;
  const allowed = await checkPermission(resource, userRole);

  if (!allowed) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: {
      id: session.user.id as string,
      role: userRole,
      email: session.user.email as string,
    },
  };
}

/**
 * Permissões padrão para seeding
 */
export const DEFAULT_PERMISSIONS: { resource: string; minRole: UserRoleType }[] = [
  { resource: "document:video", minRole: "ADMIN" },
  { resource: "document:slides", minRole: "MEMBER" },
  { resource: "document:mind_map", minRole: "MEMBER" },
  { resource: "document:bible_text", minRole: "MEMBER" },
  { resource: "menu:planning", minRole: "ADMIN" },
  { resource: "menu:subscriptions", minRole: "SUPER_ADMIN" },
];
