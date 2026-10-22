import { describe, expect, it } from "vitest";
import {
  customerIdFromPhone,
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
    expect(customerIdFromPhone("+55 47 99999-8888")).toBe("phone:5547999998888");
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
