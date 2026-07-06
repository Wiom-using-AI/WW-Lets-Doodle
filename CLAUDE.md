# WW Let's Doodle — Project Context

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
- Open 11 AM – 6 PM
- Rank 1/2/3 per doodle (points: rank1=3, rank2=2, rank3=1)
- Cannot vote for own doodle (blocked at API level)
- Vote counts hidden until 6 PM
- After 6 PM: counts visible, leaderboard shown

## Event Lifecycle (one-time, not recurring)
- setup → active (go live) → closed (6 PM) → completed (7 PM, show results)
- After 7 PM: results/winner screen only, game locked
- Top 3 by points win goodies, shown on portal

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
- Timer: stored in localStorage per try number to survive refresh
- Gallery: polls /api/gallery every 30 seconds
- Vote counts hidden from API response until hour >= 18
- Self-vote blocked at API level in /api/vote/route.ts
