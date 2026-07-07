import { NextResponse } from "next/server";

// Clears the employee session and returns to the login screen.
export async function GET(req: Request) {
  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set("employee_id", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
