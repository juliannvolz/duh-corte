import { describe, expect, it } from "vitest";
import {
  customerIdFromPhone,
  formaDoVinculo,
  idGeradoLocalmente,
  podeReivindicarPorTelefone,
  podeVincularPorTelefone,
} from "@/lib/customer-identity";
import {
  mensagemParaCliente,
  mensagemParaBarbearia,
  mensagemNovoAgendamento,
  whatsappLink,
  whatsappNumber,
} from "@/lib/whatsapp";

describe("customerIdFromPhone", () => {
  it("normaliza o telefone para a chave do cliente", () => {
    expect(customerIdFromPhone("(47) 99999-8888")).toBe("phone:47999998888");
    expect(customerIdFromPhone("47999998888")).toBe("phone:47999998888");
    expect(customerIdFromPhone("+55 47 99999-8888")).toBe("phone:47999998888");
  });
});

describe("podeVincularPorTelefone", () => {
  it("permite quando o cadastro ainda nao tem e-mail (visitante)", () => {
    expect(podeVincularPorTelefone(null, "ana@x.com")).toBe(true);
  });

  it("permite quando o e-mail do cadastro e o mesmo da sessao", () => {
    expect(podeVincularPorTelefone("ana@x.com", "ana@x.com")).toBe(true);
    expect(podeVincularPorTelefone("ANA@X.com", "ana@x.com")).toBe(true);
  });

  it("bloqueia quando o e-mail e de outra pessoa", () => {
    // o caso perigoso: "mariana@x.com" contem "ana@x.com"
    expect(podeVincularPorTelefone("mariana@x.com", "ana@x.com")).toBe(false);
    expect(podeVincularPorTelefone("joao@x.com", "ana@x.com")).toBe(false);
  });
});

describe("podeReivindicarPorTelefone", () => {
  const sessao = { id: "google-123", email: "juliannvolz@gmail.com" };

  it("permite quando o cadastro ainda nao tem conta social", () => {
    expect(
      podeReivindicarPorTelefone({ googleId: null, email: "outro@email.com" }, sessao),
    ).toBe(true);
  });

  it("permite quando o cadastro ja e desta conta", () => {
    expect(
      podeReivindicarPorTelefone({ googleId: "google-123", email: "antigo@email.com" }, sessao),
    ).toBe(true);
  });

  it("bloqueia cadastro ligado a OUTRA conta social", () => {
    expect(
      podeReivindicarPorTelefone({ googleId: "google-999", email: "outro@email.com" }, sessao),
    ).toBe(false);
  });

  it("o caso real: cadastro com outro e-mail e sem googleId pode ser reivindicado", () => {
    // reserva feita com eserdeoliveira579@gmail.com, login com juliannvolz@gmail.com
    expect(
      podeReivindicarPorTelefone({ googleId: null, email: "eserdeoliveira579@gmail.com" }, sessao),
    ).toBe(true);
  });

  it("googleId GERADO localmente nao bloqueia: o dono de verdade retoma (bug do 28/10)", () => {
    // a reserva gravou o uuid da sessao efemera como googleId; ao voltar pelo
    // Google real (sub numerico), o cliente nao podia ver os proprios horarios
    expect(
      podeReivindicarPorTelefone(
        {
          googleId: "7806381f-1b3e-4504-b540-07f7a7810a8c",
          email: "juliannvolz@gmail.com",
        },
        sessao,
      ),
    ).toBe(true);
  });
});

describe("idGeradoLocalmente", () => {
  it("reconhece o uuid v4 gerado pelo Auth.js", () => {
    expect(idGeradoLocalmente("7806381f-1b3e-4504-b540-07f7a7810a8c")).toBe(true);
    expect(idGeradoLocalmente("ABCDEF01-2345-6789-ABCD-EF0123456789")).toBe(true);
  });

  it("ids reais de provedor sao donos legitimos", () => {
    // Google: ~21 digitos numericos
    expect(idGeradoLocalmente("109872641245260919824")).toBe(false);
    // Apple: sub com pontos
    expect(idGeradoLocalmente("001241.abc123def456.7890")).toBe(false);
    // Facebook: numerico curto
    expect(idGeradoLocalmente("1234567890")).toBe(false);
    // nosso formato interno de teste
    expect(idGeradoLocalmente("google-123")).toBe(false);
  });

  it("rejeita vazio", () => {
    expect(idGeradoLocalmente(null)).toBe(false);
    expect(idGeradoLocalmente(undefined)).toBe(false);
    expect(idGeradoLocalmente("")).toBe(false);
  });
});

describe("formaDoVinculo", () => {
  const sessao = { id: "google-123", email: "juliannvolz@gmail.com" };

  it("vira dono quando o e-mail bate", () => {
    expect(formaDoVinculo({ email: "juliannvolz@gmail.com" }, sessao)).toBe("dono");
    expect(formaDoVinculo({ email: "JULIANNVOLZ@gmail.com" }, sessao)).toBe("dono");
  });

  it("vira dono quando o cadastro nao tem e-mail", () => {
    expect(formaDoVinculo({ email: null }, sessao)).toBe("dono");
  });

  it("vira reivindicacao (revogavel) quando o e-mail e outro", () => {
    // o caso real: nunca grava googleId no cadastro de outra pessoa
    expect(formaDoVinculo({ email: "eserdeoliveira579@gmail.com" }, sessao)).toBe(
      "reivindicacao",
    );
  });
});

describe("whatsapp", () => {
  it("normaliza o numero internacional", () => {
    expect(whatsappNumber("(47) 99999-8888")).toBe("5547999998888");
    expect(whatsappNumber("5547999998888")).toBe("5547999998888");
  });

  it("monta o link com a mensagem ja escrita", () => {
    const link = whatsappLink("47999998888", "Ola, Dudu");
    expect(link.startsWith("https://wa.me/5547999998888?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe("Ola, Dudu");
  });

  const conversa = {
    cliente: { name: "Joana", phone: "47988887777" },
    servico: { name: "Barba Completa", durationMin: 30 },
    profissional: { name: "Dudu" },
    dataISO: "2026-10-26",
    hora: "14:30",
    preco: "R$ 40,00",
    endereco: "R. Walter Marquardt, 878, Vila Nova",
    codigo: "ABC12345",
  };

  it("a mensagem do dono para o cliente tem data, servico e codigo", () => {
    const msg = mensagemParaCliente(conversa);
    expect(msg).toContain("Joana");
    expect(msg).toContain("26/10/2026");
    expect(msg).toContain("14:30");
    expect(msg).toContain("Barba Completa");
    expect(msg).toContain("ABC12345");
    expect(msg).toContain("R$ 40,00");
  });

  it("a mensagem do cliente para a barbearia tem o resumo da reserva", () => {
    const msg = mensagemParaBarbearia(conversa);
    expect(msg).toContain("Joana");
    expect(msg).toContain("26/10/2026");
    expect(msg).toContain("Barba Completa");
    expect(msg).toContain("ABC12345");
  });

  it("o aviso interno de nova reserva leva o telefone", () => {
    const msg = mensagemNovoAgendamento(conversa);
    expect(msg).toContain("47988887777");
    expect(msg).toContain("ABC12345");
  });
});
