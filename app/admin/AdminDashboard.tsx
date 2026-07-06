"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type Prompt = { id: string; phrase: string; isActive: boolean };

export default function AdminDashboard({
  event, stats, prompts,
}: {
  event: { id: string; status: string };
  stats: { employeeCount: number; promptCount: number; doodleCount: number };
  prompts: Prompt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [csvMsg, setCsvMsg] = useState("");
  const [showClose, setShowClose] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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
        <span className="px-3 py-1 bg-white/10 rounded-full text-sm capitalize">{event.status}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[["👥", stats.employeeCount, "Employees"], ["📝", stats.promptCount, "Prompts"], ["🎨", stats.doodleCount, "Submissions"]].map(([icon, val, label]) => (
          <div key={String(label)} className="card p-4 text-center space-y-1">
            <div className="text-2xl">{icon}</div>
            <div className="text-2xl font-black text-purple-400">{val}</div>
            <div className="text-xs text-white/40">{label}</div>
          </div>
        ))}
      </div>

      {/* Event controls */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-white/70">Event Control</h2>
        {event.status !== "completed" ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 font-semibold">Portal is OPEN</span>
              <span className="text-white/40">— participants can draw &amp; vote</span>
            </div>
            {!showClose ? (
              <button
                onClick={() => setShowClose(true)}
                disabled={busy}
                className="bg-white/10 hover:bg-red-700/40 border border-white/10 text-white/70 hover:text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Close event…
              </button>
            ) : (
              <div className="space-y-3 border border-red-500/40 bg-red-500/10 rounded-xl p-4">
                <p className="text-sm text-white/80">
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
              <span className="text-white/40">— showing results to everyone</span>
            </div>
            <Btn onClick={() => updateEvent("active")} busy={busy} color="green">↩ Reopen Portal</Btn>
          </>
        )}
      </div>

      {/* Employee upload */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-white/70">Employee List</h2>
        <p className="text-xs text-white/40">Upload Excel (.xlsx) or CSV file — columns required: <span className="text-white/60 font-mono">Name, Email, Department</span></p>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 rounded-xl p-6 cursor-pointer hover:border-purple-500/60 transition-colors">
          <span className="text-3xl">📂</span>
          <span className="text-sm text-white/60">{uploadFile ? uploadFile.name : "Click to choose file"}</span>
          <span className="text-xs text-white/30">.xlsx or .csv</span>
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
        <h2 className="font-bold text-white/70">Prompt Bank ({prompts.length}/30)</h2>
        <div className="flex gap-2">
          <input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} className="input" placeholder="Add a new prompt phrase..." onKeyDown={(e) => e.key === "Enter" && addPrompt()} />
          <button onClick={addPrompt} disabled={busy} className="btn-primary px-4 shrink-0">Add</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {prompts.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-white/30 text-xs font-mono w-5">{i + 1}</span>
              <span className="flex-1 text-sm">{p.phrase}</span>
              <button onClick={() => deletePrompt(p.id)} className="text-white/30 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>
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
