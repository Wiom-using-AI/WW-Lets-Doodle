"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const router = useRouter();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    if (data.devOtp) { setOtp(data.devOtp); setDevMode(true); }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/admin/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🔐</div>
          <h1 className="text-3xl font-hand font-bold text-crayon-purple">Admin Access</h1>
        </div>
        {step === "email" ? (
          <form onSubmit={sendOtp} className="card p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-ink">Admin email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="sneha.ghildiyal@wiom.in" />
            </div>
            {error && <p className="text-crayon-red font-semibold text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Sending…" : "Send code to Slack →"}</button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="card p-6 space-y-4">
            {devMode
              ? <p className="text-ink text-xs font-mono bg-crayon-yellow rounded-lg px-2 py-1 border-2 border-ink inline-block">🛠 DEV MODE — code auto-filled</p>
              : <p className="text-ink/60 text-sm">Check your Slack DMs for a 6-digit code.</p>}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-ink">Enter code</label>
              <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="input text-center text-2xl font-hand tracking-[0.4em]" placeholder="123456" />
            </div>
            {error && <p className="text-crayon-red font-semibold text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Checking…" : "Log in →"}</button>
            <button type="button" onClick={() => { setStep("email"); setError(""); setOtp(""); }} className="text-ink/50 hover:text-ink text-sm text-center w-full underline">← Use a different email</button>
          </form>
        )}
      </div>
    </div>
  );
}
