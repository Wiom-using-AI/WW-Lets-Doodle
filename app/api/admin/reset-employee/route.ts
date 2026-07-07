import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_auth")?.value === "true";
}

// Removes ONE employee's submission so they can participate again:
// deletes their game session + doodles + any votes cast on those doodles.
// Keeps the employee record (and their login) and any votes THEY cast on others.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = await req.json();
  if (!employeeId) return NextResponse.json({ error: "employeeId required." }, { status: 400 });

  const session = await prisma.gameSession.findUnique({ where: { employeeId } });
  if (!session) return NextResponse.json({ ok: true, note: "No submission to remove." });

  const doodleIds = (await prisma.doodle.findMany({ where: { sessionId: session.id }, select: { id: true } })).map((d) => d.id);
  await prisma.vote.deleteMany({ where: { doodleId: { in: doodleIds } } }); // votes ON their doodles
  await prisma.doodle.deleteMany({ where: { sessionId: session.id } });
  await prisma.gameSession.delete({ where: { id: session.id } });

  return NextResponse.json({ ok: true });
}
