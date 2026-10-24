// Duh Corte Barbearia — fonte única de verdade do conteudo e dos dados de negocio.
//
// Regra de ouro: NENHUM valor de preço aqui e inventado sem marcacao.
// Todo item traz `priceConfirmed`. Itens não confirmados exibem a nota
// "Tabela em validação" no site e aparecem na fila de pendencias do painel admin.

export type PendingItem = {
  id: string;
  label: string;
  detail?: string;
  source: "instagram" | "maps" | "cashbarber" | "interno";
};

export const business = {
  name: "Duh Corte Barbearia",
  shortName: "Duh Corte",
  legalName: "Duh Corte Barbearia",
  tagline: "Estilo é atitude. Acerte, ganhe!",
  hashtag: "#RUMOAOHEXA",
  city: "Jaraguá do Sul",
  state: "SC",
  country: "BR",
  timezone: "America/Sao_Paulo",
  address: {
    street: "R. Walter Marquardt, 878",
    neighborhood: "Vila Nova",
    city: "Jaraguá do Sul",
    state: "SC",
    zip: "89259-700",
    country: "Brasil",
    mapsUrl: "https://maps.google.com/?cid=12222460781727324303",
  },
  phone: "+55 47 99981-5500",
  phoneE164: "+5547999815500",
  whatsapp: "5547999815500",
  email: null,
  instagram: "https://instagram.com/duhcortebarbearia",
  instagramHandle: "@duhcortebarbearia",
  rating: { value: 5, count: 123, source: "Google" },
  followers: 1158,
  bookingUrl: "https://cashbarber.com.br/duhcortebarbearia",
} as const;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const weekdayLabel: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const weekdayShort: Record<Weekday, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

// Fonte: Google Maps (perfil da loja). Instagram informa "segunda a sexta das 9:00 às 19:00";
// a divergencia de sexta (18:00 no Google) esta registrada em `pending`.
export const openingHours: Record<Weekday, { open: number; close: number } | null> = {
  0: null,
  1: { open: 9 * 60, close: 19 * 60 },
  2: { open: 9 * 60, close: 19 * 60 },
  3: { open: 9 * 60, close: 19 * 60 },
  4: { open: 9 * 60, close: 19 * 60 },
  5: { open: 9 * 60, close: 19 * 60 },
  6: null,
};

export const openingHoursGoogle: Record<Weekday, { open: number; close: number } | null> = {
  ...openingHours,
  5: { open: 9 * 60, close: 18 * 60 },
};

export const bookingRules = {
  minLeadMinutes: 60,
  cancelWindowMinutes: 60,
  maxAdvanceDays: 60,
  slotStepMinutes: 15,
  bufferMinutes: 15,
  penaltyHours: 12,
} as const;

export const paymentMethods = [
  { id: "pix", label: "Pix", detail: "QR Code gerado na hora, enviado no WhatsApp", instant: true },
  { id: "debito", label: "Cartão de débito", detail: "Na barbearia", instant: false },
  { id: "credito", label: "Cartão de crédito", detail: "Na barbearia", instant: false },
  { id: "dinheiro", label: "Dinheiro", detail: "Na barbearia", instant: false },
] as const;

export type ServiceCategory = {
  id: string;
  name: string;
  blurb: string;
  order: number;
};

export const serviceCategories: ServiceCategory[] = [
  { id: "cabelo", name: "Cabelo", blurb: "Degradê, social, navalhado e finalização, com atendimento individual.", order: 1 },
  { id: "barba", name: "Barba", blurb: "Toalha quente, navalha afiada e acabamento preciso.", order: 2 },
  { id: "combo", name: "Combos", blurb: "Corte + barba + sobrancelha na mesma cadeira.", order: 3 },
  { id: "infantil", name: "Infantil", blurb: "Corte infantil com paciência e do jeito da criança.", order: 4 },
  { id: "extras", name: "Extras", blurb: "Finalização, hidratação e produtos da casa.", order: 5 },
];

export type ServiceSeed = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  durationMin: number;
  priceCents: number;
  priceConfirmed: boolean;
  featured?: boolean;
  style?: string;
};

/**
 * Preços = referência de mercado local (Jaraguá do Sul) até a tabela oficial do cliente.
 * `priceConfirmed: false` -> o site sinaliza "tabela em validação" e o admin lista a pendencia.
 */
