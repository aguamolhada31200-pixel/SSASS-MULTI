// Dados de exemplo (estados populados para demo/dev — blueprint 10.3).

export type PropStatus = "ocupado" | "disponivel" | "em_obras" | "inativo";
export type PropType = "al" | "tradicional" | "estudantes" | "comercial";

export interface Property {
  id: string;
  name: string;
  type: PropType;
  address: string;
  city: string;
  district: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  year: number;
  status: PropStatus;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number; // 0 se vago
  monthlyExpenses: number; // prestação + despesas fixas mensais
  tenant?: string;
  vacantDays?: number;
  gradient: string; // placeholder visual
}

export const PROPERTIES: Property[] = [
  {
    id: "boavista",
    name: "Apt. T2 Boavista",
    type: "tradicional",
    address: "Rua da Boavista 124, 2º Dto",
    city: "Porto",
    district: "Porto",
    area: 78,
    bedrooms: 2,
    bathrooms: 1,
    year: 2004,
    status: "ocupado",
    purchasePrice: 165000,
    currentValue: 198000,
    monthlyRent: 950,
    monthlyExpenses: 610,
    tenant: "João Silva",
    gradient: "from-[#8B5E3C] to-[#5C3D2E]",
  },
  {
    id: "almirante",
    name: "T1 Almirante Reis",
    type: "tradicional",
    address: "Av. Almirante Reis 210, 4º",
    city: "Lisboa",
    district: "Lisboa",
    area: 52,
    bedrooms: 1,
    bathrooms: 1,
    year: 1998,
    status: "ocupado",
    purchasePrice: 210000,
    currentValue: 245000,
    monthlyRent: 1100,
    monthlyExpenses: 880,
    tenant: "Maria Costa",
    gradient: "from-[#6B4C3B] to-[#2E1A0E]",
  },
  {
    id: "coimbra",
    name: "Quartos Coimbra (T3)",
    type: "estudantes",
    address: "Rua Lourenço de Almeida 33",
    city: "Coimbra",
    district: "Coimbra",
    area: 96,
    bedrooms: 3,
    bathrooms: 2,
    year: 2010,
    status: "ocupado",
    purchasePrice: 140000,
    currentValue: 168000,
    monthlyRent: 1200,
    monthlyExpenses: 540,
    tenant: "3 estudantes",
    gradient: "from-[#9B7F3F] to-[#5C3D2E]",
  },
  {
    id: "aveiro",
    name: "Studio Aveiro",
    type: "tradicional",
    address: "Rua de Eça de Queirós 8",
    city: "Aveiro",
    district: "Aveiro",
    area: 40,
    bedrooms: 0,
    bathrooms: 1,
    year: 2019,
    status: "disponivel",
    purchasePrice: 98000,
    currentValue: 112000,
    monthlyRent: 0,
    monthlyExpenses: 180,
    vacantDays: 47,
    gradient: "from-[#C8A664] to-[#9B7F3F]",
  },
  {
    id: "braga",
    name: "Apt. T2 Braga",
    type: "tradicional",
    address: "Rua do Souto 51",
    city: "Braga",
    district: "Braga",
    area: 84,
    bedrooms: 2,
    bathrooms: 2,
    year: 1990,
    status: "em_obras",
    purchasePrice: 120000,
    currentValue: 155000,
    monthlyRent: 0,
    monthlyExpenses: 95,
    gradient: "from-[#8B5E3C] to-[#6B4C3B]",
  },
];

export const PROP_TYPE_LABEL: Record<PropType, string> = {
  al: "Alojamento Local",
  tradicional: "Arrendamento",
  estudantes: "Estudantes",
  comercial: "Comercial",
};

export const STATUS_LABEL: Record<PropStatus, string> = {
  ocupado: "Ocupado",
  disponivel: "Disponível",
  em_obras: "Em obras",
  inativo: "Inativo",
};

// Receita vs Despesa — 12 meses (€)
export const MONTHLY_FLOW = [
  { mes: "Jan", receita: 3250, despesa: 1180 },
  { mes: "Fev", receita: 3250, despesa: 940 },
  { mes: "Mar", receita: 3250, despesa: 1320 },
  { mes: "Abr", receita: 3250, despesa: 1020 },
  { mes: "Mai", receita: 3250, despesa: 1450 },
  { mes: "Jun", receita: 3250, despesa: 980 },
  { mes: "Jul", receita: 4200, despesa: 1100 },
  { mes: "Ago", receita: 4200, despesa: 1240 },
  { mes: "Set", receita: 4450, despesa: 1380 },
  { mes: "Out", receita: 4450, despesa: 1010 },
  { mes: "Nov", receita: 4450, despesa: 1190 },
  { mes: "Dez", receita: 4450, despesa: 1620 },
];

export interface AlertItem {
  id: string;
  severity: "danger" | "warning" | "info" | "success";
  title: string;
  context: string;
  when: string;
}

export const ALERTS: AlertItem[] = [
  { id: "a1", severity: "danger", title: "Renda em atraso · 1.100 €", context: "Maria Costa · T1 Almirante Reis", when: "há 5 dias" },
  { id: "a2", severity: "warning", title: "Contrato expira em 22 dias", context: "João Silva · Apt. Boavista", when: "renova 5 jul" },
  { id: "a3", severity: "warning", title: "Studio Aveiro vago há 47 dias", context: "Cada mês vago custa ~600 €", when: "desde 27 abr" },
  { id: "a4", severity: "info", title: "IMI 2ª prestação", context: "Quartos Coimbra · 184 €", when: "vence 31 ago" },
  { id: "a5", severity: "success", title: "Pagamento recebido · 1.200 €", context: "Estudantes Coimbra", when: "há 2 horas" },
];

