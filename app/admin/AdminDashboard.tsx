"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type Prompt = { id: string; phrase: string; isActive: boolean };
type Voter = { name: string; department: string; rank: number };
type LeaderboardEntry = {
  id: string;
  imageData: string;
  prompt: string;
  submitter: { name: string; department: string };
  points: number;
  voteCount: number;
  voters: Voter[];
};

type Row = Record<string, string | number>;

export default function AdminDashboard({
  event, stats, prompts, leaderboard, data,
}: {
  event: { id: string; status: string };
  stats: { employeeCount: number; promptCount: number; doodleCount: number };
  prompts: Prompt[];
  leaderboard: LeaderboardEntry[];
  data: { logins: Row[]; played: Row[]; voted: Row[] };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [csvMsg, setCsvMsg] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  async function updateEvent(status: string) {
    setBusy(true);
    await fetch("/api/admin/event", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setShowClose(false);
    setConfirmText("");
    router.refresh();
    setBusy(false);
  }

  async function addPrompt() {
    if (!newPrompt.trim()) return;
    setBusy(true);
    await fetch("/api/admin/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrase: newPrompt.trim() }) });
    setNewPrompt("");
    router.refresh();
    setBusy(false);
  }

  async function deletePrompt(id: string) {
    setBusy(true);
    await fetch("/api/admin/prompts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    router.refresh();
    setBusy(false);
  }

  async function addBulkPrompts() {
    const phrases = bulkPrompts.split("\n").map((p) => p.trim()).filter(Boolean);
    if (phrases.length === 0) return;
    setBusy(true);
    await fetch("/api/admin/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phrases }) });
    setBulkPrompts("");
    router.refresh();
    setBusy(false);
  }

  async function resetData() {
    setBusy(true);
    const res = await fetch("/api/admin/reset", { method: "POST" });
    const j = await res.json();
    setResetMsg(res.ok ? `✅ Cleared ${j.doodles} doodles, ${j.votes} votes, ${j.sessions} sessions.` : `❌ ${j.error}`);
    setShowReset(false);
    setResetText("");
    router.refresh();
    setBusy(false);
  }

  function downloadXlsx(rows: Row[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
  }

  async function uploadFile_() {
    if (!uploadFile) return;
    setBusy(true);
    setCsvMsg("");
    try {
      const buffer = await uploadFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<{ Name: string; Email: string; Department: string }>(ws, { defval: "" });
      const res = await fetch("/api/admin/employees/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setCsvMsg(res.ok ? `✅ ${data.count} employees imported.` : `❌ ${data.error}`);
      router.refresh();
    } catch {
      setCsvMsg("❌ Could not read file. Make sure columns are: Name, Email, Department.");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Admin</h1>
        <span className="px-3 py-1 bg-black/5 rounded-full text-sm capitalize">{event.status}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[["👥", stats.employeeCount, "Employees"], ["📝", stats.promptCount, "Prompts"], ["🎨", stats.doodleCount, "Submissions"]].map(([icon, val, label]) => (
          <div key={String(label)} className="card p-4 text-center space-y-1">
            <div className="text-2xl">{icon}</div>
            <div className="text-2xl font-black text-purple-400">{val}</div>
            <div className="text-xs text-ink/40">{label}</div>
          </div>
        ))}
      </div>

      {/* Event controls */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-ink/70">Event Control</h2>
        {event.status !== "completed" ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-semibold">Portal is OPEN</span>
              <span className="text-ink/40">— participants can draw &amp; vote</span>
            </div>
            {!showClose ? (
              <button
                onClick={() => setShowClose(true)}
                disabled={busy}
                className="bg-black/5 hover:bg-red-700/40 border border-ink/15 text-ink/70 hover:text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Close event…
              </button>
            ) : (
              <div className="space-y-3 border border-red-500/40 bg-red-500/10 rounded-xl p-4">
                <p className="text-sm text-ink/80">
                  This closes the portal for <b>everyone</b> and reveals the winners. Nothing is deleted — you can reopen anytime.
                  Type <span className="font-mono font-bold text-red-300">CLOSE</span> to confirm.
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input w-full"
                  placeholder="Type CLOSE"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowClose(false); setConfirmText(""); }} className="btn-secondary flex-1">Cancel</button>
                  <button
                    disabled={confirmText !== "CLOSE" || busy}
                    onClick={() => updateEvent("completed")}
                    className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm flex-1 transition-colors"
                  >
                    Close &amp; Show Winners
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-amber-400 font-semibold">Portal is CLOSED</span>
              <span className="text-ink/40">— showing results to everyone</span>
            </div>
            <Btn onClick={() => updateEvent("active")} busy={busy} color="green">↩ Reopen Portal</Btn>
          </>
        )}
      </div>

      {/* Leaderboard & votes (admin-only, always visible) */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-ink/70">Leaderboard &amp; Votes ({leaderboard.length} submissions)</h2>
        <p className="text-xs text-ink/40">Ranked by points (Rank 1 = 3 pts, Rank 2 = 2, Rank 3 = 1). Click any row to see who voted.</p>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-ink/40 py-4 text-center">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((d, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
              const isOpen = expanded === d.id;
              return (
                <div key={d.id} className="bg-black/5 rounded-xl overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : d.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/5 transition-colors">
                    <span className="w-8 text-center font-black text-lg shrink-0">{medal}</span>
                    <img src={d.imageData} alt="" className="w-12 h-12 rounded-lg object-cover bg-white shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{d.submitter.name}</div>
                      <div className="text-xs text-ink/40 truncate">{d.submitter.department} · {d.prompt}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-purple-400">{d.points} pts</div>
                      <div className="text-xs text-ink/40">{d.voteCount} vote{d.voteCount !== 1 ? "s" : ""}</div>
                    </div>
                    <span className="text-ink/30 text-xs shrink-0">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 space-y-1 border-t border-ink/10">
                      {d.voters.length === 0 ? (
                        <p className="text-xs text-ink/40 py-1">No votes yet.</p>
                      ) : d.voters.map((v, j) => (
                        <div key={j} className="flex items-center justify-between text-xs py-0.5">
                          <span className="text-ink/70">{v.name} <span className="text-ink/30">· {v.department}</span></span>
                          <span className="font-mono px-2 py-0.5 rounded bg-black/5">Rank {v.rank} (+{4 - v.rank})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data & exports */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-ink/70">Data &amp; Exports</h2>
        <p className="text-xs text-ink/40">For your records — download as Excel. (Submissions are viewable in the leaderboard above.)</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {([["👤 Logged in", data.logins, "logins.xlsx"], ["🎨 Played", data.played, "played.xlsx"], ["🗳️ Voted", data.voted, "voted.xlsx"]] as [string, Row[], string][]).map(([title, rows, file]) => (
            <div key={title} className="bg-black/5 rounded-xl p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-sm text-ink">{title}</span>
                <span className="text-2xl font-hand font-bold text-crayon-purple">{rows.length}</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-0.5">
                {rows.length === 0 ? <p className="text-xs text-ink/40">None yet.</p> :
                  rows.map((r, i) => (
                    <div key={i} className="text-xs text-ink/70 truncate">
                      {String(r.Name)}
                      {r.Votes !== undefined ? ` · ${r.Votes} votes` : ""}
                      {r.Submitted !== undefined ? ` · ${r.Submitted === "Yes" ? "submitted" : "in progress"}` : ""}
                    </div>
                  ))}
              </div>
              <button onClick={() => downloadXlsx(rows, file)} disabled={rows.length === 0} className="btn-secondary text-xs w-full disabled:opacity-40">⬇ Download Excel</button>
            </div>
          ))}
        </div>
      </div>

      {/* Employee upload */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-ink/70">Employee List</h2>
        <p className="text-xs text-ink/40">Upload Excel (.xlsx) or CSV file — columns required: <span className="text-ink/60 font-mono">Name, Email, Department</span></p>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink/25 rounded-xl p-6 cursor-pointer hover:border-purple-500/60 transition-colors">
          <span className="text-3xl">📂</span>
          <span className="text-sm text-ink/60">{uploadFile ? uploadFile.name : "Click to choose file"}</span>
          <span className="text-xs text-ink/30">.xlsx or .csv</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { setUploadFile(e.target.files?.[0] ?? null); setCsvMsg(""); }}
          />
        </label>
        {csvMsg && <p className="text-sm">{csvMsg}</p>}
        <Btn onClick={uploadFile_} busy={busy || !uploadFile} color="blue">Upload Employees</Btn>
      </div>

      {/* Prompts */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-ink/70">Prompt Bank ({prompts.length}/30)</h2>
        <div className="flex gap-2">
          <input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} className="input" placeholder="Add a new prompt phrase..." onKeyDown={(e) => e.key === "Enter" && addPrompt()} />
          <button onClick={addPrompt} disabled={busy} className="btn-primary px-4 shrink-0">Add</button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-ink/50 hover:text-ink/70">+ Add many at once (paste, one per line)</summary>
          <div className="mt-2 space-y-2">
            <textarea
              value={bulkPrompts}
              onChange={(e) => setBulkPrompts(e.target.value)}
              className="input h-32 resize-none w-full text-sm"
              placeholder={"A penguin on a desert island\nMonday morning feeling\nYour boss as a superhero"}
            />
            <button onClick={addBulkPrompts} disabled={busy || !bulkPrompts.trim()} className="btn-secondary text-sm">
              Add {bulkPrompts.split("\n").map((p) => p.trim()).filter(Boolean).length || ""} prompts
            </button>
          </div>
        </details>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {prompts.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 bg-black/5 rounded-lg px-3 py-2">
              <span className="text-ink/30 text-xs font-mono w-5">{i + 1}</span>
              <span className="flex-1 text-sm">{p.phrase}</span>
              <button onClick={() => deletePrompt(p.id)} className="text-ink/30 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone — reset data before the real event */}
      <div className="card p-5 space-y-3 border border-red-500/20">
        <h2 className="font-bold text-red-400/80">Reset Data</h2>
        <p className="text-xs text-ink/40">
          Deletes ALL doodles, votes, and game sessions so the event starts clean. Keeps employees and prompts. Use this before going live to wipe test data.
        </p>
        {resetMsg && <p className="text-sm">{resetMsg}</p>}
        {!showReset ? (
          <button onClick={() => { setShowReset(true); setResetMsg(""); }} disabled={busy} className="bg-black/5 hover:bg-red-700/40 border border-ink/15 text-ink/70 hover:text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
            Reset all gameplay data…
          </button>
        ) : (
          <div className="space-y-3 border border-red-500/40 bg-red-500/10 rounded-xl p-4">
            <p className="text-sm text-ink/80">
              This <b>permanently deletes</b> every doodle, vote, and session. Type <span className="font-mono font-bold text-red-300">RESET</span> to confirm.
            </p>
            <input value={resetText} onChange={(e) => setResetText(e.target.value)} className="input w-full" placeholder="Type RESET" />
            <div className="flex gap-2">
              <button onClick={() => { setShowReset(false); setResetText(""); }} className="btn-secondary flex-1">Cancel</button>
              <button disabled={resetText !== "RESET" || busy} onClick={resetData} className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm flex-1 transition-colors">
                Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({ children, onClick, busy, color }: { children: React.ReactNode; onClick: () => void; busy: boolean; color: string }) {
  const colors: Record<string, string> = { green: "bg-green-600 hover:bg-green-500", red: "bg-red-700 hover:bg-red-600", amber: "bg-amber-500 hover:bg-amber-400 text-black", blue: "bg-blue-600 hover:bg-blue-500" };
  return (
    <button onClick={onClick} disabled={busy} className={`${colors[color]} disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors`}>
      {children}
    </button>
  );
}
