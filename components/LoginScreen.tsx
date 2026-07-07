"use client";
import { useState } from "react";

const CHIP_COLORS = ["bg-crayon-yellow", "bg-crayon-green", "bg-crayon-blue", "bg-crayon-pink"];

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

  const titleColors = ["text-crayon-purple", "text-crayon-pink", "text-crayon-blue", "text-crayon-orange", "text-crayon-green"];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Wiom logo — upper right */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wiom-logo.png" alt="Wiom" className="absolute top-5 right-6 h-7 sm:h-9 w-auto z-20" />

      {/* scattered doodle decorations (desktop only — avoid overlapping the title on phones) */}
      <div className="pointer-events-none absolute inset-0 select-none hidden sm:block">
        <span className="absolute top-[12%] left-[10%] text-4xl wobble-l">✏️</span>
        <span className="absolute top-[20%] right-[12%] text-5xl wobble-r">⭐</span>
        <span className="absolute bottom-[16%] left-[14%] text-5xl wobble-r">🖍️</span>
        <span className="absolute bottom-[22%] right-[10%] text-4xl wobble-l">🌈</span>
        <span className="absolute top-[45%] left-[6%] text-3xl">〰️</span>
      </div>

      <div className="text-center space-y-7 max-w-md w-full relative z-10">
        <div className="space-y-3">
          <div className="text-7xl inline-block wobble-l">🎨</div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-hand font-bold leading-none whitespace-nowrap">
            {"Let's Doodle It!".split("").map((c, i) => (
              <span key={i} className={titleColors[i % titleColors.length]}>{c === " " ? " " : c}</span>
            ))}
          </h1>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {["3 Surprise Prompts", "5 Min Per Doodle", "Vote for the Best", "Top 3 Win Goodies"].map((t, i) => (
            <span key={t} className={`chip ${CHIP_COLORS[i % CHIP_COLORS.length]} ${i % 2 ? "wobble-r" : "wobble-l"}`}>{t}</span>
          ))}
        </div>

        <div className="card p-6 space-y-5 text-left">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-ink font-semibold text-sm">Work Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@wiom.in" className="input" />
              </div>
              {error && <p className="text-crayon-red font-semibold text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full text-lg">
                {loading ? "Sending..." : "Send my code ✏️"}
              </button>
              <p className="text-ink/50 text-xs text-center">We&apos;ll send a login code to your Slack DMs</p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1 text-center">
                <p className="text-ink font-bold text-lg">Hi {name}! 👋</p>
                {devMode
                  ? <p className="text-ink text-xs font-mono bg-crayon-yellow rounded-lg px-2 py-1 border-2 border-ink inline-block">🛠 DEV MODE — code auto-filled</p>
                  : (
                    <div className="bg-crayon-purple/15 border-[3px] border-crayon-purple rounded-2xl px-4 py-3 text-center shadow-doodle-sm">
                      <p className="font-body font-bold text-ink text-base">📩 Check your <span className="text-crayon-purple">Slack DMs</span></p>
                      <p className="text-ink/70 text-xs mt-0.5">We just sent your 6-digit code there</p>
                    </div>
                  )}
              </div>
              <div className="space-y-1.5">
                <label className="text-ink font-semibold text-sm">Enter your code</label>
                <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} className="input text-center text-3xl font-hand tracking-[0.4em]" />
              </div>
              {error && <p className="text-crayon-red font-semibold text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full text-lg">
                {loading ? "Checking..." : "Let's go! 🚀"}
              </button>
              <button type="button" onClick={() => { setStep("email"); setError(""); setOtp(""); }} className="text-ink/50 hover:text-ink text-sm text-center w-full underline">
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-ink/40 text-xs">Only Wiom employees can access this portal</p>
      </div>
    </div>
  );
}
