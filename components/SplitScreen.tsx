"use client";
import { useState } from "react";
import PlaygroundPanel from "./PlaygroundPanel";
import GalleryPanel from "./GalleryPanel";

type Employee = { id: string; name: string; department: string; email: string };

export default function SplitScreen({ employee }: { employee: Employee }) {
  // Playground is the fixed main view. Gallery opens as a full-screen popup so its length
  // never affects the playground layout.
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Top bar — Wiom logo left, title centred, user right */}
      <header className="relative flex items-center justify-between px-4 sm:px-6 py-3 border-b-[3px] border-ink bg-white shrink-0">
        <div className="flex items-center shrink-0 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wiom-logo.png" alt="Wiom" className="h-6 sm:h-8 w-auto" />
        </div>

        <div className="absolute inset-x-0 flex justify-center pointer-events-none px-2">
          <span className="font-hand font-bold text-3xl sm:text-4xl text-crayon-purple leading-none whitespace-nowrap">
            Let&apos;s Doodle <span className="text-crayon-pink">It!</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <div className="text-right hidden md:block leading-tight">
            <div className="text-sm font-bold text-ink">{employee.name}</div>
            <div className="text-xs text-ink/50">{employee.department}</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-crayon-yellow border-[3px] border-ink flex items-center justify-center font-hand font-bold text-base sm:text-lg text-ink shrink-0">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <a href="/api/auth/logout" title="Log out" className="text-ink/40 hover:text-crayon-red text-xs font-body underline shrink-0 hidden sm:inline">Log out</a>
        </div>
      </header>

      {/* Tabs — Playground stays put; Gallery opens the full-screen popup */}
      <div className="flex border-b-[3px] border-ink bg-white shrink-0">
        <button
          onClick={() => setGalleryOpen(false)}
          className={`flex-1 py-2.5 flex justify-center transition-colors ${!galleryOpen ? "border-b-4 border-crayon-purple" : "border-b-4 border-transparent"}`}
        >
          <span className={`inline-flex items-center gap-1.5 font-hand font-bold text-base sm:text-lg whitespace-nowrap px-3 py-1 rounded-xl border-2 transition-all ${!galleryOpen ? "bg-crayon-purple text-white border-ink shadow-doodle-sm" : "bg-crayon-yellow text-ink border-ink/70"}`}>
            🖌 Playground
          </span>
        </button>
        <button
          onClick={() => setGalleryOpen(true)}
          className={`flex-1 py-2.5 flex justify-center transition-colors ${galleryOpen ? "border-b-4 border-crayon-pink" : "border-b-4 border-transparent"}`}
        >
          <span className={`inline-flex items-center gap-1.5 font-hand font-bold text-base sm:text-lg whitespace-nowrap px-3 py-1 rounded-xl border-2 transition-all ${galleryOpen ? "bg-crayon-pink text-white border-ink shadow-doodle-sm" : "bg-crayon-yellow text-ink border-ink/70"}`}>
            🖼 Submission Gallery
          </span>
        </button>
      </div>

      {/* Playground — always fills exactly the remaining viewport (never pushed by the gallery) */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PlaygroundPanel employee={employee} />
      </div>

      {/* Gallery — full-screen popup */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 bg-paper flex flex-col">
          <button
            onClick={() => setGalleryOpen(false)}
            title="Close gallery"
            className="absolute top-2.5 right-3 sm:top-3.5 sm:right-5 z-30 w-10 h-10 rounded-full bg-white border-[3px] border-ink shadow-doodle-sm flex items-center justify-center text-lg font-bold hover:-translate-y-0.5 transition-transform"
          >
            ✕
          </button>
          <GalleryPanel employeeId={employee.id} />
        </div>
      )}
    </div>
  );
}
