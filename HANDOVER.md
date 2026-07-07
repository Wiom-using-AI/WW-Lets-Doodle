# Let's Doodle It! — Project Handover / Status

_Last updated: after the mobile-UX rework (Playground fills viewport, Gallery popup, top toolbar ribbon)._
_Regenerate this file after each major milestone (see CLAUDE.md)._

## What this is
A one-day Wiom Wednesday activity. Employees log in with their work email (OTP via Slack DM),
draw 3 surprise prompts (5 min each) on a whiteboard, submit their best, then vote for the top 3
in a gallery. Winners (top 3 by points) get goodies.

## Live URLs
- **Share with employees → Cloudflare proxy:** https://lets-doodle-it.wiom-wellness.workers.dev
- **Railway origin (backend):** https://ww-lets-doodle-production.up.railway.app
- **Admin:** add `/admin` to either URL (OTP login, restricted to sneha.ghildiyal@wiom.in)
- Repo: https://github.com/Wiom-using-AI/WW-Lets-Doodle · Local: C:\Users\Wiom\WW-Lets-Doodle

## Tech stack
Next.js 14.2.35 (App Router) · PostgreSQL + Prisma on Railway · Tailwind (doodle theme) ·
Cloudflare Worker reverse-proxy (in `cloudflare-worker/`) · Slack Web API for OTP DMs.

---

## ✅ Implemented
- **Auth:** employee login = email → 6-digit OTP sent to their Slack DM → verify. Matches against
  uploaded employee list. Admin login = same OTP flow but restricted to the admin email. Logout clears cookie.
- **Login tracking:** `Employee.loggedInAt` set on first login.
- **Drawing whiteboard ("Let's Doodle It!"):** dot-grid guide, transparent canvas, 2× supersample
  (sharp zoom), zoom + pan (buttons, wheel, pinch, hand tool), colour palette with 8 hues × 6 shades,
  brush sizes (incl. fine tip), eraser (with cursor), undo/redo, clear. Sheet bounded to max-w-3xl so
  saved images are ~50KB (not multi-MB). Mobile = toolbar ribbon on top; desktop = right rail.
- **Server-authoritative timer:** 5 min/try anchored to `GameSession.tryStartedAt`; closing/reopening
  the tab can't pause or reset it. Autosave (throttled) + full resume (survives refresh/incognito/other device).
- **Game flow:** 3 prompts, draw each → "Next prompt" (reroll) or "Finalise this one" (submit directly)
  or "Compare all N & pick the best" (once ≥2 drawn). Each drawn try is saved so you can pick any.
- **Gallery (full-screen popup):** opens on tab tap; responsive grid (3/2/1 cols); vote top-3 with medals;
  tapping a medal moves it (freeing it from its old doodle), tapping the same medal again removes it;
  "Your top 3" summary bar always visible; self-vote blocked; counts hidden until event closed.
- **Layout:** Playground fills the viewport (never affected by gallery length); Gallery is a full-screen
  overlay. Wiom logo top-left (header) / top-right (login). Fully responsive (mobile + laptop).
- **Admin portal (`/admin`):** event control (manual — see decisions), employee CSV/XLSX upload,
  prompt bank (single add + bulk paste), leaderboard with per-doodle voter breakdown, **Data & Exports**
  (Logged-in / Played / Voted lists, each downloadable as Excel), **Reset Data** (wipe all, type-to-confirm),
  and **per-employee submission removal** (in the leaderboard → expand a row → "Remove … submission — let them play again";
  deletes that employee's session + doodles + votes on them, keeps the employee so they can redraw).
- **Results screen:** shown when the event is closed (status `completed`) — top 3 winners + all submissions.
- **Deployment:** via Railway CLI `railway up` (see CLAUDE.md). Cloudflare proxy fronts it.
- **QR poster:** printable poster artifact + `Desktop\doodle-qr.png/.svg` encoding the proxy URL.

## 🕒 Pending / before the real event
- **Add ~20–30 prompts.** Only **3** exist, so everyone currently draws the same three. Paste a list
  via admin → Prompt Bank → "Add many at once".
- **Clear all test data** via admin → **Reset Data** just before going live (there are leftover test
  sessions, e.g. garima/shivani, from verification).
- **Announce the link** (proxy URL) when ready; **close the event at 6 PM** on show day (admin, or ask Claude).
- **Pre-launch dry run** on the day with a few real employees.
- Optional: **custom domain** (e.g. doodle.wiom.in on Cloudflare) if `workers.dev` is blocked on any network.

## 🧭 Important decisions
- **OTP-over-Slack for login** (not Slack OAuth) — simpler, works for all employees; admin uses the same, email-gated.
- **Event control is 100% manual / status-driven, NOT time-based** — Railway runs in UTC, so `getHours()`
  fired at the wrong IST time. `active`/`setup` = open; `completed` = closed + results. Closing requires
  typing "CLOSE"; a "Reopen" button recovers instantly. Nothing auto-triggers.
- **Cloudflare Worker reverse-proxy** — some phones/networks block `*.up.railway.app`; the proxy on a
  different domain fixes reachability. Transparent forward (pages, assets, /api, cookies).
- **Bounded canvas (max-w-3xl, ~50KB images)** — full-width canvas produced multi-MB images that hung
  submit/finalize and broke resume. Bounding fixed it.
- **Gallery as a full-screen popup** — decouples gallery length from the Playground layout.
- **Images stored as base64 in Postgres** (bounded, so acceptable). Cloudinary was considered but not needed now.
- **No backend data deletion** — Claude never wipes gameplay data via scripts; admin → Reset Data only. (Memory: ww-doodle-no-backend-data-deletion)

## ⚠️ Known issues / notes
- **Prompt count = 3** (see Pending) — main thing to fix before launch.
- **Leftover test sessions** in the DB from verification runs — clear via admin Reset Data.
- **`workers.dev` may be blocked on very strict networks** — custom domain is the fallback.
- Admin login sends a **real Slack DM** to the admin email each time.
- Base64 images live in the DB; fine at this scale but not ideal for very large events.
- Redeploys are data-safe (`prisma db push` is non-destructive); only admin Reset Data / schema changes wipe.

## Credentials (local only, in C:\credentials\.env)
`RAILWAY_TOKEN` (project token) · `SLACK_BOT_TOKEN` · `CLOUDFLARE_API_TOKEN`. Never commit these.
Admin app password is legacy/unused (login is OTP now).
