import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "true") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { csv } = await req.json();
  if (!csv) return NextResponse.json({ error: "No CSV provided." }, { status: 400 });

  const lines = csv.trim().split("\n").slice(1); // skip header row
  let count = 0;

  for (const line of lines) {
    const parts = line.split(",").map((p: string) => p.trim().replace(/^"|"$/g, ""));
    const [name, email, department] = parts;
    if (!name || !email || !department) continue;
    await prisma.employee.upsert({
      where: { email: email.toLowerCase() },
      update: { name, department },
      create: { name, email: email.toLowerCase(), department },
    });
    count++;
  }

  return NextResponse.json({ count });
}