export interface UpcomingEvent {
  day: string;
  month: string;
  title: string;
  context: string;
}

export const UPCOMING: UpcomingEvent[] = [
  { day: "25", month: "Jun", title: "Vistoria", context: "Apt. T2 Boavista · Porto" },
  { day: "30", month: "Jun", title: "Renovação de contrato", context: "Quarto 3 · Coimbra" },
  { day: "05", month: "Jul", title: "Fim de obra previsto", context: "Apt. T2 Braga" },
  { day: "10", month: "Jul", title: "Pagamento de seguro", context: "T1 Almirante Reis" },
];

// ── Rede de Investidores — anúncios type-aware ──
export type ListingType = "parceiro" | "cedo_posicao" | "oportunidade";

export interface NetworkListing {
  id: string;
  type: ListingType;
  businessModel: "arrendamento" | "flip" | "cedencia";
  title: string;
  city: string;
  district: string;
  author: string;
  authorVerified: boolean;
  authorProjects: number;
  authorRating?: number;
  gradient: string;
  // métricas (preenchidas conforme o tipo)
  capitalRequired?: number;
  yieldPct?: number;
  rentabilidadePct?: number;
  monthlyRent?: number;
  price?: number;
  estimatedProfit?: number;
  roiPct?: number;
  termMonths?: number;
  totalInvestment?: number;
  partnerSplit?: string;
}

export const LISTINGS: NetworkListing[] = [
  {
    id: "l1",
    type: "oportunidade",
    businessModel: "arrendamento",
    title: "T2 em zona histórica do Porto",
    city: "Porto",
    district: "Porto",
    author: "Carlos Mendes",
    authorVerified: true,
    authorProjects: 7,
    authorRating: 4.8,
    gradient: "from-[#8B5E3C] to-[#5C3D2E]",
    price: 142000,
    capitalRequired: 38000,
    yieldPct: 7.2,
    rentabilidadePct: 9.6,
    monthlyRent: 950,
  },
  {
    id: "l2",
    type: "cedo_posicao",
    businessModel: "cedencia",
    title: "CPCV assinado · Studio Alfama",
    city: "Lisboa",
    district: "Lisboa",
    author: "Sofia Lopes",
    authorVerified: true,
    authorProjects: 3,
    authorRating: 4.6,
    gradient: "from-[#6B4C3B] to-[#2E1A0E]",
    capitalRequired: 18500,
    estimatedProfit: 21000,
    roiPct: 38,
    termMonths: 3,
  },
  {
    id: "l3",
    type: "parceiro",
    businessModel: "flip",
    title: "Reabilitação de prédio · 4 frações Aveiro",
    city: "Aveiro",
    district: "Aveiro",
    author: "Daniel Silva",
    authorVerified: false,
    authorProjects: 0,
    gradient: "from-[#9B7F3F] to-[#5C3D2E]",
    totalInvestment: 280000,
    capitalRequired: 90000,
    roiPct: 28,
    partnerSplit: "60 / 40",
  },
  {
    id: "l4",
    type: "oportunidade",
    businessModel: "flip",
    title: "Moradia para remodelar · Cascais",
    city: "Cascais",
    district: "Lisboa",
    author: "Rita Antunes",
    authorVerified: true,
    authorProjects: 12,
    authorRating: 4.9,
    gradient: "from-[#C8A664] to-[#9B7F3F]",
    price: 320000,
    estimatedProfit: 68000,
    roiPct: 21,
    termMonths: 9,
  },
];

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  parceiro: "Procuro parceiro",
  cedo_posicao: "Cedência de posição",
  oportunidade: "Oportunidade",
};

// ── Projeto colaborativo (dashboard financeiro de parceria) ──
export const COLLAB_PROJECT = {
  id: "aveiro-flip",
  number: "002",
  name: "Reabilitação Aveiro · 4 frações",
  city: "Aveiro",
  status: "Em obras",
  businessModel: "flip" as const,
  purchasePrice: 180000,
  acquisitionCosts: 12400, // IMT, IS, escritura, comissão
  renovationBudget: 25000,
  renovationSpent: 18000,
  saleValue: 240000,
  taxRatePct: 19,
  partners: [
    { name: "Daniel Silva", pct: 60, color: "#5C3D2E" },
    { name: "João Pereira", pct: 40, color: "#C8A664" },
  ],
  expensesByCategory: [
    { categoria: "Cozinha", valor: 6200 },
    { categoria: "Canalização", valor: 3100 },
    { categoria: "Eletricidade", valor: 2800 },
    { categoria: "Pintura", valor: 3400 },
    { categoria: "Mobiliário", valor: 2500 },
  ],
  budgetTimeline: [
    { mes: "Mar", previsto: 5000, real: 4200 },
    { mes: "Abr", previsto: 12000, real: 9800 },
    { mes: "Mai", previsto: 19000, real: 15200 },
    { mes: "Jun", previsto: 25000, real: 18000 },
  ],
};

export const STUDENTS = [
  { name: "Bruno Ferreira", room: "Quarto 1", university: "UC", course: "Engenharia Inf.", year: "3º", rent: 400, status: "Em dia" },
  { name: "Tiago Nunes", room: "Quarto 2", university: "UC", course: "Direito", year: "2º", rent: 400, status: "Em dia" },
  { name: "Inês Marques", room: "Quarto 3", university: "UC", course: "Medicina", year: "1º", rent: 400, status: "Atraso 4d" },
];
