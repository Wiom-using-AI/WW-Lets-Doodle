import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEvent } from "@/lib/session";

// Public endpoint for the office-TV wall. No auth. Incremental: pass ?since=<ISO> and
// it returns only submissions created after that time (oldest-first), so the wall pulls
// each new doodle exactly once instead of re-downloading every base64 image each poll.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(0);
  const event = await getEvent();

  const doodles = await prisma.doodle.findMany({
    where: { isSubmitted: true, createdAt: { gt: since } },
    include: { session: { include: { employee: true } } },
    orderBy: { createdAt: "asc" },
  });

  const promptIds = Array.from(new Set(doodles.map((d) => d.promptId)));
  const prompts = await prisma.prompt.findMany({ where: { id: { in: promptIds } } });
  const promptMap = Object.fromEntries(prompts.map((p) => [p.id, p.phrase]));

  return NextResponse.json({
    status: event.status,
    now: new Date().toISOString(),
    doodles: doodles.map((d) => ({
      id: d.id,
      imageData: d.imageData,
      // Prefer the topic stored on the doodle; fall back to the live prompt bank for old rows.
      prompt: d.promptPhrase || promptMap[d.promptId] || "",
      name: d.session.employee.name,
      department: d.session.employee.department,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}
