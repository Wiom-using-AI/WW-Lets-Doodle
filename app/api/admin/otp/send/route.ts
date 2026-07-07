import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "sneha.ghildiyal@wiom.in").toLowerCase();

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || email.toLowerCase().trim() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "This email is not authorised for admin access." }, { status: 403 });
  }
  const employee = await prisma.employee.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!employee) return NextResponse.json({ error: "Admin email not found in employee list." }, { status: 404 });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.employee.update({ where: { id: employee.id }, data: { otpCode: otp, otpExpiry: new Date(Date.now() + 10 * 60 * 1000) } });

  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Slack not configured." }, { status: 500 });
    return NextResponse.json({ ok: true, devOtp: otp });
  }

  const lu = await (await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(ADMIN_EMAIL)}`, { headers: { Authorization: `Bearer ${botToken}` } })).json();
  if (!lu.ok || !lu.user) return NextResponse.json({ error: "Could not find your Slack account." }, { status: 404 });
  const dm = await (await fetch("https://slack.com/api/conversations.open", { method: "POST", headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ users: lu.user.id }) })).json();
  if (!dm.ok) return NextResponse.json({ error: "Could not open Slack DM." }, { status: 500 });
  const msg = await (await fetch("https://slack.com/api/chat.postMessage", { method: "POST", headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ channel: dm.channel.id, text: `Your *Let's Doodle It!* ADMIN login code is:\n\n*${otp}*\n\nThis code expires in 10 minutes.` }) })).json();
  if (!msg.ok) return NextResponse.json({ error: "Could not send OTP. Please try again." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
