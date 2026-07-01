import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

// ── Types ──

export type CollabType = "reabilitacao" | "arrendamento";

export type ProjectStatus =
  | "planeamento"
  | "aquisicao"
  | "obras"
  | "no_mercado"
  | "vendido"
  | "arrendado"
  | "concluido";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planeamento: "Planeamento",
  aquisicao: "Aquisição",
  obras: "Em obras",
  no_mercado: "No mercado",
  vendido: "Vendido",
  arrendado: "Arrendado",
  concluido: "Concluído",
};

export const STATUS_TONE: Record<ProjectStatus, string> = {
  planeamento: "info",
  aquisicao: "warning",
  obras: "warning",
  no_mercado: "gold",
  vendido: "success",
  arrendado: "success",
  concluido: "neutral",
};

export const TYPE_LABEL: Record<CollabType, string> = {
  reabilitacao: "Reabilitação",
  arrendamento: "Arrendamento",
};

export interface Partner {
  id: string;
  name: string;
  pct: number;
  color: string;
  avatarUrl?: string;
}

export interface ObraItem {
  id: string;
  categoria: string;
  descricao: string;
  orcamento: number;
  gasto: number;
  status: "pendente" | "em_curso" | "concluida";
  dataInicio?: string;
  dataFim?: string;
}

export interface CronogramaEtapa {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  concluida: boolean;
}

export interface DistribuicaoMensal {
  mes: string;
  receita: number;
  despesa: number;
}

export interface CollabProject {
  id: string;
  type: CollabType;
  number: string;
  title: string;
  city: string;
  district: string;
  coverImageUrl?: string;
  status: ProjectStatus;
  createdAt: string;
  partners: Partner[];

  // ── Reabilitação (flip) ──
  precoAquisicao?: number;
  custosAquisicao?: number; // IMT + IS + escritura + comissão
  orcamentoObras?: number;
  gastoObras?: number;
  valorVendaPrevisto?: number;
  valorVendaReal?: number;
  taxaImpostos?: number; // % mais-valias
  dataCompra?: string;
  dataVendaPrevista?: string;
  tempoDeObra?: string;
  zonaARU?: boolean;
  obras?: ObraItem[];
  cronograma?: CronogramaEtapa[];
  budgetTimeline?: { mes: string; previsto: number; real: number }[];
  expensesByCategory?: { categoria: string; valor: number }[];

  // ── Custos de detenção (holding costs) ──
  jurosMensais?: number;
  imiMensal?: number;
  condominioMensal?: number;
  seguroMensal?: number;

  // ── Arrendamento (parceria) ──
  precoImovel?: number;
  capitalInvestido?: number;
  rendaMensal?: number;
  despesasMensais?: number; // prestação + condomínio + seguro + IMI mensal
  taxaOcupacao?: number; // %
  yieldBruto?: number;
  yieldLiquido?: number;
  contratoTipo?: string; // "NRAU Tradicional", "Estudante", etc.
  contratoInicio?: string;
  contratoFim?: string;
  inquilino?: string;
  recibosEmitidos?: number;
  distribuicaoMensal?: DistribuicaoMensal[];

  // ── Arrendamento despesas breakdown ──
  prestacaoBancaria?: number;
  imiAnual?: number;
  seguroAnual?: number;
  condominioArr?: number;
  outrasDespesas?: number;
}

// ── Seed ──

