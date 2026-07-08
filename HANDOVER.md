# Let's Doodle It! — Project Handover / Status

_Last updated: launch-day polish — TV wall tuned (2-per-row, static <4 → scroll ≥4, mustard deadline box,
goodies callout, bolder title), login "7 Min" chip fix, launch-burst transaction hardening, topic stored
on each doodle. Plus: 7-min timer, 15-sec think window, "Submission Gallery" rename, undo/redo-after-erase fix._
_Regenerate this file after each major milestone (see CLAUDE.md)._

## What this is
A one-day Wiom Wednesday activity. Employees log in with their work email (OTP via Slack DM),
draw 3 surprise prompts (7 min each) on a whiteboard, submit their best, then vote for the top 3
in a gallery. Winners (top 3 by points) get goodies.

## Live URLs
- **Share with employees → Cloudflare proxy:** https://lets-doodle-it.wiom-wellness.workers.dev
- **Railway origin (backend):** https://ww-lets-doodle-production.up.railway.app
- **Admin:** add `/admin` to either URL (OTP login, restricted to sneha.ghildiyal@wiom.in)
- **Live TV wall ("The Doodle Showdown!"):** add `/wall` to either URL — public, no login. Open fullscreen on office TVs.
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
- **15-sec think window:** when a prompt is revealed, a highlighted ticking 15s "get creative" countdown
  runs, then auto-starts drawing (anchors the server timer). Client-only; server timer starts on "start".
- **Server-authoritative timer:** 7 min/try anchored to `GameSession.tryStartedAt`; closing/reopening
  the tab can't pause or reset it. Autosave (throttled) + full resume (survives refresh/incognito/other device).
- **Game flow:** 3 prompts, draw each → "Next prompt" (reroll) or "Finalise this one" (submit directly)
  or "Compare all N & pick the best" (once ≥2 drawn). Each drawn try is saved so you can pick any.
- **Prompt assignment (`api/game/session` POST):** each employee gets 3 prompts chosen **least-used-first**
  (every prompt is handed out once before any repeats — even spread across the bank), with a **≤1-shared
  guarantee** (no two employees ever share more than 1 prompt; enforced by never reusing a prompt *pair*).
  A Postgres advisory lock serializes concurrent logins so simultaneous starts can't collide. The ≤1-shared
  rule is guaranteed up to ⌊n(n-1)/6⌋ employees for an n-prompt bank (**100 for the current 25**); beyond
  that it falls back to least-used and allows overlap. Counts/pairs derive from existing sessions (no schema
  change), so **Reset Data** resets the balancing for the real event. Runs in an interactive transaction with
  raised `maxWait`/`timeout` (10s/20s) so a launch burst (213 employees) queues cleanly instead of erroring.
- **Submission Gallery (full-screen popup):** opens on tab tap; responsive grid (3/2/1 cols); vote top-3
  with medals; tapping a medal moves it (freeing it from its old doodle), tapping the same medal again
  removes it; "Your top 3" summary bar always visible; self-vote blocked; counts hidden until event closed.
- **Tabs:** "Playground" / "Submission Gallery" — active tab is a solid colour "sticker" pill (white text),
  inactive is a yellow-highlighted dark label; both high-contrast for visibility.
- **Layout:** Playground fills the viewport (never affected by gallery length); Gallery is a full-screen
  overlay. Wiom logo top-left (header) / top-right (login). Fully responsive (mobile + laptop). On mobile
  the drawing screen's duplicate "Let's Doodle It!" title is hidden (top header already shows it).
