import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee, getEvent } from "@/lib/session";

export async function POST(req: NextRequest) {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Voting is open while the event is running; it closes when the admin closes the event.
  const event = await getEvent();
  if (event.status === "completed") {
    return NextResponse.json({ error: "Voting has closed." }, { status: 400 });
  }

  const { doodleId, rank } = await req.json();
  if (!doodleId || ![1, 2, 3].includes(rank)) {
    return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
  }

  // Block self-voting
  const doodle = await prisma.doodle.findUnique({
    where: { id: doodleId },
    include: { session: true },
  });
  if (!doodle) return NextResponse.json({ error: "Doodle not found." }, { status: 404 });
  if (doodle.session.employeeId === employee.id) {
    return NextResponse.json({ error: "You cannot vote for your own doodle." }, { status: 403 });
  }

  // Toggle off: tapping the medal this doodle already holds removes it (un-pick).
  const existing = await prisma.vote.findUnique({
    where: { voterId_doodleId: { voterId: employee.id, doodleId } },
  });
  if (existing && existing.rank === rank) {
    await prisma.vote.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, removed: true });
  }

  // Otherwise assign this medal to this doodle: free the medal from wherever it was,
  // and clear any other medal this doodle held. Each medal + each doodle is used once.
  await prisma.vote.deleteMany({ where: { voterId: employee.id, rank } });
  await prisma.vote.deleteMany({ where: { voterId: employee.id, doodleId } });
  await prisma.vote.create({ data: { voterId: employee.id, doodleId, rank } });

  return NextResponse.json({ ok: true });
}
