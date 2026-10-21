import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join(import.meta.dirname, "..", "src");

const FIXOS = {
  "lib/site.ts": [
    ["segunda a sexta das 9:00 as 19:00", "segunda a sexta das 9:00 às 19:00"],
    ["Otimo ambiente", "Ótimo ambiente"],
    ["padroes de locais", "padrões de locais"],
    ["Otimo atendimento", "Ótimo atendimento"],
    ["profissionais mto caprichosos", "profissionais muito caprichosos"],
    ["dias de antecedencia e o atendimento e sempre", "dias de antecedência e o atendimento é sempre"],
    ["pagamento voces aceitam", "pagamento vocês aceitam"],
    ["Voces vendem produtos", "Vocês vendem produtos"],
    ["precos e duracoes", "preços e durações"],
    ["Acervo fotografico de alta resolucao", "Acervo fotográfico de alta resolução"],
  ],
  "components/sections/Location.tsx": [
    ["A agenda comeca as 9h", "a agenda abre às 9h"],
    ["A agenda começa as 9h", "a agenda abre às 9h"],
  ],
  "components/sections/Plans.tsx": [["agenda prioritaria", "agenda prioritária"]],
  "components/sections/Team.tsx": [["faz com criterio", "faz com critério"]],
  "components/sections/Testimonials.tsx": [["Quem ja sentou", "Quem já sentou"]],
  "components/sections/Story.tsx": [["Sua cadeira e sua", "Sua cadeira é sua"]],
  "app/api/slots/route.ts": [["Parametros invalidos", "Parâmetros inválidos"]],
};

let aplicadas = 0;
const naoEncontradas = [];
for (const [rel, pares] of Object.entries(FIXOS)) {
  const file = path.join(RAIZ, rel);
  let s = fs.readFileSync(file, "utf8");
  for (const [de, para] of pares) {
    if (s.includes(de)) {
      s = s.split(de).join(para);
      aplicadas += 1;
    } else {
      naoEncontradas.push(`${rel}: "${de.slice(0, 45)}"`);
    }
  }
  fs.writeFileSync(file, s, "utf8");
}

console.log(`aplicadas: ${aplicadas}`);
if (naoEncontradas.length) {
  console.log("nao encontradas (ja corrigidas ou diferentes):");
  for (const n of naoEncontradas) console.log(" -", n);
}
