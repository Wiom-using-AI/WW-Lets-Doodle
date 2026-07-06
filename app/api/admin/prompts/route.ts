import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function isAdmin() { return cookies().get("admin_auth")?.value === "true"; }

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { phrase } = await req.json();
  const prompt = await prisma.prompt.create({ data: { phrase } });
  return NextResponse.json(prompt);
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
