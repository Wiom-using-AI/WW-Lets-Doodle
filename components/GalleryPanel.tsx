"use client";
import { useEffect, useState } from "react";

type Doodle = {
  id: string;
  imageData: string;
  promptId: string;
  prompt: string;
  employee: { name: string; department: string };
  voteCount: number;
  myVoteRank: number | null;
  isOwn: boolean;
};

const MEDAL = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : "🥉");

export default function GalleryPanel({ employeeId }: { employeeId: string }) {
  const [doodles, setDoodles] = useState<Doodle[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  async function fetchDoodles() {
    const res = await fetch("/api/gallery");
    if (res.ok) setDoodles(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchDoodles();
    const interval = setInterval(fetchDoodles, 30000);
    return () => clearInterval(interval);
  }, []);

  async function castVote(doodleId: string, rank: number) {
    setVotingFor(doodleId);
    await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doodleId, rank }),
    });
    await fetchDoodles();
    setVotingFor(null);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-pulse">🖼️</div>
          <p className="text-ink/50 text-sm font-body">Loading gallery...</p>
        </div>
      </div>
    );
  }

  const pick = (r: number) => doodles.find((d) => d.myVoteRank === r) || null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b-[3px] border-ink bg-white text-center shrink-0">
        <h2 className="font-hand font-bold text-3xl md:text-4xl text-crayon-pink leading-tight">🎨 Doodle Gallery</h2>
        <p className="text-sm md:text-base text-ink font-body font-semibold mt-0.5">Browse everyone&apos;s doodles and rate your favourites! ⭐</p>
      </div>

      {/* Your picks — always visible so changing votes is never confusing */}
      <div className="px-4 py-2.5 bg-crayon-yellow/40 border-b-[3px] border-ink shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm font-body font-bold text-ink shrink-0">Your top 3:</span>
          <div className="flex-1 flex gap-2 sm:gap-3 justify-around">
            {[1, 2, 3].map((r) => {
              const p = pick(r);
              return (
                <div key={r} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-lg shrink-0">{MEDAL(r)}</span>
                  {p ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={p.imageData} alt="" className="w-8 h-8 rounded-md border-2 border-ink bg-white object-contain shrink-0" />
                      <span className="text-xs font-body text-ink/80 truncate hidden sm:block">{p.employee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-body text-ink/40 italic">not picked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-ink/60 font-body mt-1 text-center">Tap a medal to give it to a doodle (it moves here from wherever it was). Tap the same medal again to remove it. Your picks always show above.</p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {doodles.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-5xl">🎨</div>
            <p className="text-ink/50 font-body">No doodles yet. Be the first!</p>
          </div>
        ) : (
          <div className="max-w-sm sm:max-w-3xl lg:max-w-5xl mx-auto grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {doodles.map((d) => (
              <div key={d.id} className="card overflow-hidden flex flex-col">
                <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-2">
                  <div className="w-8 h-8 rounded-full bg-crayon-blue border-2 border-ink flex items-center justify-center text-xs font-hand font-bold text-ink shrink-0">
                    {d.employee.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate text-ink leading-tight">{d.employee.name}</div>
                    <div className="text-[11px] text-ink/50 truncate">{d.employee.department}</div>
                  </div>
                  {d.voteCount > 0 && <div className="chip bg-crayon-yellow text-xs shrink-0">★ {d.voteCount}</div>}
                </div>

                <div className="px-3">
                  <img src={d.imageData} alt="Doodle" className="w-full h-44 rounded-xl border-2 border-ink bg-white object-contain" />
                </div>

                <div className="px-3 py-2.5 space-y-2 mt-auto">
                  <p className="text-xs text-ink/60 italic font-body truncate">&quot;{d.prompt}&quot;</p>
                  {d.isOwn ? (
                    <p className="chip bg-crayon-green/60 text-xs w-full text-center">✏️ Your doodle</p>
                  ) : (
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((rank) => (
                        <button
                          key={rank}
                          onClick={() => castVote(d.id, rank)}
                          disabled={votingFor === d.id}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-body font-bold transition-all border-2 border-ink disabled:opacity-50 ${
                            d.myVoteRank === rank
                              ? "bg-crayon-yellow text-ink shadow-doodle-sm -translate-y-0.5"
                              : "bg-white text-ink/70 hover:bg-crayon-yellow/40"
                          }`}
                        >
                          {MEDAL(rank)} #{rank}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
