import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.APP_URL + "/api/auth/slack/callback",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.ok) {
      return NextResponse.redirect(new URL("/?error=slack_auth_failed", req.url));
    }

    // Get user identity
    const identityRes = await fetch("https://slack.com/api/users.identity", {
      headers: { Authorization: `Bearer ${tokenData.authed_user.access_token}` },
    });

    const identity = await identityRes.json();
    if (!identity.ok) {
      return NextResponse.redirect(new URL("/?error=identity_failed", req.url));
    }

    const email = identity.user.email?.toLowerCase();

    // Check against employee list
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (!employee) {
      return NextResponse.redirect(new URL("/?error=not_found", req.url));
    }

    // Set session cookie
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set("employee_id", employee.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/?error=server_error", req.url));
  }
}
