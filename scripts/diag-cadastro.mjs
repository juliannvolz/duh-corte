/**
 * Diagnostico read-only do banco do duh-corte (Neon proprio).
 *   node scripts/diag-cadastro.mjs [pedacoDoNomeOuEmail]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL ?? undefined } } });

const filtro = process.argv[2] ?? "";
const like = { contains: filtro };

const customers = await prisma.customer.findMany({
  where: filtro ? { OR: [{ id: like }, { email: like }, { name: like }] } : undefined,
  include: {
    claims: true,
    appointments: { select: { id: true, startsAt: true, status: true }, take: 5, orderBy: { startsAt: "desc" } },
  },
});

console.log("\n== customers ==");
for (const c of customers) {
  console.log(JSON.stringify({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    googleId: c.googleId,
    points: c.points,
    createdAt: c.createdAt,
    claims: c.claims.map((k) => ({ googleId: k.googleId, email: k.email })),
    appointments: c.appointments.map((a) => ({ id: a.id.slice(0, 8), startsAt: a.startsAt.toISOString(), status: a.status })),
  }, null, 2));
}

const appointments = await prisma.appointment.findMany({
  where: filtro ? { customer: { OR: [{ id: like }, { email: like }, { name: like }] } } : undefined,
  include: { customer: { select: { id: true, name: true, email: true, googleId: true } } },
  orderBy: { startsAt: "desc" },
  take: 10,
});

console.log("\n== appointments ==");
for (const a of appointments) {
  console.log(JSON.stringify({
    id: a.id.slice(0, 8),
    startsAt: a.startsAt.toISOString(),
    status: a.status,
    source: a.source,
    notes: a.notes,
    customer: a.customer,
  }, null, 2));
}

const claims = await prisma.customerClaim.findMany({ take: 20 });
console.log("\n== customerClaim ==");
for (const k of claims) {
  console.log(JSON.stringify({ customerId: k.customerId, googleId: k.googleId, email: k.email, createdAt: k.createdAt.toISOString() }));
}

await prisma.$disconnect();
