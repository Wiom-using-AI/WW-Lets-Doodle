"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Wrong password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🔐</div>
          <h1 className="text-3xl font-hand font-bold text-crayon-purple">Admin Access</h1>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Admin password" />
          </div>
          {error && <p className="text-crayon-red font-semibold text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