export const services: ServiceSeed[] = [
  {
    id: "corte-social",
    name: "Corte Social",
    description: "Corte clássico, sem desenhos, respeitando a linha do cabelo e o formato do rosto.",
    categoryId: "cabelo",
    durationMin: 40,
    priceCents: 4500,
    priceConfirmed: false,
    featured: false,
    style: "social",
  },
  {
    id: "corte-degrade",
    name: "Corte Degradê",
    description: "Degradê baixo, médio ou alto, bem conectado e com linha frontal marcada.",
    categoryId: "cabelo",
    durationMin: 45,
    priceCents: 5000,
    priceConfirmed: false,
    featured: true,
    style: "degrade",
  },
  {
    id: "corte-navalhado",
    name: "Corte Navalhado",
    description: "Transição desenhada a navalha, com acabamento preciso nas laterais.",
    categoryId: "cabelo",
    durationMin: 50,
    priceCents: 5500,
    priceConfirmed: false,
    featured: false,
    style: "navalhado",
  },
  {
    id: "barba",
    name: "Barba Completa",
    description: "Toalha quente, navalha afiada, bigode alinhado e finalização.",
    categoryId: "barba",
    durationMin: 30,
    priceCents: 4000,
    priceConfirmed: false,
    featured: true,
  },
  {
    id: "sobrancelha",
    name: "Sobrancelha na Navalha",
    description: "Design e alinhamento preciso na navalha.",
    categoryId: "barba",
    durationMin: 15,
    priceCents: 2000,
    priceConfirmed: false,
  },
  {
    id: "corte-barba",
    name: "Corte + Barba",
    description: "O combo mais pedido: visual completo em uma única visita.",
    categoryId: "combo",
    durationMin: 70,
    priceCents: 8000,
    priceConfirmed: false,
    featured: true,
  },
  {
    id: "corte-barba-sobrancelha",
    name: "Corte + Barba + Sobrancelha",
    description: "O pacote completo, do cabelo à sobrancelha.",
    categoryId: "combo",
    durationMin: 90,
    priceCents: 9500,
    priceConfirmed: false,
  },
  {
    id: "corte-infantil",
    name: "Corte Infantil",
    description: "Corte para crianças, com abordagem leve e hora reservada.",
    categoryId: "infantil",
    durationMin: 30,
    priceCents: 3500,
    priceConfirmed: false,
  },
  {
    id: "finalizacao",
    name: "Finalização",
    description: "Ajuste de pontas, cleanup e finalização do visual.",
    categoryId: "extras",
    durationMin: 15,
    priceCents: 2000,
    priceConfirmed: false,
  },
  {
    id: "hidratacao",
    name: "Hidratação Capilar",
    description: "Hidratação profunda com produto da casa.",
    categoryId: "extras",
    durationMin: 20,
    priceCents: 3000,
    priceConfirmed: false,
  },
];

export type ProfessionalSeed = {
  id: string;
  name: string;
  role: string;
  bio: string;
  specialty: string;
  photo: string | null;
  order: number;
  confirmed: boolean;
};

export const professionals: ProfessionalSeed[] = [
  {
    id: "dudu",
    name: "Dudu",
    role: "Master Barber / Fundador",
    bio: "Dono da Duh Corte. Assumiu a cadeira e a missão de transformar a rotina de corte em experiência.",
    specialty: "Degradê, moicano e acabamento",
    photo: null,
    order: 1,
    confirmed: true,
  },
  {
    id: "equipe-duh-corte",
    name: "Equipe Duh Corte",
    role: "Barbeiro(a)",
    bio: "Profissionais da casa, com agenda própria e estilo autoral.",
    specialty: "Corte e barba",
    photo: null,
    order: 2,
    confirmed: false,
  },
];

export type PlanSeed = {
  id: string;
  name: string;
  priceCents: number;
  period: "mensal";
  description: string;
  perks: string[];
  highlight?: boolean;
  priceConfirmed: boolean;
};

export const plans: PlanSeed[] = [
  {
    id: "corte",
    name: "Corte",
    priceCents: 9990,
    period: "mensal",
    description: "Para quem não deixa o visual passar do prazo.",
    perks: ["Cortes ilimitados no mês", "Agendamento prioritário", "Preço fixo, sem surpresa"],
    priceConfirmed: false,
  },
  {
    id: "corte-barba",
    name: "Corte + Barba",
    priceCents: 15900,
    period: "mensal",
    description: "O pacote completo: cabelo e barba sempre no ponto.",
    perks: ["Cortes e barbas ilimitados", "Agendamento prioritário", "Descontos em produtos da casa"],
    highlight: true,
    priceConfirmed: false,
  },
  {
    id: "barba",
    name: "Barba",
    priceCents: 11900,
    period: "mensal",
    description: "Para quem cuida do detalhe todos os dias.",
    perks: ["Barbas ilimitadas", "Acesso prioritário à agenda", "Assistência de finalização"],
    priceConfirmed: false,
  },
];

export type TestimonialSeed = {
  id: string;
  author: string;
  initials: string;
  rating: number;
  text: string;
  source: string;
  sourceUrl: string;
};

