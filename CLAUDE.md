# WW Let's Doodle — Project Context

## 📋 HANDOVER convention (do this after every major milestone)
After each major milestone, regenerate **HANDOVER.md** in the repo root capturing:
1. **What's implemented** · 2. **Pending tasks** · 3. **Important decisions** · 4. **Known issues**
Also update the "Live URLs" and "Last updated" line. HANDOVER.md is the single source of truth
for project status; keep it current so anyone can pick up the project cold.
(App is now branded "Let's Doodle It!"; login is OTP-via-Slack, not OAuth — some sections below are historical.)

## What this is
A one-time Wednesday activity portal for Wiom employees across all locations.
Employees log in via Slack OAuth, draw prompted phrases on a browser canvas, submit their doodle, and it shows up on a live gallery. Voting determines top 3 winners who get surprise goodies.

## Repo
- GitHub: https://github.com/Wiom-using-AI/WW-Lets-Doodle
- Local: C:\Users\Wiom\WW-Lets-Doodle
- Connected to Railway (empty repo connected, code pushed now)

## Stack
- Next.js 14 (App Router)
- PostgreSQL on Railway
- Prisma ORM
- Tailwind CSS
- Deployed on Railway — auto-deploys on push to main/master

## ⚠️ PENDING AFTER FIRST DEPLOY
After Railway generates a deployment URL:
1. Go to api.slack.com/apps → WW Let's Doodle app
2. OAuth & Permissions → Redirect URLs
3. Add: `https://<railway-url>/api/auth/slack/callback`
4. Save and Reinstall to Workspace
5. Add env vars in Railway: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, APP_URL, NEXT_PUBLIC_SLACK_CLIENT_ID, NEXT_PUBLIC_APP_URL, ADMIN_PASSWORD_HASH, DATABASE_URL (auto-set by Railway Postgres)

## Slack App
- App name: WW Let's Doodle (renamed from Wellness Wednesday)
- User Token Scopes: identity.basic, identity.email ✅
- Client ID and Secret: available in Slack app Basic Information (stored in Railway env vars only)

## Authentication Flow
1. Employee clicks Login with Slack
2. Slack OAuth returns their email
3. Match email against employee table in DB (uploaded via admin CSV)
4. Found → cookie set, into portal
5. Not found → "Cannot find your name in the list, please connect with the HR Team"
- Emails can be @wiom.in or @i2e1.com — pure email match, no domain restriction

## Game Flow
- Split screen: left = playground, right = gallery
- Instructions cards (6 cards, click through) before entering game
- Employee assigned 3 random prompts at session start (revealed one at a time)
- Try 1 → prompt revealed → 2 min draw → submit or retry
- Try 2 → new prompt revealed → 2 min draw → submit or retry
- Try 3 → "Last chance" + new prompt → 2 min draw → must submit
- After all tries → preview all 3 → pick one to submit
- After submit → back to split screen

## Voting
- Open the whole time the portal is open (NOT time-windowed)
- Rank 1/2/3 per doodle (points: rank1=3, rank2=2, rank3=1)
- Cannot vote for own doodle (blocked at API level)
- Vote counts hidden while portal is open; revealed only when event is CLOSED (status "completed")

## Event Lifecycle — MANUAL, status-driven (NOT time-based)
- IMPORTANT: all server-time (getHours) logic was REMOVED. Railway runs in UTC, so
  time checks fired at the wrong IST hour. Everything is now driven by Event.status.
- Two effective states:
  - open   = status "setup" or "active"  → participants draw + vote, results hidden
  - closed = status "completed"          → portal locked, ResultsScreen shows winners
- No auto-announcement fires on any status change (only per-user OTP DMs are ever sent).
- Closing is accident-proof: admin must type "CLOSE" to confirm; a "Reopen Portal"
  button instantly restores the open state (nothing is ever deleted).
- Claude can flip status via: `DATABASE_URL="<public-url>" node scripts/event.mjs open|close`
- Plan: portal stays open (announced via link when ready), closed manually at 6 PM on show day.
- Top 3 by points win goodies, shown on portal after close.

## Deployment (Railway) — how to deploy
- GitHub auto-deploy webhook was unreliable. Deploy directly from local via Railway CLI:
  - Token in C:\credentials\.env (RAILWAY_TOKEN, project-scoped, production env)
  - `railway up -p a9705d61-a17c-451e-b993-de39939c2ecf -s WW-Lets-Doodle -e production -y --ci`
- Builder: RAILPACK (nixpacks was broken on Railway's side). Next.js 14.2.35 (security).
- CRITICAL env var: PORT=3000 must match the domain target port, else 502 (Next binds to PORT).
- Live URL: https://ww-lets-doodle-production.up.railway.app

## Admin Panel (/admin)
- Password protected (bcrypt hash in ADMIN_PASSWORD_HASH env var)
- Upload employee CSV (Name, Email, Department)
- Manage prompt bank (add/delete, up to 30 phrases)
- Control event status (go live, close, show results)
- Stats: employee count, prompt count, submissions

## Employee Data
- CSV format: Name, Email, Department (header row required)
- Upserted on upload — safe to re-upload if list changes

## Scoring
- Rank 1 vote = 3 points, Rank 2 = 2 points, Rank 3 = 1 point
- Individual only, no department scoring

## Dev Notes
- Canvas: native HTML5 Canvas API, handles mouse + touch
- Gallery: polls /api/gallery every 30 seconds
- Vote counts hidden from API response until event status is "completed"
- Self-vote blocked at API level in /api/vote/route.ts

## Session persistence & server-authoritative timer (anti-cheat)
- ALL game state lives on the server (GameSession + Doodle rows), NOT localStorage.
  On load the player resumes exactly where they left off — survives refresh, tab close,
  and incognito/other device (after re-login, since state is keyed by employee).
- GameSession.stage: reveal | drawing | confirm | preview | done — drives resume.
- GameSession.tryStartedAt: server timestamp anchoring the 2-min timer. Deadline =
  tryStartedAt + 120s. Closing/reopening the tab CANNOT pause or reset it (verified:
  4s away → 116s remaining, not 120). "start" action is idempotent (won't re-anchor).
- Client computes remaining from server tryStartedAt + serverNow (clock-skew adjusted).
- Drawing autosaves to the server every 8s + on tab-hide/pagehide → strokes restored on return.
- Doodle.finalized = that try's drawing is locked in (Done or time-up); preview shows all finalized tries.
- API: /api/game/session — GET (read, no create), POST (create/resume), PATCH {action} where
  action ∈ start | autosave | finalize | retry | preview. Submit stays at /api/game/submit.
- Requires @@unique([sessionId, tryNumber]) on Doodle (upserts depend on it).
