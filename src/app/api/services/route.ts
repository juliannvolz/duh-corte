import { NextResponse } from "next/server";
import { getCategories, getServices } from "@/lib/content";

/**
 * Catálogo público de serviços.
 * Cacheado por 1 hora no edge (o conteúdo vem da camada `use cache`).
 */
export async function GET() {
  const [services, categories] = await Promise.all([getServices(), getCategories()]);

  return NextResponse.json(
    {
      categories,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        categoryId: s.categoryId,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
        priceConfirmed: s.priceConfirmed,
        featured: s.featured ?? false,
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
