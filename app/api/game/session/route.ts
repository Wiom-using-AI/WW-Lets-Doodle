import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/session";
import type { GameSession } from "@prisma/client";

const TRY_DURATION_MS = 300_000; // 5 minutes per try

async function buildState(session: GameSession) {
  const promptIds = [session.prompt1Id, session.prompt2Id, session.prompt3Id];
  const [promptRows, doodles] = await Promise.all([
    prisma.prompt.findMany({ where: { id: { in: promptIds } } }),
    prisma.doodle.findMany({ where: { sessionId: session.id }, orderBy: { tryNumber: "asc" } }),
  ]);
  const pmap = Object.fromEntries(promptRows.map((p) => [p.id, p.phrase]));
  return {
    id: session.id,
    exists: true,
    prompts: promptIds.map((id) => pmap[id] ?? ""),
    currentTry: session.currentTry,
    stage: session.stage,
    status: session.status,
    tryStartedAt: session.tryStartedAt ? session.tryStartedAt.toISOString() : null,
    tryDurationMs: TRY_DURATION_MS,
    serverNow: new Date().toISOString(),
    doodles: doodles.map((d) => ({
      tryNumber: d.tryNumber,
      imageData: d.imageData,
      finalized: d.finalized,
      isSubmitted: d.isSubmitted,
    })),
  };
}

// GET — read existing state WITHOUT creating (so first-timers still see instructions)
export async function GET() {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const session = await prisma.gameSession.findUnique({ where: { employeeId: employee.id } });
  if (!session) return NextResponse.json({ exists: false });
  return NextResponse.json(await buildState(session));
}

// POST — create-or-resume the session (called when the game actually starts)
export async function POST() {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let session = await prisma.gameSession.findUnique({ where: { employeeId: employee.id } });
  if (!session) {
    const allPrompts = await prisma.prompt.findMany({ where: { isActive: true } });
    if (allPrompts.length < 3) return NextResponse.json({ error: "Not enough prompts configured." }, { status: 500 });
    const shuffled = allPrompts.sort(() => Math.random() - 0.5).slice(0, 3);
    session = await prisma.gameSession.create({
      data: { employeeId: employee.id, prompt1Id: shuffled[0].id, prompt2Id: shuffled[1].id, prompt3Id: shuffled[2].id },
    });
  }
  return NextResponse.json(await buildState(session));
}

// PATCH — drive state transitions. Body: { action, imageData? }
export async function PATCH(req: NextRequest) {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const session = await prisma.gameSession.findUnique({ where: { employeeId: employee.id } });
  if (!session) return NextResponse.json({ error: "No session." }, { status: 404 });
  if (session.status === "completed") return NextResponse.json({ error: "Already submitted." }, { status: 409 });

  const { action, imageData } = await req.json();
  const T = session.currentTry;
  const promptId = T === 1 ? session.prompt1Id : T === 2 ? session.prompt2Id : session.prompt3Id;

  switch (action) {
    case "start": {
      // Anchor the timer on the server. Idempotent: if already started, keep the original time
      // so closing/reopening the tab can never reset or extend the 2-minute window.
      const updated = session.tryStartedAt
        ? session
        : await prisma.gameSession.update({
            where: { id: session.id },
            data: { tryStartedAt: new Date(), stage: "drawing" },
          });
      return NextResponse.json({
        tryStartedAt: (updated.tryStartedAt ?? new Date()).toISOString(),
        tryDurationMs: TRY_DURATION_MS,
        serverNow: new Date().toISOString(),
      });
    }
    case "autosave": {
      if (!imageData) return NextResponse.json({ error: "No image." }, { status: 400 });
      await prisma.doodle.upsert({
        where: { sessionId_tryNumber: { sessionId: session.id, tryNumber: T } },
        update: { imageData },
        create: { sessionId: session.id, tryNumber: T, promptId, imageData, finalized: false },
      });
      return NextResponse.json({ ok: true });
    }
    case "finalize": {
      if (!imageData) return NextResponse.json({ error: "No image." }, { status: 400 });
      await prisma.$transaction([
        prisma.doodle.upsert({
          where: { sessionId_tryNumber: { sessionId: session.id, tryNumber: T } },
          update: { imageData, finalized: true },
          create: { sessionId: session.id, tryNumber: T, promptId, imageData, finalized: true },
        }),
        prisma.gameSession.update({ where: { id: session.id }, data: { stage: "confirm" } }),
      ]);
      return NextResponse.json(await buildState((await prisma.gameSession.findUnique({ where: { id: session.id } }))!));
    }
    case "retry": {
      if (T >= 3) return NextResponse.json({ error: "No retries left." }, { status: 400 });
      const updated = await prisma.gameSession.update({
        where: { id: session.id },
        data: { currentTry: T + 1, tryStartedAt: null, stage: "reveal" },
      });
      return NextResponse.json(await buildState(updated));
    }
    case "preview": {
      const updated = await prisma.gameSession.update({ where: { id: session.id }, data: { stage: "preview" } });
      return NextResponse.json(await buildState(updated));
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
