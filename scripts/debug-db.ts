import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.businessSettings.findFirst();
  console.log("settings:", settings);

  const timeOffs = await prisma.timeOff.findMany();
  console.log("timeOffs:", timeOffs.length);
  for (const t of timeOffs) console.log("  ", t.startsAt.toISOString(), t.endsAt.toISOString(), t.professionalId, t.reason);

  const pros = await prisma.professional.findMany();
  console.log("professionals:", pros.map((p) => `${p.id}:${p.active}`).join(" "));

  const hours = await prisma.professionalHours.findMany();
  console.log("hours rows:", hours.length);
  console.log("  ", hours.map((h) => `${h.professionalId}/${h.weekday}:${h.openMin}-${h.closeMin}`).join(" "));

  const gallery = await prisma.galleryItem.findMany();
  console.log("gallery:", gallery.map((g) => g.src).join(" "));

  await prisma.$disconnect();
}

main();
