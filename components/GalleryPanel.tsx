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

export default function GalleryPanel({ employeeId }: { employeeId: string }) {
  const [doodles, setDoodles] = useState<Doodle[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  async function fetchDoodles() {
    const res = await fetch("/api/gallery");
    if (res.ok) {
      const data = await res.json();
      setDoodles(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDoodles();
    const interval = setInterval(fetchDoodles, 30000); // sync every 30s
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
          <div className="text-3xl animate-pulse">🖼️</div>
          <p className="text-white/40 text-sm">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg text-white">Gallery</h2>
          <p className="text-xs text-white/40">{doodles.length} doodles · syncs every 30s</p>
        </div>
        <button onClick={fetchDoodles} className="text-xs text-white/40 hover:text-white/70 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* How-to-vote banner (always visible) */}
      <div className="px-4 py-2.5 bg-purple-500/10 border-b border-white/10 text-xs text-white/60 leading-relaxed">
        🗳️ <b className="text-white/80">How to vote:</b> pick your top 3 favourites — tap
        <span className="mx-0.5">🥇</span><b>#1</b>,
        <span className="mx-0.5">🥈</span><b>#2</b>,
        <span className="mx-0.5">🥉</span><b>#3</b>.
        You can&apos;t vote your own, and totals stay hidden until the winners are revealed.
      </div>

      {/* Doodles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {doodles.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">🎨</div>
            <p className="text-white/40">No doodles yet. Be the first!</p>
          </div>
        ) : (
          doodles.map((d) => {
            const isOwn = d.isOwn; // computed server-side against the logged-in employee
            return (
              <div key={d.id} className="card overflow-hidden">
                {/* Employee info */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                    {d.employee.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{d.employee.name}</div>
                    <div className="text-xs text-white/40">{d.employee.department}</div>
                  </div>
                  {d.voteCount > 0 && (
                    <div className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">
                      ★ {d.voteCount} pts
                    </div>
                  )}
                </div>

                {/* Doodle image */}
                <img src={d.imageData} alt="Doodle" className="w-full" />

                {/* Prompt + voting */}
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs text-white/40 italic">&quot;{d.prompt}&quot;</p>
                  {!isOwn && (
                    <div className="flex gap-2">
                      {[1, 2, 3].map((rank) => (
                        <button
                          key={rank}
                          onClick={() => castVote(d.id, rank)}
                          disabled={votingFor === d.id}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            d.myVoteRank === rank
                              ? "bg-amber-500 border-amber-500 text-black"
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"} #{rank}
                        </button>
                      ))}
                    </div>
                  )}
                  {isOwn && (
                    <p className="text-xs text-white/30 text-center">Your doodle</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
