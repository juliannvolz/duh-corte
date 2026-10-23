import { describe, expect, it } from "vitest";
import {
  exibirTelefone,
  mascararEmail,
  mascararTelefone,
  normalizarTelefoneBR,
  somenteDigitos,
  telefoneValido,
  variantesTelefone,
} from "@/lib/phone";

describe("normalizarTelefoneBR", () => {
  it("remove mascara, +55 e zero de operadora", () => {
    expect(normalizarTelefoneBR("(47) 99270-4581")).toBe("47992704581");
    expect(normalizarTelefoneBR("+55 47 99270-4581")).toBe("47992704581");
    expect(normalizarTelefoneBR("5547992704581")).toBe("47992704581");
    expect(normalizarTelefoneBR("047992704581")).toBe("47992704581");
    expect(normalizarTelefoneBR("0055 47 99270-4581")).toBe("47992704581");
  });

  it("nao confunde numero com DDD 55", () => {
    // DDD 55 (RS) + 8 digitos = 10 digitos; nao pode perder o DDD
    expect(normalizarTelefoneBR("55 3222-1234")).toBe("5532221234");
  });
});

describe("telefoneValido", () => {
  it("aceita fixo (10) e celular (11)", () => {
    expect(telefoneValido("(47) 3222-1234")).toBe(true);
    expect(telefoneValido("(47) 99270-4581")).toBe(true);
  });

  it("recusa curto, longo e vazio", () => {
    expect(telefoneValido("")).toBe(false);
    expect(telefoneValido("479927")).toBe(false);
    expect(telefoneValido("479927045812345")).toBe(false);
  });
});

describe("variantesTelefone", () => {
  it("cobre com/sem 55 e nono digito", () => {
    const variantes = variantesTelefone("(47) 99270-4581");
    expect(variantes).toContain("47992704581");
    expect(variantes).toContain("5547992704581");
    expect(variantes).toContain("4792704581");
  });

  it("acrescenta o nono digito em numero antigo", () => {
    expect(variantesTelefone("(47) 9270-4581")).toContain("47992704581");
  });

  it("devolve vazio para entrada invalida", () => {
    expect(variantesTelefone("123")).toEqual([]);
    expect(variantesTelefone("")).toEqual([]);
  });
});

describe("mascaras", () => {
  it("formata enquanto digita", () => {
    expect(mascararTelefone("47")).toBe("(47");
    expect(mascararTelefone("4799")).toBe("(47) 99");
    expect(mascararTelefone("47992704581")).toBe("(47) 99270-4581");
    expect(mascararTelefone("4732221234")).toBe("(47) 3222-1234");
  });

  it("exibe so o que da para reconhecer", () => {
    expect(exibirTelefone("47992704581")).toBe("(47) 99270-4581");
    expect(exibirTelefone("sem numero")).toBe("sem numero");
    expect(somenteDigitos("(47) 99270-4581")).toBe("47992704581");
  });

  it("esconde o e-mail de outra conta", () => {
    expect(mascararEmail("juliannvolz@gmail.com")).toBe("j**********@gmail.com");
    expect(mascararEmail(null)).toBeNull();
    expect(mascararEmail("sem-arroba")).toBeNull();
  });
});
