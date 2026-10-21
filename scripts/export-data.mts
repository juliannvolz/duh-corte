/**
 * Gera os entregaveis de dados do cliente (JSON) a partir da fonte unica
 * (src/lib/site.ts). Rodar: npx tsx scripts/export-data.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  business,
  serviceCategories,
  services,
  plans,
  professionals,
  testimonials,
  faqs,
  pending,
  openingHours,
} from "../src/lib/site";

const OUT = path.join(import.meta.dirname, "..", "entregaveis", "dados");
await mkdir(OUT, { recursive: true });

const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const horarios = Object.entries(openingHours).map(([d, w]) => ({
  dia: dias[Number(d)],
  ...(w ? { abre: w.open / 60, fecha: w.close / 60 } : { status: "fechado" }),
}));

const dados = {
  negocio: {
    nome: business.name,
    cidade: `${business.address.city}/${business.address.state}`,
    bairro: business.address.neighborhood,
    endereco: business.address.street,
    telefone: business.phoneE164,
    whatsapp: business.whatsapp,
    instagram: business.instagram,
    googleMaps: business.address.mapsUrl,
    nota: business.rating.value,
    avaliacoes: business.rating.count,
  },
  horarios,
  pendencias: pending,
};

await writeFile(path.join(OUT, "negocio.json"), JSON.stringify(dados, null, 2), "utf8");

await writeFile(
  path.join(OUT, "servicos.csv"),
  ["categoria;servico;minutos;preco_brl;preco_confirmado"]
    .concat(
      services.map((s) => {
        const cat = serviceCategories.find((c) => c.id === s.categoryId)?.name ?? s.categoryId;
        const brl = (s.priceCents / 100).toFixed(2).replace(".", ",");
        return `${cat};${s.name};${s.durationMin};R$ ${brl};${s.priceConfirmed ? "sim" : "nao (referencia)"}`;
      }),
    )
    .join("\n"),
  "utf8",
);

await writeFile(
  path.join(OUT, "planos.json"),
  JSON.stringify(
    plans.map((p) => ({
      nome: p.name,
      precoMensal: p.priceCents / 100,
      beneficios: p.perks,
      status: "referência — tabela oficial em validação com a barbearia",
    })),
    null,
    2,
  ),
  "utf8",
);

await writeFile(
  path.join(OUT, "equipe.json"),
  JSON.stringify(
    professionals.map((p) => ({ nome: p.name, funcao: p.role })),
    null,
    2,
  ),
  "utf8",
);

await writeFile(path.join(OUT, "avaliacoes.json"), JSON.stringify(testimonials, null, 2), "utf8");
await writeFile(path.join(OUT, "faq.json"), JSON.stringify(faqs, null, 2), "utf8");

console.log("entregaveis/dados gerados:", (await import("node:fs")).readdirSync(OUT).join(", "));