export const testimonials: TestimonialSeed[] = [
  {
    id: "t1",
    author: "wsluthieria",
    initials: "WL",
    rating: 5,
    text: "Ótimo ambiente, atendimento exemplar e um profissional extremamente qualificado. Duh Corte distoa para muito além dos padrões de locais e serviços encontrados na cidade.",
    source: "Google",
    sourceUrl: "https://maps.google.com/?cid=12222460781727324303",
  },
  {
    id: "t2",
    author: "Suh Camargo",
    initials: "SC",
    rating: 5,
    text: "Ótimo atendimento, lugar super agradável, profissionais muito caprichosos.",
    source: "Google",
    sourceUrl: "https://maps.google.com/?cid=12222460781727324303",
  },
  {
    id: "t3",
    author: "ERICO Brizolla",
    initials: "EB",
    rating: 5,
    text: "Atendimento nota 10, ambiente muito bom!",
    source: "Google",
    sourceUrl: "https://maps.google.com/?cid=12222460781727324303",
  },
  {
    id: "t4",
    author: "André Ramos",
    initials: "AR",
    rating: 5,
    text: "Atendimento excepcional e agilidade. Obrigada por me ajudar com meu corte.",
    source: "Google",
    sourceUrl: "https://maps.google.com/?cid=12222460781727324303",
  },
];

export type GalleryItemSeed = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  tag: string;
  order: number;
};

export const gallery: GalleryItemSeed[] = [
  {
    id: "g1",
    src: "/gallery/degrade-medio.jpg",
    alt: "Corte degradê médio com linha frontal marcada",
    caption: "Degradê médio",
    tag: "Degradê",
    order: 1,
  },
  {
    id: "g2",
    src: "/gallery/degrade-alto.jpg",
    alt: "Corte com design na lateral e degradê alto",
    caption: "Degradê alto",
    tag: "Navalha",
    order: 2,
  },
  {
    id: "g3",
    src: "/gallery/moica.jpg",
    alt: "Corte moicano com topo natural",
    caption: "Moicano de respeito",
    tag: "Social",
    order: 3,
  },
  {
    id: "g4",
    src: "/gallery/nova-unidade.jpg",
    alt: "Chave da nova unidade da Duh Corte",
    caption: "A chave da nova unidade",
    tag: "A casa",
    order: 4,
  },
];

export const faqs = [
  {
    q: "Preciso agendar com antecedência?",
    a: "Sim. A agenda abre com 60 dias de antecedência e o atendimento é sempre com hora marcada, para garantir que a cadeira esteja reservada para você.",
  },
  {
    q: "Como funciona a assinatura do Clube do Assinante?",
    a: "Você escolhe o plano, a vaga na agenda fica reservada e o corte acontece sem fila. A assinatura é mensal e o pagamento pode ser feito por Pix ou cartão.",
  },
  {
    q: "Quais formas de pagamento vocês aceitam?",
    a: "O pagamento é feito na barbearia, no momento do atendimento: Pix, cartão de débito, cartão de crédito ou dinheiro. Não há cobrança online.",
  },
  {
    q: "Posso salvar o horário na minha agenda?",
    a: "Sim. Ao concluir a reserva você pode baixar o horário para o Google Agenda, Apple Calendar ou Outlook — o lembrete aparece com 2 horas de antecedência.",
  },
  {
    q: "Posso cancelar ou remarcar?",
    a: "Sim. O cancelamento sem custo pode ser feito até 1 hora antes do horário. Atrasos acima de 12 horas podem gerar penalidade na assinatura.",
  },
  {
    q: "Fazem corte infantil?",
    a: "Sim. A agenda infantil tem hora reservada, com mais tolerância de tempo e abordagem para a criança.",
  },
  {
    q: "Vocês vendem produtos?",
    a: "Sim. A casa tem linha própria de produtos para cabelo e barba, disponíveis na loja e também no atendimento.",
  },
];

export const pending: PendingItem[] = [
  {
    id: "precos",
    label: "Tabela oficial de preços e durações",
    detail: "Valores atuais são referência de mercado local (Jaraguá do Sul).",
    source: "interno",
  },
  {
    id: "horario-sexta",
    label: "Horário de sexta",
    detail: "Google Maps indica 9:00-18:00; a bio do Instagram informa 9:00-19:00.",
    source: "maps",
  },
  {
    id: "equipe",
    label: "Equipe completa e fotos dos profissionais",
    detail: "Apenas 'Dudu' (fundador) está confirmado hoje.",
    source: "instagram",
  },
  {
    id: "planos",
    label: "Valores do Clube do Assinante",
    detail: "A plataforma Cashbarber confirma que o clube existe (acesso_clube), sem expor os valores.",
    source: "cashbarber",
  },
  {
    id: "pix",
    label: "Chave Pix da casa e CNPJ",
    detail: "Necessário para o pagamento presencial via Pix e para a emissão fiscal.",
    source: "interno",
  },
  {
    id: "fotos",
    label: "Acervo fotográfico de alta resolução",
    detail: "Trabalho da casa, nova unidade, clientes e o dono no comando.",
    source: "instagram",
  },
  {
    id: "logo-vetor",
    label: "Logo em SVG",
    detail: "Recebido apenas em PNG com fundo branco.",
    source: "interno",
  },
];

export const navLinks = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#precos", label: "Preços" },
  { href: "/#planos", label: "Clube" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#galeria", label: "Galeria" },
  { href: "/#local", label: "Local" },
];

export const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
