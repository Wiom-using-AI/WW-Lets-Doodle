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
        <div className="text-7xl wobble-l inline-block">🏆</div>
        <h1 className="text-6xl font-hand font-bold">
          <span className="text-crayon-orange">WW Let&apos;s </span><span className="text-crayon-pink">Doodle!</span>
        </h1>
        <p className="text-ink/70 text-lg font-body">The votes are in. Here are your champions! 🎉</p>
      </div>

      {/* Top 3 */}
      <div className="max-w-3xl mx-auto w-full px-4 space-y-8">
        {top3.length === 0 ? (
          <p className="text-center text-ink/50 font-body">No submissions yet.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {top3.map((r, i) => (
              <div key={r.doodle.id} className={`card overflow-hidden relative ${i === 0 ? "md:-translate-y-3" : ""} ${i % 2 ? "wobble-r" : "wobble-l"}`}>
                <div className="absolute top-2 left-2 text-4xl z-10 drop-shadow">{MEDALS[i]}</div>
                <img src={r.doodle.imageData} alt="Winning doodle" className="w-full bg-white border-b-[3px] border-ink" />
                <div className="p-4 space-y-1 text-center">
                  <div className="font-hand font-bold text-xl text-ink">{r.employee.name}</div>
                  <div className="text-xs text-ink/50 font-body">{r.employee.department}</div>
                  <div className="chip bg-crayon-yellow mt-1">★ {r.points} points</div>
                  <div className="text-xs text-crayon-green font-body font-bold mt-1">🎁 Wins surprise goodies!</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rest of submissions */}
        {rest.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-ink/50 text-sm uppercase tracking-widest font-body font-bold">All Submissions</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {rest.map((r, i) => (
                <div key={r.doodle.id} className="card p-3 flex gap-3 items-center">
                  <span className="text-ink/40 font-hand font-bold text-lg w-6">{i + 4}</span>
                  <img src={r.doodle.imageData} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-ink bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-ink">{r.employee.name}</div>
                    <div className="text-xs text-ink/50 font-body">{r.employee.department}</div>
                    <div className="text-xs text-crayon-orange font-body font-bold">{r.points} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-8 text-ink/30 text-xs font-body">WW Let&apos;s Doodle · Wiom Wednesday Activity</div>
    </div>
  );
}
