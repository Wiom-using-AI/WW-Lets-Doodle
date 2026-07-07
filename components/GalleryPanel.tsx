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
          <div className="text-4xl animate-pulse">🖼️</div>
          <p className="text-ink/50 text-sm font-body">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b-[3px] border-ink bg-white text-center">
        <h2 className="font-hand font-bold text-3xl md:text-4xl text-crayon-pink leading-tight">🎨 Doodle Gallery</h2>
        <p className="text-sm md:text-base text-ink font-body font-semibold mt-0.5">Browse everyone&apos;s doodles and rate your favourites! ⭐</p>
      </div>

      {/* How-to-vote banner (always visible) */}
      <div className="px-4 py-2.5 bg-crayon-yellow/40 border-b-[3px] border-ink text-xs text-ink/80 leading-relaxed font-body">
        🗳️ <b className="text-ink">How to vote:</b> pick your top 3 favourites — tap
        <span className="mx-0.5">🥇</span><b>#1</b>,
        <span className="mx-0.5">🥈</span><b>#2</b>,
        <span className="mx-0.5">🥉</span><b>#3</b>.
        You can&apos;t vote your own, and totals stay hidden until the winners are revealed.
      </div>

      {/* Doodles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {doodles.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-5xl">🎨</div>
            <p className="text-ink/50 font-body">No doodles yet. Be the first!</p>
          </div>
        ) : (
          doodles.map((d, idx) => {
            const isOwn = d.isOwn; // computed server-side against the logged-in employee
            return (
              <div key={d.id} className={`card overflow-hidden ${idx % 2 ? "wobble-r" : "wobble-l"}`}>
                {/* Employee info */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <div className="w-9 h-9 rounded-full bg-crayon-blue border-[3px] border-ink flex items-center justify-center text-sm font-hand font-bold text-ink shrink-0">
                    {d.employee.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate text-ink">{d.employee.name}</div>
                    <div className="text-xs text-ink/50">{d.employee.department}</div>
                  </div>
                  {d.voteCount > 0 && (
                    <div className="chip bg-crayon-yellow text-xs">★ {d.voteCount} pts</div>
                  )}
                </div>

                {/* Doodle image */}
                <div className="px-3">
                  <img src={d.imageData} alt="Doodle" className="w-full rounded-2xl border-2 border-ink bg-white" />
                </div>

                {/* Prompt + voting */}
                <div className="px-4 py-3 space-y-2">
                  <p className="text-sm text-ink/60 italic font-body">&quot;{d.prompt}&quot;</p>
                  {!isOwn && (
                    <div className="flex gap-2">
                      {[1, 2, 3].map((rank) => (
                        <button
                          key={rank}
                          onClick={() => castVote(d.id, rank)}
                          disabled={votingFor === d.id}
                          className={`flex-1 py-1.5 rounded-xl text-sm font-body font-bold transition-all border-2 border-ink ${
                            d.myVoteRank === rank
                              ? "bg-crayon-yellow text-ink shadow-doodle-sm -translate-y-0.5"
                              : "bg-white text-ink/70 hover:bg-crayon-yellow/40"
                          }`}
                        >
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"} #{rank}
                        </button>
                      ))}
                    </div>
                  )}
                  {isOwn && (
                    <p className="chip bg-crayon-green/60 text-xs w-full text-center">✏️ Your doodle</p>
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
