import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/session";

export async function POST(req: NextRequest) {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const now = new Date();
  const hour = now.getHours();
  if (hour < 11 || hour >= 18) {
    return NextResponse.json({ error: "Voting is only open from 11 AM to 6 PM." }, { status: 400 });
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

  // Remove existing vote at this rank (replace it)
  await prisma.vote.deleteMany({
    where: { voterId: employee.id, rank },
  });
  // Remove existing vote for this doodle (replace it)
  await prisma.vote.deleteMany({
    where: { voterId: employee.id, doodleId },
  });

  await prisma.vote.create({
    data: { voterId: employee.id, doodleId, rank },
  });

  return NextResponse.json({ ok: true });
}
