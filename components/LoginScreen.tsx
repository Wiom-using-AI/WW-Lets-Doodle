"use client";
import { useState } from "react";

export default function LoginScreen() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setName(data.name);
    if (data.devOtp) { setOtp(data.devOtp); setDevMode(true); }
    setStep("otp");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <div className="space-y-3">
          <div className="text-7xl">🎨</div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            WW Let&apos;s Doodle
          </h1>
          <p className="text-white/60 text-lg">Wiom Wednesday Activity &mdash; Draw. Vote. Win.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {["3 Surprise Prompts", "2 Min Per Doodle", "Vote for the Best", "Top 3 Win Goodies"].map((t) => (
            <span key={t} className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70 border border-white/10">{t}</span>
          ))}
        </div>

        <div className="card p-6 space-y-5 text-left">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-white/60 text-sm">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@wiom.in"
                  className="input w-full"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending..." : "Send OTP on Slack →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1 text-center">
                <p className="text-white/80 font-semibold">Hi {name}! 👋</p>
                {devMode
                  ? <p className="text-yellow-400 text-xs font-mono bg-yellow-400/10 rounded px-2 py-1">🛠 DEV MODE — OTP auto-filled</p>
                  : <p className="text-white/50 text-sm">Check your Slack DMs for a 6-digit code</p>
                }
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-sm">Enter OTP</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="input w-full text-center text-2xl tracking-widest"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Verifying..." : "Login →"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setError(""); setOtp(""); }} className="btn-secondary w-full text-sm">
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-white/30 text-xs">Only Wiom employees can access this portal</p>
      </div>
    </div>
  );
}
