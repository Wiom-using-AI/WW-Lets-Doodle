import { NextResponse } from "next/server";

// Clears the employee session and returns to the login screen.
// Uses a RELATIVE Location ("/") so the browser resolves it against the domain it's
// actually on (Cloudflare proxy or Railway) — never the server's internal localhost:3000.
export async function GET() {
  const res = new NextResponse(null, { status: 302, headers: { Location: "/" } });
  res.cookies.set("employee_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
