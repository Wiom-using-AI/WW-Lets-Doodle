// Set the event status manually. Usage:
//   DATABASE_URL="<public-db-url>" node scripts/event.mjs open
//   DATABASE_URL="<public-db-url>" node scripts/event.mjs close
// "open"  -> status "active"    (portal live, drawing + voting)
// "close" -> status "completed" (portal closed, winners shown)
import { PrismaClient } from "@prisma/client";

const arg = (process.argv[2] || "").toLowerCase();
const map = { open: "active", close: "completed", setup: "setup" };
const status = map[arg];
if (!status) {
  console.error("Usage: node scripts/event.mjs <open|close|setup>");
  process.exit(1);
}

const prisma = new PrismaClient();
let event = await prisma.event.findFirst();
if (!event) event = await prisma.event.create({ data: {} });
const updated = await prisma.event.update({ where: { id: event.id }, data: { status } });
console.log(`Event status set to: ${updated.status}`);
await prisma.$disconnect();
