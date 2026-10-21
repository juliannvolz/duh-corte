import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://duhcutebarbearia.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/servicos", "/planos", "/agendar", "/local", "/privacidade"];
  const now = new Date();

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/agendar" ? 0.9 : 0.7,
  }));
}
