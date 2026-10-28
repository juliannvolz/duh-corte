const {PrismaClient} = await import('@prisma/client');
const p = new PrismaClient();
const a = await p.appointment.findMany({select: {id: true, status: true, startsAt: true}, orderBy: {startsAt: 'desc'}});
console.log(JSON.stringify(a, null, 1));
await p.$disconnect();
