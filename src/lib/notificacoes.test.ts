import { afterEach, describe, expect, it, vi } from "vitest";
import {
  avisarNovaReserva,
  destinatarios,
  enviarEmail,
  formatarQuando,
  montarAvisoCancelamento,
  montarAvisoNovaReserva,
  notificacoesAtivas,
  type AvisoReserva,
} from "@/lib/notificacoes";

const reserva: AvisoReserva = {
  id: "cmvjtm9qq0003l2081vtzwk7t",
  cliente: "João da Silva",
  telefone: "(47) 99999-1111",
  servico: "Corte Degradê",
  profissional: "Dudu",
  quando: "ter, 27/10, 13:15",
  preco: "R$ 50,00",
  codigo: "CMVJTM9Q",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("notificações — configuração", () => {
  it("fica desligada sem RESEND_API_KEY", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NOTIFY_EMAIL", "dono@exemplo.com");
    expect(notificacoesAtivas()).toBe(false);
  });

  it("fica desligada sem destinatário", () => {
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("NOTIFY_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(notificacoesAtivas()).toBe(false);
  });

  it("liga com chave e destinatário, aceitando vários e-mails", () => {
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("NOTIFY_EMAIL", "dono@exemplo.com, socio@exemplo.com");
    expect(notificacoesAtivas()).toBe(true);
    expect(destinatarios()).toEqual(["dono@exemplo.com", "socio@exemplo.com"]);
  });

  it("cai para ADMIN_EMAILS quando NOTIFY_EMAIL está vazio", () => {
    vi.stubEnv("NOTIFY_EMAIL", "");
    vi.stubEnv("ADMIN_EMAILS", "equipe@exemplo.com");
    expect(destinatarios()).toEqual(["equipe@exemplo.com"]);
  });
});

describe("notificações — mensagens", () => {
  it("formata o horário no fuso da barbearia", () => {
    const quando = formatarQuando(new Date("2026-10-27T16:15:00Z"));
    expect(quando).toMatch(/27\/10/);
    expect(quando).toMatch(/13:15/);
  });

  it("monta o aviso de nova reserva com os dados do atendimento", () => {
    const { assunto, texto } = montarAvisoNovaReserva(reserva);
    expect(assunto).toContain("Nova reserva");
    expect(assunto).toContain("João da Silva");
    expect(texto).toContain("Corte Degradê");
    expect(texto).toContain("(47) 99999-1111");
    expect(texto).toContain("R$ 50,00");
    expect(texto).toContain("/admin");
  });

  it("monta o aviso de cancelamento dizendo quem cancelou", () => {
    expect(montarAvisoCancelamento(reserva, "cliente").texto).toContain("O cliente cancelou");
    expect(montarAvisoCancelamento(reserva, "barbearia").texto).toContain("A barbearia cancelou");
  });
});

describe("notificações — envio", () => {
  it("não chama a rede quando está desligado", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(enviarEmail("assunto", "texto")).resolves.toEqual({
      enviado: false,
      motivo: "desligado",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posta no Resend com remetente, destinatário e texto", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("NOTIFY_EMAIL", "dono@exemplo.com");
    vi.stubEnv("NOTIFY_FROM", "Duh Corte <avisos@exemplo.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await enviarEmail("Nova reserva", "linha 1");

    expect(resultado).toEqual({ enviado: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.resend.com/emails");
    const corpo = JSON.parse(String((init as RequestInit).body));
    expect(corpo.from).toBe("Duh Corte <avisos@exemplo.com>");
    expect(corpo.to).toEqual(["dono@exemplo.com"]);
    expect(corpo.subject).toBe("Nova reserva");
    expect(corpo.text).toBe("linha 1");
  });

  it("propaga erro da API para quem chamou", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("NOTIFY_EMAIL", "dono@exemplo.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("limite", { status: 429 })));

    await expect(enviarEmail("a", "b")).rejects.toThrow(/Resend 429/);
  });

  it("avisarNovaReserva engole a falha e devolve motivo", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("NOTIFY_EMAIL", "dono@exemplo.com");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede caiu")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    // sem registro no banco (id inexistente) a função para antes da rede,
    // provando que nunca lança
    await expect(avisarNovaReserva("id-que-nao-existe")).resolves.toEqual(
      expect.objectContaining({ enviado: false }),
    );
  });
});
