import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "true") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await req.json();
  if (!rows || !Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No data found in file." }, { status: 400 });

  // Build a case-insensitive key lookup for each row
  function findCol(row: Record<string, unknown>, ...keys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const k of keys) {
      const match = rowKeys.find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
      if (match) return String(row[match] ?? "").trim();
    }
    return "";
  }

  let count = 0;
  for (const row of rows) {
    const name = findCol(row, "name", "full name", "employee name");
    const email = findCol(row, "email", "email address", "work email").toLowerCase();
    const department = findCol(row, "department", "dept", "team", "division");
    if (!name || !email || !department) continue;
    await prisma.employee.upsert({
      where: { email },
      update: { name, department },
      create: { name, email, department },
    });
    count++;
  }

  if (count === 0) {
    const sampleKeys = Object.keys(rows[0] ?? {});
    return NextResponse.json({ error: `0 rows imported. Columns found: ${sampleKeys.join(", ")}` }, { status: 400 });
  }

  return NextResponse.json({ count });
}
