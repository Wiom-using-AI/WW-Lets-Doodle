import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const employee = await prisma.employee.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!employee) {
    return NextResponse.json({ error: "Cannot find your name in the list. Please connect with the HR Team." }, { status: 404 });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.employee.update({
    where: { id: employee.id },
    data: { otpCode: otp, otpExpiry: expiry },
  });

  // Find Slack user by email and send DM
  const botToken = process.env.SLACK_BOT_TOKEN;

  // DEV MODE: no Slack token → return OTP directly for local testing
  if (!botToken) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Slack not configured." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, name: employee.name, devOtp: otp });
  }

  // Look up Slack user by email
  const lookupRes = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const lookupData = await lookupRes.json();

  if (!lookupData.ok || !lookupData.user) {
    return NextResponse.json({ error: "Could not find your Slack account. Please connect with the HR Team." }, { status: 404 });
  }

  // Open DM channel
  const dmRes = await fetch("https://slack.com/api/conversations.open", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ users: lookupData.user.id }),
  });
  const dmData = await dmRes.json();

  if (!dmData.ok) {
    return NextResponse.json({ error: "Could not send OTP. Please try again." }, { status: 500 });
  }

  // Send OTP message
  const msgRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: dmData.channel.id,
      text: `Hi ${employee.name}! 👋\n\nYour WW Let's Doodle login code is:\n\n*${otp}*\n\nThis code expires in 10 minutes. Happy doodling! 🎨`,
    }),
  });
  const msgData = await msgRes.json();

  if (!msgData.ok) {
    return NextResponse.json({ error: "Could not send OTP. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: employee.name });
}
