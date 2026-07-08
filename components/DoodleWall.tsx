"use client";
import { useEffect, useRef, useState } from "react";

type WallDoodle = {
  id: string;
  imageData: string;
  prompt: string;
  name: string;
  department: string;
  createdAt: string;
};

const POLL_MS = 15000; // pull new submissions every 15 seconds
const SCROLL_PX_PER_SEC = 18; // vertical auto-scroll speed
const SCROLL_MIN_ITEMS = 4; // below this, show a static grid (no scroll, no duplicate)

export default function DoodleWall() {
  const [items, setItems] = useState<WallDoodle[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const seen = useRef<Set<string>>(new Set());
  const lastCreatedAt = useRef<string>(new Date(0).toISOString());
  const firstLoad = useRef(true);

  async function fetchWall() {
    try {
      const res = await fetch(`/api/wall?since=${encodeURIComponent(lastCreatedAt.current)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      setStatus(data.status);
      setOnline(true);
      const incoming: WallDoodle[] = data.doodles ?? [];
      const fresh = incoming.filter((d) => !seen.current.has(d.id));
      if (incoming.length) lastCreatedAt.current = incoming[incoming.length - 1].createdAt;
      if (fresh.length) {
        fresh.forEach((d) => seen.current.add(d.id));
        // Append to the END — new doodles slot in at the bottom of the scroll, never disrupting
        // whatever is currently on screen (the scroll offset is preserved across appends).
        setItems((prev) => [...prev, ...fresh]);
        if (!firstLoad.current) {
          const ids = fresh.map((d) => d.id);
          setNewIds((prev) => { const n = new Set(prev); ids.forEach((i) => n.add(i)); return n; });
          setTimeout(() => setNewIds((prev) => { const n = new Set(prev); ids.forEach((i) => n.delete(i)); return n; }), 40000);
        }
      }
      firstLoad.current = false;
    } catch {
      setOnline(false); // keep showing what we have; just flag the connection
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWall();
    const poll = setInterval(fetchWall, POLL_MS);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closed = status === "completed";
  const lightBg = {
    backgroundColor: "#fdf7e9",
    backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1.5px, transparent 1.5px)",
    backgroundSize: "26px 26px",
  } as const;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col text-ink" style={lightBg}>
      {/* Fixed heading + logo — tight so the title doesn't leave dead space below it */}
      <header className="shrink-0 flex items-center justify-between gap-4 px-8 py-2 border-b-[3px] border-ink bg-white">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="font-hand font-bold text-5xl xl:text-7xl leading-none whitespace-nowrap tracking-wide">
            <span className="text-crayon-purple" style={{ textShadow: "1px 0 currentColor, -1px 0 currentColor, 0 1px currentColor, 0 -1px currentColor, 3px 3px 0 rgba(43,43,58,0.22)" }}>THE DOODLE </span>
            <span className="text-crayon-pink" style={{ textShadow: "1px 0 currentColor, -1px 0 currentColor, 0 1px currentColor, 0 -1px currentColor, 3px 3px 0 rgba(43,43,58,0.22)" }}>SHOWDOWN!</span>
          </h1>
          <LiveBadge online={online} closed={closed} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/wiom-logo.png" alt="Wiom" className="h-6 xl:h-8 w-auto shrink-0" />
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* Main — doodles scroll smoothly down the list */}
        <main className="flex-1 min-h-0 p-5 overflow-hidden">
          {loading ? (
            <Centered emoji="🎨" text="Warming up the wall…" pulse />
          ) : items.length === 0 ? (
            <Centered emoji="🎨" text="Waiting for the first masterpiece… scan to be first!" />
          ) : (
            <ScrollGrid items={items} newIds={newIds} />
          )}
        </main>

        {/* Fixed QR sidebar */}
        <aside className="shrink-0 w-[300px] xl:w-[360px] border-l-[3px] border-ink bg-white flex flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <div className="font-hand font-bold text-4xl xl:text-5xl text-crayon-purple leading-tight">Scan now to Join</div>
            <div className="text-ink/40 text-lg mt-1">👇</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border-[3px] border-ink shadow-doodle wobble-l">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/doodle-qr.svg" alt="Scan to play" className="w-52 h-52 xl:w-60 xl:h-60" />
          </div>
          <div className="w-full rounded-lg border-[3px] border-ink text-ink px-5 py-4 text-center" style={{ backgroundColor: "#f2d97a" }}>
            <div className="font-body font-bold text-xl xl:text-2xl leading-snug">Deadline for submission and rating</div>
            <div className="font-hand font-bold text-6xl leading-none mt-2">6 PM</div>
          </div>
          <div className="w-full rounded-lg border-[3px] border-ink bg-crayon-green/70 text-ink px-4 py-3 text-center font-body font-bold text-lg xl:text-xl leading-snug">
            🎁 Top 3 doodles win goodies!
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScrollGrid({ items, newIds }: { items: WallDoodle[]; newIds: Set<string> }) {
  const scroll = items.length >= SCROLL_MIN_ITEMS;
  const trackRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const rafId = useRef(0);
  const lastT = useRef(0);
  const scrollRef = useRef(scroll);
  scrollRef.current = scroll;

  useEffect(() => {
    const step = (t: number) => {
      if (!lastT.current) lastT.current = t;
      const dt = (t - lastT.current) / 1000;
      lastT.current = t;
      if (scrollRef.current) {
        const h = blockRef.current?.offsetHeight ?? 0;
        if (h > 0) {
          offset.current += SCROLL_PX_PER_SEC * dt;
          if (offset.current >= h) offset.current -= h; // seamless loop (two identical blocks)
          if (trackRef.current) trackRef.current.style.transform = `translateY(${-offset.current}px)`;
        }
      } else if (offset.current !== 0) {
        // Below the threshold: sit still, reset to the top.
        offset.current = 0;
        if (trackRef.current) trackRef.current.style.transform = "translateY(0px)";
      }
      rafId.current = requestAnimationFrame(step);
    };
    rafId.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const Block = ({ measured }: { measured?: boolean }) => (
    <div
      ref={measured ? blockRef : undefined}
      aria-hidden={measured ? undefined : true}
      className="grid grid-cols-2 gap-5 auto-rows-[24rem] xl:auto-rows-[28rem] pb-5"
    >
      {items.map((d) => (
        <Tile key={`${measured ? "a" : "b"}-${d.id}`} d={d} isNew={newIds.has(d.id)} />
      ))}
    </div>
  );

  return (
    <div className="h-full overflow-hidden">
      {/* Static single grid until there are enough doodles to overflow; then a second
          identical block is added and it auto-scrolls (looping by one block height). */}
      <div ref={trackRef} className="will-change-transform">
        <Block measured />
        {scroll && <Block />}
      </div>
    </div>
  );
}

function Tile({ d, isNew }: { d: WallDoodle; isNew: boolean }) {
  return (
    <div className="card bg-white h-full flex flex-col overflow-hidden relative">
      {isNew && <div className="absolute top-2 right-2 z-10 chip bg-crayon-green text-xs wobble-r">✨ NEW</div>}
      <div className="flex-1 min-h-0 p-3 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={d.imageData} alt="Doodle" className="max-h-full max-w-full object-contain rounded-xl border-2 border-ink bg-white" />
      </div>
      <div className="shrink-0 px-4 py-2.5 border-t-[3px] border-ink">
        <div className="flex items-center justify-between gap-3">
          <div className="font-hand text-2xl xl:text-3xl text-ink leading-none truncate">{d.name}</div>
          <div className="text-sm text-ink/50 truncate shrink-0 max-w-[42%]">{d.department}</div>
        </div>
        <div className="mt-1.5 text-sm xl:text-base text-ink/80 truncate">
          <span className="text-ink/45">🎯 Prompt:</span> <span className="font-semibold">{d.prompt || "—"}</span>
        </div>
      </div>
    </div>
  );
}

function LiveBadge({ online, closed }: { online: boolean; closed: boolean }) {
  if (!online) {
    return (
      <span className="chip bg-white border-ink text-ink/60 flex items-center gap-2 shrink-0">
        <span className="w-3 h-3 rounded-full bg-ink/40 animate-pulse" /> Reconnecting…
      </span>
    );
  }
  if (closed) {
    return <span className="chip bg-crayon-orange border-ink text-ink shrink-0">🏆 Show closed — results in!</span>;
  }
  return (
    <span className="chip bg-crayon-red border-ink text-white flex items-center gap-2.5 shrink-0 animate-blink text-lg xl:text-2xl px-5 py-2 font-bold">
      <span className="w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full bg-white" /> LIVE
    </span>
  );
}

function Centered({ emoji, text, pulse }: { emoji: string; text: string; pulse?: boolean }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className={`text-8xl ${pulse ? "animate-pulse" : "animate-bounce"}`}>{emoji}</div>
        <p className="font-hand text-4xl text-ink/60">{text}</p>
      </div>
    </div>
  );
}
