import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/session";
import type { GameSession } from "@prisma/client";

const TRY_DURATION_MS = 420_000; // 7 minutes per try

// Greedy pick of 3 prompts, least-used first (orderedIds is pre-sorted by usage),
// skipping any trio that reuses a pair already handed out — so no two employees
// ever share more than 1 prompt. Returns null if the pool is exhausted (>~100 emp).
function pickTriple(orderedIds: string[], usedPairs: Set<string>, pairKey: (a: string, b: string) => string) {
  for (let i = 0; i < orderedIds.length; i++)
    for (let j = i + 1; j < orderedIds.length; j++) {
      if (usedPairs.has(pairKey(orderedIds[i], orderedIds[j]))) continue;
      for (let k = j + 1; k < orderedIds.length; k++) {
        if (usedPairs.has(pairKey(orderedIds[i], orderedIds[k]))) continue;
        if (usedPairs.has(pairKey(orderedIds[j], orderedIds[k]))) continue;
        return [orderedIds[i], orderedIds[j], orderedIds[k]];
      }
    }
  return null;
}

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
  // Light payload — just enough to decide entry/resume/done (no heavy doodle images).
  return NextResponse.json({ exists: true, status: session.status, stage: session.stage });
}

// POST — create-or-resume the session (called when the game actually starts)
export async function POST() {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let session = await prisma.gameSession.findUnique({ where: { employeeId: employee.id } });
  if (!session) {
    session = await prisma.$transaction(async (tx) => {
      // Serialize concurrent logins so simultaneous starts can't read stale state.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742301)`;

      // Re-check inside the lock (another request may have just created it).
      const existing = await tx.gameSession.findUnique({ where: { employeeId: employee.id } });
      if (existing) return existing;

      const allPrompts = await tx.prompt.findMany({ where: { isActive: true } });
      if (allPrompts.length < 3) throw new Error("NOT_ENOUGH_PROMPTS");

      // Tally how many times each prompt was handed out + which pairs are taken.
      const prior = await tx.gameSession.findMany({
        select: { prompt1Id: true, prompt2Id: true, prompt3Id: true },
      });
      const used = new Map(allPrompts.map((p) => [p.id, 0]));
      const usedPairs = new Set<string>();
      const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
      for (const s of prior) {
        const ids = [s.prompt1Id, s.prompt2Id, s.prompt3Id];
        for (const id of ids) if (used.has(id)) used.set(id, used.get(id)! + 1);
        usedPairs.add(pairKey(ids[0], ids[1]));
        usedPairs.add(pairKey(ids[0], ids[2]));
        usedPairs.add(pairKey(ids[1], ids[2]));
      }

      // Least-used first (fills every prompt before repeating), random only for ties.
      const order = allPrompts
        .map((p) => ({ id: p.id, count: used.get(p.id)!, r: Math.random() }))
        .sort((a, b) => a.count - b.count || a.r - b.r)
        .map((x) => x.id);

      // Enforce ≤1 shared prompt between any two employees; fall back to least-used
      // if the pool is exhausted (more than ~100 employees for a 25-prompt bank).
      const chosen = pickTriple(order, usedPairs, pairKey) ?? order.slice(0, 3);

      return tx.gameSession.create({
        data: { employeeId: employee.id, prompt1Id: chosen[0], prompt2Id: chosen[1], prompt3Id: chosen[2] },
      });
    }, { maxWait: 10000, timeout: 20000 }).catch((e: unknown) => {
      if (e instanceof Error && e.message === "NOT_ENOUGH_PROMPTS") return null;
      throw e;
    });
    if (!session) return NextResponse.json({ error: "Not enough prompts configured." }, { status: 500 });
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
      // so closing/reopening the tab can never reset or extend the 7-minute window.
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
      const promptPhrase = (await prisma.prompt.findUnique({ where: { id: promptId }, select: { phrase: true } }))?.phrase ?? "";
      await prisma.doodle.upsert({
        where: { sessionId_tryNumber: { sessionId: session.id, tryNumber: T } },
        update: { imageData, promptPhrase },
        create: { sessionId: session.id, tryNumber: T, promptId, promptPhrase, imageData, finalized: false },
      });
      return NextResponse.json({ ok: true });
    }
    case "finalize": {
      if (!imageData) return NextResponse.json({ error: "No image." }, { status: 400 });
      const promptPhrase = (await prisma.prompt.findUnique({ where: { id: promptId }, select: { phrase: true } }))?.phrase ?? "";
      await prisma.$transaction([
        prisma.doodle.upsert({
          where: { sessionId_tryNumber: { sessionId: session.id, tryNumber: T } },
          update: { imageData, finalized: true, promptPhrase },
          create: { sessionId: session.id, tryNumber: T, promptId, promptPhrase, imageData, finalized: true },
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
