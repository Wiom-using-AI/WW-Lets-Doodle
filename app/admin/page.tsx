import { cookies } from "next/headers";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { prisma } from "@/lib/prisma";
import { getEvent } from "@/lib/session";

export default async function AdminPage() {
  const isAdmin = cookies().get("admin_auth")?.value === "true";
  if (!isAdmin) return <AdminLogin />;

  const [event, employeeCount, promptCount, doodleCount] = await Promise.all([
    getEvent(),
    prisma.employee.count(),
    prisma.prompt.count(),
    prisma.doodle.count({ where: { isSubmitted: true } }),
  ]);

  const prompts = await prisma.prompt.findMany({ orderBy: { createdAt: "asc" } });

  return <AdminDashboard event={event} stats={{ employeeCount, promptCount, doodleCount }} prompts={prompts} />;
}
