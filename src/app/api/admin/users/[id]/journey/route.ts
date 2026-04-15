import { NextResponse } from "next/server";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { fetchUserJourney } from "@/features/engagement/lib/user-journey";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  const journey = await fetchUserJourney(id);
  if (!journey) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(journey, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
