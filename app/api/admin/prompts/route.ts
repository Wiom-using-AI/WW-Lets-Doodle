import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_auth")?.value === "true";
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Bulk add: { phrases: string[] } (one per line, pasted in admin)
  if (Array.isArray(body.phrases)) {
    const phrases = body.phrases.map((p: string) => p.trim()).filter(Boolean);
    if (phrases.length === 0) return NextResponse.json({ error: "No phrases provided." }, { status: 400 });
    await prisma.prompt.createMany({ data: phrases.map((phrase: string) => ({ phrase })) });
    return NextResponse.json({ count: phrases.length });
  }

  // Single add: { phrase: string }
  const phrase = (body.phrase ?? "").trim();
  if (!phrase) return NextResponse.json({ error: "Empty phrase." }, { status: 400 });
  const prompt = await prisma.prompt.create({ data: { phrase } });
  return NextResponse.json(prompt);
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
