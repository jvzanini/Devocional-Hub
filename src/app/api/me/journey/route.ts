import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { fetchUserJourney } from "@/features/engagement/lib/user-journey";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const journey = await fetchUserJourney(userId);
  if (!journey) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(journey, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
