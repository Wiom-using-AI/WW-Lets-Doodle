// Reverse proxy for "Let's Doodle It!" — fronts the Railway app on a Cloudflare domain
// so the portal is reachable even where *.up.railway.app is blocked (some mobile/corp networks).
//
// Everything (pages, /_next assets, /api routes, cookies) is transparently forwarded.
// Next.js uses relative URLs, so no body rewriting is needed — only redirect Location
// headers that point back at the origin are rewritten to stay on the proxy domain.

const ORIGIN = "ww-lets-doodle-production.up.railway.app";

export default {
  async fetch(request) {
    const inUrl = new URL(request.url);
    const publicHost = inUrl.host; // the domain the phone/browser actually hit

    const target = new URL(request.url);
    target.hostname = ORIGIN;
    target.protocol = "https:";
    target.port = "";

    // Forward method, headers, body. Point Host at the origin so Railway routes correctly.
    const headers = new Headers(request.headers);
    headers.set("Host", ORIGIN);
    headers.set("X-Forwarded-Host", publicHost);
    headers.set("X-Forwarded-Proto", "https");

    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

    const originResp = await fetch(target.toString(), { method, headers, body, redirect: "manual" });

    // Copy the response and keep the user on the proxy domain for any redirects.
    const resp = new Response(originResp.body, originResp);
    const loc = resp.headers.get("Location");
    if (loc) {
      resp.headers.set(
        "Location",
        loc.replaceAll("https://" + ORIGIN, "https://" + publicHost).replaceAll("http://" + ORIGIN, "https://" + publicHost)
      );
    }
    return resp;
  },
};
