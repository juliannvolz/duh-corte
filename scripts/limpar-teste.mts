import { prisma } from "../src/lib/db";

const removidos = {
  appointments: await prisma.appointment.deleteMany({}),
  feedbacks: await prisma.feedback.deleteMany({}),
  rewards: await prisma.reward.deleteMany({}),
  pointEntries: await prisma.pointEntry.deleteMany({}),
  referrals: await prisma.referral.deleteMany({}),
  claims: await prisma.customerClaim.deleteMany({}),
  customers: await prisma.customer.deleteMany({}),
};
console.log(JSON.stringify(removidos));
await prisma.$disconnect();
