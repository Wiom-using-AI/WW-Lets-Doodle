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

export function isEventOpen() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 11 && hour < 18; // 11 AM to 6 PM
}

export function isEventClosed() {
  const now = new Date();
  return now.getHours() >= 19; // after 7 PM
}
