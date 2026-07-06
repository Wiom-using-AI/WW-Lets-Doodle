import { prisma } from "@/lib/prisma";

async function getResults() {
  const doodles = await prisma.doodle.findMany({
    where: { isSubmitted: true },
    include: {
      session: { include: { employee: true } },
      votes: true,
    },
  });

  const scored = doodles.map((d) => {
    const points = d.votes.reduce((sum, v) => sum + (4 - v.rank), 0); // rank1=3, rank2=2, rank3=1
    return { doodle: d, points, employee: d.session.employee };
  });

  return scored.sort((a, b) => b.points - a.points);
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ResultsScreen() {
  const results = await getResults();
  const top3 = results.slice(0, 3);
  const rest = results.slice(3);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="text-center py-12 px-4 space-y-3">
        <div className="text-6xl">🏆</div>
        <h1 className="text-5xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
          WW Let&apos;s Doodle
        </h1>
        <p className="text-white/50 text-lg">The votes are in. Here are your champions!</p>
      </div>

      {/* Top 3 */}
      <div className="max-w-3xl mx-auto w-full px-4 space-y-6">
        {top3.length === 0 ? (
          <p className="text-center text-white/40">No submissions yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {top3.map((r, i) => (
              <div key={r.doodle.id} className="card overflow-hidden relative">
                <div className="absolute top-3 left-3 text-3xl z-10">{MEDALS[i]}</div>
                <img src={r.doodle.imageData} alt="Winning doodle" className="w-full" />
                <div className="p-4 space-y-1">
                  <div className="font-black text-lg">{r.employee.name}</div>
                  <div className="text-xs text-white/50">{r.employee.department}</div>
                  <div className="text-amber-400 font-bold">★ {r.points} points</div>
                  {i < 3 && (
                    <div className="text-xs text-green-400 font-semibold mt-1">🎁 Wins surprise goodies!</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rest of submissions */}
        {rest.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white/40 text-sm uppercase tracking-widest font-semibold">All Submissions</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {rest.map((r, i) => (
                <div key={r.doodle.id} className="card p-3 flex gap-3 items-center">
                  <span className="text-white/30 font-mono text-sm w-6">{i + 4}</span>
                  <img src={r.doodle.imageData} alt="" className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.employee.name}</div>
                    <div className="text-xs text-white/40">{r.employee.department}</div>
                    <div className="text-xs text-amber-400">{r.points} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-8 text-white/20 text-xs">WW Let&apos;s Doodle · Wiom Wednesday Activity</div>
    </div>
  );
}
