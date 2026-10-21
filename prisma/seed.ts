/**
 * Seed do banco com o conteudo real coletado da Duh Corte Barbearia.
 * Idempotente: pode rodar quantas vezes for.
 *
 *   npm run db:push && npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import {
  business,
  faqs,
  gallery,
  openingHours,
  pending,
  plans,
  professionals,
  serviceCategories,
  services,
  testimonials,
  bookingRules,
  weekdayLabel,
} from "../src/lib/site";

const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.professionalHours.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.weekday.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.galleryItem.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.pendingItem.deleteMany();
  await prisma.businessSettings.deleteMany();

  await prisma.businessSettings.create({
    data: {
      id: "default",
      name: business.name,
      legalName: business.legalName,
      tagline: business.tagline,
      hashtag: business.hashtag,
      street: business.address.street,
      neighborhood: business.address.neighborhood,
      city: business.address.city,
      state: business.address.state,
      zip: business.address.zip,
      phone: business.phone,
      whatsapp: business.whatsapp,
      email: business.email,
      pixKey: null,
      instagram: business.instagram,
      ratingValue: business.rating.value,
      ratingCount: business.rating.count,
      cancelWindowMin: bookingRules.cancelWindowMinutes,
      minLeadMin: bookingRules.minLeadMinutes,
      maxAdvanceDays: bookingRules.maxAdvanceDays,
      bufferMin: bookingRules.bufferMinutes,
      slotStepMin: bookingRules.slotStepMinutes,
      penaltyHours: bookingRules.penaltyHours,
    },
  });

  for (const [weekday, hours] of Object.entries(openingHours)) {
    await prisma.weekday.create({
      data: {
        weekday: Number(weekday),
        openMin: hours?.open ?? 0,
        closeMin: hours?.close ?? 0,
        closed: !hours,
        settingsId: "default",
      },
    });
  }

  for (const category of serviceCategories) {
    await prisma.serviceCategory.create({
      data: {
        id: category.id,
        name: category.name,
        slug: category.id,
        blurb: category.blurb,
        order: category.order,
      },
    });
  }

  for (const service of services) {
    await prisma.service.create({
      data: {
        id: service.id,
        name: service.name,
        description: service.description,
        categoryId: service.categoryId,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        priceConfirmed: service.priceConfirmed,
        featured: service.featured ?? false,
      },
    });
  }

  for (const professional of professionals) {
    const created = await prisma.professional.create({
      data: {
        id: professional.id,
        name: professional.name,
        role: professional.role,
        bio: professional.bio,
        specialty: professional.specialty,
        photo: professional.photo,
        order: professional.order,
        confirmed: professional.confirmed,
      },
    });
    for (const [weekday, hours] of Object.entries(openingHours)) {
      if (!hours) continue;
      await prisma.professionalHours.create({
        data: {
          professionalId: created.id,
          weekday: Number(weekday),
          openMin: hours.open,
          closeMin: hours.close,
        },
      });
    }
    for (const service of services) {
      await prisma.professionalService.create({
        data: { professionalId: created.id, serviceId: service.id, priceCents: null },
      });
    }
  }

  for (const plan of plans) {
    await prisma.plan.create({
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        period: plan.period,
        perks: JSON.stringify(plan.perks),
        highlight: plan.highlight ?? false,
        priceConfirmed: plan.priceConfirmed,
      },
    });
  }

  for (const item of gallery) {
    await prisma.galleryItem.create({
      data: { id: item.id, src: item.src, alt: item.alt, caption: item.caption, tag: item.tag, order: item.order },
    });
  }

  for (const [i, t] of testimonials.entries()) {
    await prisma.testimonial.create({
      data: {
        id: t.id,
        author: t.author,
        initials: t.initials,
        rating: t.rating,
        text: t.text,
        source: t.source,
        sourceUrl: t.sourceUrl,
        order: i,
      },
    });
  }

  for (const item of pending) {
    await prisma.pendingItem.create({ data: item });
  }

  const counts = {
    servicos: await prisma.service.count(),
    profissionais: await prisma.professional.count(),
    planos: await prisma.plan.count(),
    galeria: await prisma.galleryItem.count(),
    avaliacoes: await prisma.testimonial.count(),
    pendencias: await prisma.pendingItem.count(),
  };
  console.log("seed ok:", counts);
  console.log("horarios:", Object.entries(openingHours).map(([d, h]) => `${weekdayLabel[Number(d) as keyof typeof weekdayLabel]}=${h ? `${h.open}-${h.close}` : "fechado"}`).join(", "));
  console.log("faq items (apenas no site):", faqs.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
