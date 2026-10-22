import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  gallery as staticGallery,
  plans as staticPlans,
  professionals as staticProfessionals,
  serviceCategories as staticCategories,
  services as staticServices,
  testimonials as staticTestimonials,
  business as staticBusiness,
  openingHours as staticHours,
  bookingRules as staticRules,
  type ServiceSeed,
  type ProfessionalSeed,
  type PlanSeed,
  type TestimonialSeed,
  type GalleryItemSeed,
} from "@/lib/site";

/**
 * Leitura de conteudo público.
 * Regra: o banco e a fonte da verdade em producao; o arquivo estatico em site.ts
 * e o fallback (site funciona mesmo sem banco populado — importante para a
 * apresentacao ao cliente e para o build sem infra).
 */

export type ServiceView = ServiceSeed & { priceConfirmed: boolean };

export async function getServices(): Promise<ServiceView[]> {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    const rows = await prisma.service.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
    });
    if (rows.length === 0) return staticServices;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      categoryId: r.categoryId,
      durationMin: r.durationMin,
      priceCents: r.priceCents,
      priceConfirmed: r.priceConfirmed,
      featured: r.featured,
    }));
  } catch {
    return staticServices;
  }
}

export async function getCategories() {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    const rows = await prisma.serviceCategory.findMany({ orderBy: { order: "asc" } });
    if (rows.length === 0) return staticCategories;
    return rows.map((r) => ({ id: r.slug, name: r.name, blurb: r.blurb ?? "", order: r.order }));
  } catch {
    return staticCategories;
  }
}

export async function getProfessionals(): Promise<ProfessionalSeed[]> {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    const rows = await prisma.professional.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });
    if (rows.length === 0) return staticProfessionals;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      bio: r.bio ?? "",
      specialty: r.specialty ?? "",
      photo: r.photo,
      order: r.order,
      confirmed: r.confirmed,
    }));
  } catch {
    return staticProfessionals;
  }
}

export async function getPlans(): Promise<PlanSeed[]> {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    const rows = await prisma.plan.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } });
    if (rows.length === 0) return staticPlans;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      priceCents: r.priceCents,
      period: r.period as "mensal",
      description: r.description ?? "",
      perks: JSON.parse(r.perks) as string[],
      highlight: r.highlight,
      priceConfirmed: r.priceConfirmed,
    }));
  } catch {
    return staticPlans;
  }
}

/** Iniciais para o avatar: "Joana Batista" -> "JB". */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export async function getTestimonials(): Promise<TestimonialSeed[]> {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    // Depoimentos publicados no painel entram na frente dos antigos: sao a voz
    // de quem acabou de sair da cadeira.
    const [rows, publicados] = await Promise.all([
      prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
      prisma.feedback
        .findMany({
          where: { published: true, text: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { customer: { select: { name: true } } },
        })
        .catch(() => []),
    ]);

    const doPainel = publicados
      .filter((f) => (f.text ?? "").trim().length > 0)
      .map((f) => {
        const primeiroNome = f.customer.name.trim().split(/\s+/)[0];
        return {
          id: `feedback-${f.id}`,
          // mostra so o primeiro nome: depoimento publico, sem expor o cliente
          author: primeiroNome,
          initials: iniciais(f.customer.name),
          rating: f.rating,
          text: f.text ?? "",
          source: "site",
          sourceUrl: "",
        };
      });

    const base: TestimonialSeed[] =
      rows.length === 0
        ? staticTestimonials
        : rows.map((r) => ({
            id: r.id,
            author: r.author,
            initials: r.initials,
            rating: r.rating,
            text: r.text,
            source: r.source,
            sourceUrl: r.sourceUrl ?? "",
          }));

    return [...doPainel, ...base];
  } catch {
    return staticTestimonials;
  }
}

export async function getGallery(): Promise<GalleryItemSeed[]> {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    const rows = await prisma.galleryItem.findMany({ orderBy: { order: "asc" } });
    if (rows.length === 0) return staticGallery;
    return rows.map((r) => ({
      id: r.id,
      src: r.src,
      alt: r.alt,
      caption: r.caption ?? "",
      tag: r.tag ?? "",
      order: r.order,
    }));
  } catch {
    return staticGallery;
  }
}

export async function getBusinessSettings() {
  "use cache";
  cacheTag("conteudo");
  cacheLife("hours");
  try {
    const s = await prisma.businessSettings.findFirst();
    if (!s) return null;
    return s;
  } catch {
    return null;
  }
}

export { staticBusiness as business, staticHours as openingHours, staticRules as bookingRules };
export { staticServices, staticProfessionals, staticPlans, staticTestimonials, staticGallery, staticCategories };
