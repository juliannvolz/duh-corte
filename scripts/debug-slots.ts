import { PrismaClient } from "@prisma/client";
import { generateSlots } from "@/lib/scheduling";
import { dayStart, weekdayOf } from "@/lib/time";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.businessSettings.findFirst();
  const weekday = weekdayOf("2026-10-23");
  const ph = await prisma.professionalHours.findUnique({
    where: { professionalId_weekday: { professionalId: "dudu", weekday } },
  });
  const bh = await prisma.weekday.findFirst({ where: { weekday } });

  console.log("weekday", weekday, "ph", ph, "bh", bh);
  console.log("settings.num", {
    minLeadMin: settings?.minLeadMin,
    maxAdvanceDays: settings?.maxAdvanceDays,
    slotStepMin: settings?.slotStepMin,
    bufferMin: settings?.bufferMin,
  });

  const direct = generateSlots({
    dateISO: "2026-10-23",
    durationMin: 45,
    window: { openMin: 540, closeMin: 1140 },
    busy: [],
    offTime: [],
    now: new Date(),
    minLeadMin: 60,
    maxAdvanceDays: 60,
    slotStepMin: 15,
    bufferMin: 15,
  });
  console.log("direct:", direct.length, direct.map((s) => s.label).slice(0, 4).join(","));

  const viaSettings = generateSlots({
    dateISO: "2026-10-23",
    durationMin: 45,
    window: { openMin: 540, closeMin: 1140 },
    busy: [],
    offTime: [],
    now: new Date(),
    minLeadMin: settings?.minLeadMin ?? 60,
    maxAdvanceDays: settings?.maxAdvanceDays ?? 60,
    slotStepMin: settings?.slotStepMin ?? 15,
    bufferMin: settings?.bufferMin ?? 15,
  });
  console.log("viaSettings:", viaSettings.length);

  console.log("dayStart 23:", dayStart("2026-10-23").toISOString(), "now:", new Date().toISOString());

  await prisma.$disconnect();
}

main();
