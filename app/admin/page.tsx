import { cookies } from "next/headers";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { prisma } from "@/lib/prisma";
import { getEvent } from "@/lib/session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin_auth")?.value === "true";
  if (!isAdmin) return <AdminLogin />;

  const [event, employeeCount, promptCount, doodleCount] = await Promise.all([
    getEvent(),
    prisma.employee.count(),
    prisma.prompt.count(),
    prisma.doodle.count({ where: { isSubmitted: true } }),
  ]);

  const prompts = await prisma.prompt.findMany({ orderBy: { createdAt: "asc" } });

  // Full leaderboard with per-doodle voter breakdown (admin-only, always visible).
  const submitted = await prisma.doodle.findMany({
    where: { isSubmitted: true },
    include: {
      session: { include: { employee: true } },
      votes: { include: { voter: true } },
    },
  });
  const promptMap = Object.fromEntries(prompts.map((p) => [p.id, p.phrase]));
  const leaderboard = submitted
    .map((d) => ({
      id: d.id,
      employeeId: d.session.employee.id,
      imageData: d.imageData,
      prompt: promptMap[d.promptId] ?? "",
      submitter: { name: d.session.employee.name, department: d.session.employee.department },
      points: d.votes.reduce((s, v) => s + (4 - v.rank), 0),
      voteCount: d.votes.length,
      voters: d.votes
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((v) => ({ name: v.voter.name, department: v.voter.department, rank: v.rank })),
    }))
    .sort((a, b) => b.points - a.points || b.voteCount - a.voteCount);

  // --- Data for record-keeping (downloadable as Excel) ---
  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "");

  const loginRows = (await prisma.employee.findMany({ where: { loggedInAt: { not: null } }, orderBy: { loggedInAt: "asc" } }))
    .map((e) => ({ Name: e.name, Email: e.email, Department: e.department, "Logged in at": fmt(e.loggedInAt) }));

  const playedSessions = await prisma.gameSession.findMany({ include: { employee: true }, orderBy: { createdAt: "asc" } });
  const playedRows = playedSessions.map((s) => ({
    Name: s.employee.name, Email: s.employee.email, Department: s.employee.department,
    Submitted: s.status === "completed" ? "Yes" : "No", "Started at": fmt(s.createdAt),
  }));

  const allVotes = await prisma.vote.findMany({ include: { voter: true } });
  const voterMap = new Map<string, { Name: string; Email: string; Department: string; Votes: number }>();
  for (const v of allVotes) {
    const cur = voterMap.get(v.voterId) ?? { Name: v.voter.name, Email: v.voter.email, Department: v.voter.department, Votes: 0 };
    cur.Votes += 1;
    voterMap.set(v.voterId, cur);
  }
  const votedRows = Array.from(voterMap.values()).sort((a, b) => b.Votes - a.Votes);

  return (
    <AdminDashboard
      event={event}
      stats={{ employeeCount, promptCount, doodleCount }}
      prompts={prompts}
      leaderboard={leaderboard}
      data={{ logins: loginRows, played: playedRows, voted: votedRows }}
    />
  );
}