const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1100&q=70`;

const SEED: CollabProject[] = [
  {
    id: "porto-flip",
    type: "reabilitacao",
    number: "001",
    title: "Reabilitação Baixa do Porto",
    city: "Porto",
    district: "Porto",
    coverImageUrl: IMG("1502672260266-1c1ef2d93688"),
    status: "obras",
    createdAt: "2026-02-15",
    partners: [
      { id: "jose-felix", name: "José Félix", pct: 40, color: "#5C3D2E" },
      { id: "pedro-alves", name: "Pedro Alves", pct: 35, color: "#C8A664" },
      { id: "rita-santos", name: "Rita Santos", pct: 25, color: "#4A7C59" },
    ],
    precoAquisicao: 310000,
    custosAquisicao: 22000,
    orcamentoObras: 88000,
    gastoObras: 22000,
    valorVendaPrevisto: 520000,
    taxaImpostos: 19,
    dataCompra: "2026-03-01",
    dataVendaPrevista: "2026-11-30",
    tempoDeObra: "5 meses",
    zonaARU: true,
    jurosMensais: 980,
    imiMensal: 85,
    condominioMensal: 65,
    seguroMensal: 35,
    obras: [
      { id: "o1", categoria: "Demolições", descricao: "Remoção paredes e pavimento", orcamento: 8000, gasto: 8000, status: "concluida", dataInicio: "2026-04-01", dataFim: "2026-04-20" },
      { id: "o2", categoria: "Canalização", descricao: "Rede de águas e esgotos nova", orcamento: 12000, gasto: 11200, status: "concluida", dataInicio: "2026-04-15", dataFim: "2026-05-15" },
      { id: "o3", categoria: "Eletricidade", descricao: "Quadro ITED + cablagem", orcamento: 9500, gasto: 2800, status: "em_curso", dataInicio: "2026-05-10" },
      { id: "o4", categoria: "Cozinha", descricao: "Remodelação completa c/ eletrodomésticos", orcamento: 15000, gasto: 0, status: "pendente" },
      { id: "o5", categoria: "Casas de banho", descricao: "2 WC completos", orcamento: 14000, gasto: 0, status: "pendente" },
      { id: "o6", categoria: "Pavimento", descricao: "Flutuante carvalho toda a fração", orcamento: 8500, gasto: 0, status: "pendente" },
      { id: "o7", categoria: "Pintura", descricao: "Interior completo + tetos falsos", orcamento: 7000, gasto: 0, status: "pendente" },
      { id: "o8", categoria: "Carpintarias", descricao: "Portas, roupeiros embutidos", orcamento: 6500, gasto: 0, status: "pendente" },
      { id: "o9", categoria: "Home staging", descricao: "Decoração para venda", orcamento: 4500, gasto: 0, status: "pendente" },
      { id: "o10", categoria: "Certificação", descricao: "Certificado energético + ficha técnica", orcamento: 500, gasto: 0, status: "pendente" },
      { id: "o11", categoria: "Limpeza final", descricao: "Limpeza profissional pós-obra", orcamento: 500, gasto: 0, status: "pendente" },
    ],
    cronograma: [
      { id: "e1", nome: "Aquisição (CPCV → Escritura)", dataInicio: "2026-03-01", dataFim: "2026-03-31", concluida: true },
      { id: "e2", nome: "Licenciamento (Câmara)", dataInicio: "2026-03-15", dataFim: "2026-04-01", concluida: true },
      { id: "e3", nome: "Obra", dataInicio: "2026-04-01", dataFim: "2026-09-01", concluida: false },
      { id: "e4", nome: "Certificação energética", dataInicio: "2026-09-01", dataFim: "2026-09-15", concluida: false },
      { id: "e5", nome: "Venda (mercado → CPCV → escritura)", dataInicio: "2026-09-15", dataFim: "2026-11-30", concluida: false },
    ],
    budgetTimeline: [
      { mes: "Abr", previsto: 20000, real: 16000 },
      { mes: "Mai", previsto: 40000, real: 22000 },
      { mes: "Jun", previsto: 55000, real: 22000 },
      { mes: "Jul", previsto: 70000, real: 0 },
      { mes: "Ago", previsto: 88000, real: 0 },
    ],
    expensesByCategory: [
      { categoria: "Demolições", valor: 8000 },
      { categoria: "Canalização", valor: 11200 },
      { categoria: "Eletricidade", valor: 2800 },
    ],
  },
  {
    id: "principe-real",
    type: "arrendamento",
    number: "003",
    title: "Apartamento Príncipe Real partilhado",
    city: "Lisboa",
    district: "Lisboa",
    coverImageUrl: IMG("1505691938895-1758d7feb511"),
    status: "obras",
    createdAt: "2026-03-05",
    partners: [
      { id: "me-daniel", name: "Daniel Silva", pct: 50, color: "#5C3D2E" },
      { id: "mariana-sousa", name: "Mariana Sousa", pct: 30, color: "#C8A664" },
      { id: "carlos-monteiro", name: "Carlos Monteiro", pct: 20, color: "#4A7C59" },
    ],
    precoImovel: 380000,
    capitalInvestido: 114000,
    rendaMensal: 1850,
    despesasMensais: 740,
    taxaOcupacao: 100,
    yieldBruto: 5.8,
    yieldLiquido: 4.3,
    contratoTipo: "NRAU Tradicional",
    contratoInicio: "2026-09-01",
    contratoFim: "2031-08-31",
    prestacaoBancaria: 580,
    imiAnual: 420,
    seguroAnual: 220,
    condominioArr: 80,
    outrasDespesas: 0,
  },
  {
    id: "cedofeita-arr",
    type: "arrendamento",
    number: "002",
    title: "T2 Cedofeita partilhado",
    city: "Porto",
    district: "Porto",
    coverImageUrl: IMG("1502005229762-cf1b2da7c5d6"),
    status: "arrendado",
    createdAt: "2025-09-20",
    partners: [
      { id: "me-daniel", name: "Daniel Silva", pct: 60, color: "#5C3D2E" },
      { id: "mariana-sousa", name: "Ana Ferreira", pct: 40, color: "#C8A664" },
    ],
    precoImovel: 195000,
    capitalInvestido: 52000,
    rendaMensal: 1100,
    despesasMensais: 580,
    taxaOcupacao: 100,
    yieldBruto: 6.8,
    yieldLiquido: 4.9,
    contratoTipo: "NRAU Tradicional",
    contratoInicio: "2025-11-01",
    contratoFim: "2027-10-31",
    inquilino: "Tiago Nunes",
    recibosEmitidos: 8,
    prestacaoBancaria: 420,
    imiAnual: 380,
    seguroAnual: 180,
    condominioArr: 45,
    outrasDespesas: 0,
    distribuicaoMensal: [
      { mes: "Nov", receita: 1100, despesa: 580 },
      { mes: "Dez", receita: 1100, despesa: 580 },
      { mes: "Jan", receita: 1100, despesa: 580 },
      { mes: "Fev", receita: 1100, despesa: 580 },
      { mes: "Mar", receita: 1100, despesa: 640 },
      { mes: "Abr", receita: 1100, despesa: 580 },
      { mes: "Mai", receita: 1100, despesa: 580 },
      { mes: "Jun", receita: 1100, despesa: 580 },
    ],
  },
];

// ── Store ──

interface CollabState {
  projects: CollabProject[];
  add: (p: Omit<CollabProject, "id" | "createdAt">) => string;
  update: (id: string, patch: Partial<CollabProject>) => void;
  remove: (id: string) => void;
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCollabStore = create<CollabState>()(
  persist(
    (set, get) => ({
      projects: SEED,
      add: (input) => {
        const id = uid();
        const project: CollabProject = {
          ...input,
          id,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
      remove: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      resetSeed: () => set({ projects: SEED }),
    }),
    { name: "decogest-collab", version: 1 }
  )
);
