"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [csvText, setCsvText] = useState("");
  const [csvMsg, setCsvMsg] = useState("");

  async function updateEvent(status: string) {
    setBusy(true);
    await fetch("/api/admin/event", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
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

  async function uploadCsv() {
    setBusy(true);
    setCsvMsg("");
    const res = await fetch("/api/admin/employees/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: csvText }) });
    const data = await res.json();
    setCsvMsg(res.ok ? `✅ ${data.count} employees imported.` : `❌ ${data.error}`);
    router.refresh();
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
        <h2 className="font-bold text-white/70">Event Status</h2>
        <div className="flex flex-wrap gap-2">
          {event.status === "setup" && <Btn onClick={() => updateEvent("active")} busy={busy} color="green">▶ Go Live</Btn>}
          {event.status === "active" && <Btn onClick={() => updateEvent("closed")} busy={busy} color="red">⏹ Close Event</Btn>}
          {event.status === "closed" && <Btn onClick={() => updateEvent("completed")} busy={busy} color="amber">🏆 Show Results</Btn>}
        </div>
      </div>

      {/* Employee CSV upload */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-white/70">Employee List (CSV)</h2>
        <p className="text-xs text-white/40">Paste CSV with columns: Name, Email, Department (first row = header)</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="input font-mono text-xs h-32 resize-none"
          placeholder={"Name,Email,Department\nSneha Ghildiyal,sneha@wiom.in,Engineering"}
        />
        {csvMsg && <p className="text-sm">{csvMsg}</p>}
        <Btn onClick={uploadCsv} busy={busy} color="blue">Upload Employees</Btn>
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
