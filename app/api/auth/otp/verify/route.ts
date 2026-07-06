import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();
  if (!email || !otp) return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });

  const employee = await prisma.employee.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  if (!employee.otpCode || !employee.otpExpiry) {
    return NextResponse.json({ error: "No OTP requested. Please request a new one." }, { status: 400 });
  }

  if (new Date() > employee.otpExpiry) {
    return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
  }

  if (employee.otpCode !== otp.trim()) {
    return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });
  }

  // Clear OTP after successful use
  await prisma.employee.update({
    where: { id: employee.id },
    data: { otpCode: null, otpExpiry: null },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("employee_id", employee.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}
