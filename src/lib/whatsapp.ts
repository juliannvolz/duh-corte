/**
 * WhatsApp como canal de confirmacao.
 *
 * Estrategia: links `wa.me` com a mensagem ja montada. Zero cadastro, zero
 * API, zero custo — e o canal que a barbearia ja usa o dia inteiro. A troca
 * por uma API oficial depois fica isolada neste arquivo.
 */

export type ConversaAgendamento = {
  cliente: { name: string; phone: string };
  servico: { name: string; durationMin: number };
  profissional: { name: string };
  /** "2026-10-26" */
  dataISO: string;
  /** "14:30" */
  hora: string;
  preco: string;
  endereco: string;
  codigo: string;
};

/** Numero no formato internacional aceito pelo wa.me (55 + DDD + numero). */
export function whatsappNumber(phone: string): string {
  const digitos = phone.replace(/\D/g, "");
  if (digitos.startsWith("55")) return digitos;
  return `55${digitos}`;
}

/** Link de conversa com o texto ja escrito. */
export function whatsappLink(phone: string, texto: string): string {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(texto)}`;
}

/** Mensagem que o DONO manda para o cliente (confirmacao / lembrete). */
export function mensagemParaCliente(a: ConversaAgendamento): string {
  return [
    `Olá, ${a.cliente.name}! Aqui é da Duh Corte Barbearia.`,
    ``,
    `Seu horário está reservado:`,
    `📅 ${a.dataISO.split("-").reverse().join("/")} às ${a.hora}`,
    `✂️ ${a.servico.name} (${a.servico.durationMin} min)`,
    `💈 ${a.profissional.name}`,
    `💰 ${a.preco}`,
    `📍 ${a.endereco}`,
    ``,
    `Código da reserva: ${a.codigo}`,
    ``,
    `Se precisar remarcar ou cancelar, é só me chamar por aqui.`,
  ].join("\n");
}

/** Mensagem que o DONO usa para avisar que a reserva entrou (uso interno). */
export function mensagemNovoAgendamento(a: ConversaAgendamento): string {
  return [
    `Novo agendamento no site:`,
    `👤 ${a.cliente.name} — ${a.cliente.phone}`,
    `📅 ${a.dataISO.split("-").reverse().join("/")} às ${a.hora}`,
    `✂️ ${a.servico.name} (${a.servico.durationMin} min) · ${a.profissional.name}`,
    `💰 ${a.preco}`,
    `Código: ${a.codigo}`,
  ].join("\n");
}

/** Mensagem que o CLIENTE manda para a barbearia (confirmar / remarcar). */
export function mensagemParaBarbearia(a: ConversaAgendamento): string {
  return [
    `Olá! Acabei de reservar na Duh Corte.`,
    ``,
    `👤 ${a.cliente.name}`,
    `📅 ${a.dataISO.split("-").reverse().join("/")} às ${a.hora}`,
    `✂️ ${a.servico.name} (${a.servico.durationMin} min)`,
    `💰 ${a.preco}`,
    `Código: ${a.codigo}`,
  ].join("\n");
}
