# Let's Doodle It! — Cloudflare Worker reverse proxy

Fronts the Railway app (`ww-lets-doodle-production.up.railway.app`) on a Cloudflare
domain so the portal loads on networks that block `*.up.railway.app`.

## Deploy

1. Install Wrangler (Cloudflare CLI):
   ```
   npm install -g wrangler
   ```
2. Log in to your Cloudflare account:
   ```
   wrangler login
   ```
   (or set `CLOUDFLARE_API_TOKEN` with an "Edit Workers" token for non-interactive deploy)
3. From this folder, deploy:
   ```
   cd cloudflare-worker
   wrangler deploy
   ```
4. Wrangler prints the URL, e.g. `https://lets-doodle-it.<subdomain>.workers.dev` — share that link with employees.

## Custom domain (recommended)
If `wiom.in` (or any domain) is on Cloudflare, add a route in `wrangler.toml` and
`wrangler deploy` again to serve at e.g. `https://doodle.wiom.in`.

## Notes
- Forwards everything (pages, `/_next` assets, `/api`, cookies) transparently.
- No secrets live here; the origin stays on Railway.
- If the origin URL ever changes, update `ORIGIN` in `src/index.js`.
