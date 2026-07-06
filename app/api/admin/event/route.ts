import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getEvent } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  if (cookies().get("admin_auth")?.value !== "true") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { status } = await req.json();
  const event = await getEvent();
  const updated = await prisma.event.update({ where: { id: event.id }, data: { status } });
  return NextResponse.json(updated);
}
