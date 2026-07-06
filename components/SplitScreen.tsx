"use client";
import { useState } from "react";
import PlaygroundPanel from "./PlaygroundPanel";
import GalleryPanel from "./GalleryPanel";

type Employee = { id: string; name: string; department: string; email: string };

export default function SplitScreen({ employee }: { employee: Employee }) {
  const [view, setView] = useState<"split" | "play" | "gallery">("split");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎨</span>
          <span className="font-black text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            WW Let&apos;s Doodle
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{employee.name}</div>
            <div className="text-xs text-white/50">{employee.department}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            {employee.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Mobile tab switcher */}
      <div className="flex md:hidden border-b border-white/10">
        <button
          onClick={() => setView("play")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${view !== "gallery" ? "text-purple-400 border-b-2 border-purple-400" : "text-white/40"}`}
        >
          🖌 Playground
        </button>
        <button
          onClick={() => setView("gallery")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${view === "gallery" ? "text-pink-400 border-b-2 border-pink-400" : "text-white/40"}`}
        >
          🖼 Gallery
        </button>
      </div>

      {/* Split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Playground */}
        <div className={`${view === "gallery" ? "hidden" : "flex"} md:flex flex-col md:w-1/2 w-full border-r border-white/10`}>
          <PlaygroundPanel employee={employee} />
        </div>
        {/* Gallery */}
        <div className={`${view !== "gallery" && view !== "split" ? "hidden" : "flex"} md:flex flex-col md:w-1/2 w-full`}>
          <GalleryPanel employeeId={employee.id} />
        </div>
      </div>
    </div>
  );
}
