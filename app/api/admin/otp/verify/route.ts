import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "sneha.ghildiyal@wiom.in").toLowerCase();

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();
  if (!email || email.toLowerCase().trim() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "This email is not authorised for admin access." }, { status: 403 });
  }
  const employee = await prisma.employee.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!employee?.otpCode || !employee.otpExpiry) return NextResponse.json({ error: "No OTP requested. Please request a new one." }, { status: 400 });
  if (new Date() > employee.otpExpiry) return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
  if (employee.otpCode !== otp.trim()) return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });

  await prisma.employee.update({ where: { id: employee.id }, data: { otpCode: null, otpExpiry: null } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_auth", "true", { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  return res;
}
