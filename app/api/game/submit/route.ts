import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/session";

export async function POST(req: NextRequest) {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { sessionId, tryNumber, imageData } = await req.json();
  if (!sessionId || !tryNumber || !imageData) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session || session.employeeId !== employee.id) {
    return NextResponse.json({ error: "Invalid session." }, { status: 403 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "Already submitted." }, { status: 409 });
  }

  const promptId = tryNumber === 1 ? session.prompt1Id : tryNumber === 2 ? session.prompt2Id : session.prompt3Id;

  // Save all doodle attempts, mark chosen one as submitted
  await prisma.$transaction([
    prisma.doodle.upsert({
      where: { sessionId_tryNumber: { sessionId, tryNumber } },
      update: { imageData, isSubmitted: true },
      create: { sessionId, tryNumber, promptId, imageData, isSubmitted: true },
    }),
    prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