- **Admin portal (`/admin`):** event control (manual — see decisions), employee CSV/XLSX upload,
  prompt bank (single add + bulk paste), leaderboard with per-doodle voter breakdown, **Data & Exports**
  (Logged-in / Played / Voted lists, each downloadable as Excel), **Reset Data** (wipe all, type-to-confirm),
  and **per-employee submission removal** (in the leaderboard → expand a row → "Remove … submission — let them play again";
  deletes that employee's session + doodles + votes on them, keeps the employee so they can redraw).
  **Submissions export** (in Data & Exports): "⬇ Excel (name · dept · prompt · points)" and "⬇ Doodles gallery
  (HTML with images)" — a self-contained HTML file of every doodle + drawer name/dept/prompt/points. Admin-only,
  works after the event closes (the /admin page is gated only by admin login, not event status).
- **Results screen:** shown when the event is closed (status `completed`) — top 3 winners + all submissions.
- **Live TV wall (`/wall`):** public, no-login office-TV display, **light mode**. Extra-bold "THE DOODLE
  SHOWDOWN!" heading (top-left) + big **blinking LIVE** badge + Wiom logo (top-right) + fixed QR sidebar.
  Doodles show **2 per row**; **static grid until ≥4 submissions** (`SCROLL_MIN_ITEMS`), then **auto-scrolls
  vertically** (requestAnimationFrame in `ScrollGrid`, ~18px/s; two identical stacked blocks → seamless loop,
  second block only rendered while scrolling so few doodles never appear duplicated). Each tile shows the
  drawer's name, dept, and **🎯 Prompt** line. Polls `/api/wall?since=<ISO>` every 15s (incremental — only new
  submissions, appended to the END so the scroll offset is preserved and nothing on screen jumps). LIVE /
  Reconnecting / Show-closed badge, "✨ NEW" tag on fresh arrivals, 🎨 palette empty-state. Sidebar: bold "Scan
  now to Join" + QR (`public/doodle-qr.svg`) + mustard "Deadline for submission and rating: 6 PM" box + green
  "🎁 Top 3 doodles win goodies!" callout (deadline/goodies copy is static in `DoodleWall.tsx`).
- **Topic is stored on each doodle** (`Doodle.promptPhrase`, set at draw/finalize time) so the topic shows
  even if that prompt is later edited/deleted from the bank. Wall + gallery prefer it, falling back to the
  live prompt map for old rows. (The 3 pre-existing test submissions drawn on the now-deleted original prompts
  show a blank topic — unrecoverable; cleared by Reset Data.)
- **Deployment:** via Railway CLI `railway up` (see CLAUDE.md). Cloudflare proxy fronts it.
- **QR poster:** printable poster artifact + `Desktop\doodle-qr.png/.svg` encoding the proxy URL.

## 🕒 Pending / before the real event
- **Prompt bank = 25** (loaded 2026-07-07). Enough for the ≤1-shared guarantee up to **100 employees**;
  if more will participate, grow the bank (≈36 prompts → 210, ≈45 → 330).
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
- **Prompt count = 25** — ≤1-shared guarantee holds to 100 employees; grow the bank if more will play.
- **Leftover test sessions** in the DB from verification runs — clear via admin Reset Data.
- **`workers.dev` may be blocked on very strict networks** — custom domain is the fallback.
- Admin login sends a **real Slack DM** to the admin email each time.
- Base64 images live in the DB; fine at this scale but not ideal for very large events.
- Redeploys are data-safe (`prisma db push` is non-destructive); only admin Reset Data / schema changes wipe.

### Recent fixes (2026-07-07/08)
- **Undo/redo after erasing** — `restore()` now forces `source-over` before repaint; the eraser used to
  leave the canvas in `destination-out`, so undo/redo wiped the whole drawing. Fixed.
- **Confirm screen no-scroll (mobile)** — the doodle image now flex-shrinks so "Finalise / Next / Compare"
  buttons are always fully visible (they were clipped by `overflow-hidden`).
- **Login chip said "5 Min Per Doodle"** — missed in the 5→7 sweep (case-sensitive grep); now "7 Min".
  All user-facing timer copy is 7 minutes.
- **Wall repeated doodles with few submissions** — the seamless-loop duplicate block was visible when only
  a couple were in; now static below 4, scroll (with duplicate) only at ≥4.
- **Launch-burst hardening** — prompt-assignment transaction given raised maxWait/timeout so 213 near-
  simultaneous first-logins queue cleanly instead of throwing "failed to start".
- Deploys currently run from a clean copy (`railway up` from a source-only temp dir) because a second dev
  server in the working folder locks files during indexing. `.railwayignore` added. Cleanest: stop that server.

## Credentials (local only, in C:\credentials\.env)
`RAILWAY_TOKEN` (project token) · `SLACK_BOT_TOKEN` · `CLOUDFLARE_API_TOKEN`. Never commit these.
Admin app password is legacy/unused (login is OTP now).
