import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/session";

export async function POST() {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Check existing session
  const existing = await prisma.gameSession.findUnique({
    where: { employeeId: employee.id },
    include: { doodles: true },
  });

  if (existing) {
    const prompts = await Promise.all([
      prisma.prompt.findUnique({ where: { id: existing.prompt1Id } }),
      prisma.prompt.findUnique({ where: { id: existing.prompt2Id } }),
      prisma.prompt.findUnique({ where: { id: existing.prompt3Id } }),
    ]);
    return NextResponse.json({
      id: existing.id,
      prompts: prompts.map((p) => p?.phrase ?? ""),
      currentTry: existing.currentTry,
      status: existing.status,
    });
  }

  // Assign 3 random prompts
  const allPrompts = await prisma.prompt.findMany({ where: { isActive: true } });
  if (allPrompts.length < 3) {
    return NextResponse.json({ error: "Not enough prompts configured." }, { status: 500 });
  }

  const shuffled = allPrompts.sort(() => Math.random() - 0.5).slice(0, 3);

  const session = await prisma.gameSession.create({
    data: {
      employeeId: employee.id,
      prompt1Id: shuffled[0].id,
      prompt2Id: shuffled[1].id,
      prompt3Id: shuffled[2].id,
    },
  });

  return NextResponse.json({
    id: session.id,
    prompts: shuffled.map((p) => p.phrase),
    currentTry: 1,
    status: "playing",
  });
}
