import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_auth")?.value === "true";
}

// Wipes all gameplay data (votes, doodles, sessions) so the event can start fresh.
// Keeps employees, prompts, and the event record. Admin-only.
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const votes = await prisma.vote.deleteMany({});
  const doodles = await prisma.doodle.deleteMany({});
  const sessions = await prisma.gameSession.deleteMany({});
  return NextResponse.json({ ok: true, votes: votes.count, doodles: doodles.count, sessions: sessions.count });
}
