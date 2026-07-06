import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return NextResponse.json({ error: "Admin not configured." }, { status: 500 });
  const valid = await bcrypt.compare(password, hash);
  if (!valid) return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_auth", "true", { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return res;
}
