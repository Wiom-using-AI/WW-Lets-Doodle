import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/session";

export async function GET() {
  const employee = await getCurrentEmployee();
  const now = new Date();
  const votingClosed = now.getHours() >= 18;

  const doodles = await prisma.doodle.findMany({
    where: { isSubmitted: true },
    include: {
      session: { include: { employee: true } },
      votes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const result = doodles.map((d) => {
    const points = d.votes.reduce((sum, v) => sum + (4 - v.rank), 0);
    const myVote = employee ? d.votes.find((v) => v.voterId === employee.id) : null;

    return {
      id: d.id,
      imageData: d.imageData,
      promptId: d.promptId,
      prompt: "", // will enrich below
      employee: {
        id: d.session.employee.id,
        name: d.session.employee.name,
        department: d.session.employee.department,
      },
      voteCount: votingClosed ? points : 0, // hide counts until 6 PM
      myVoteRank: myVote?.rank ?? null,
      isOwn: employee ? d.session.employeeId === employee.id : false,
    };
  });

  // Enrich with prompt phrases
  const promptIds = Array.from(new Set(doodles.map((d) => d.promptId)));
  const prompts = await prisma.prompt.findMany({ where: { id: { in: promptIds } } });
  const promptMap = Object.fromEntries(prompts.map((p) => [p.id, p.phrase]));

  return NextResponse.json(result.map((r) => ({ ...r, prompt: promptMap[r.promptId] ?? "" })));
}
