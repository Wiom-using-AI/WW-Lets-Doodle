import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getCurrentEmployee() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_id")?.value;
  if (!employeeId) return null;
  return prisma.employee.findUnique({ where: { id: employeeId } });
}

export async function getEvent() {
  let event = await prisma.event.findFirst();
  if (!event) event = await prisma.event.create({ data: {} });
  return event;
}

// Event open/closed is driven entirely by Event.status (set manually by admin),
// NOT by server time. Railway runs in UTC, so any getHours() check fires at the
// wrong IST hour. "active" (or "setup") = open; "completed" = closed/results.
export function isEventClosedStatus(status: string) {
  return status === "completed";
}
