import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";

/**
 * GET /api/admin/permissions — Lista todas as permissões configuradas
 */
export async function GET() {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const permissions = await prisma.permission.findMany({
    orderBy: { resource: "asc" },
  });

  return NextResponse.json(permissions);
}

/**
 * PATCH /api/admin/permissions — Atualiza permissões em batch
 * Body: { permissions: [{ resource: string, minRole: string }] }
 */
export async function PATCH(req: Request) {
  const guard = await requireRole("SUPER_ADMIN");
  if (!guard.authorized) return guard.response;

  const body = await req.json();
  const { permissions } = body as {
    permissions: { resource: string; minRole: string }[];
  };

  if (!Array.isArray(permissions)) {
    return NextResponse.json(
      { error: "Campo 'permissions' é obrigatório e deve ser um array" },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: { resource: p.resource },
        update: { minRole: p.minRole as never },
        create: {
          resource: p.resource,
          minRole: p.minRole as never,
        },
      })
    )
  );

  return NextResponse.json(results);
}
