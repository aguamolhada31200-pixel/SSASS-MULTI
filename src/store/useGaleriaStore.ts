import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

// ───────────────────── Tipos ─────────────────────

export type Divisao =
  | "cozinha"
  | "wc"
  | "sala"
  | "quarto"
  | "hall"
  | "varanda"
  | "exterior"
  | "geral";

export type VisibilidadeComparacao = "privada" | "partilhavel_na_rede";

export const DIVISAO_LABEL: Record<Divisao, string> = {
  cozinha: "Cozinha",
  wc: "Casa de banho",
  sala: "Sala",
  quarto: "Quarto",
  hall: "Hall",
  varanda: "Varanda",
  exterior: "Exterior",
  geral: "Geral",
};

/**
 * Comparação antes/depois — não é um arquivo de fotos: cada comparação liga-se
 * ao CUSTO e TEMPO reais da obra de origem (prova visual + track record + conteúdo).
 */
export interface Comparacao {
  id: string;
  obraId: string;
  faseId?: string;
  projectId?: string;
  propertyId?: string;
  titulo: string;
  divisao: Divisao;
  fotoAntesUrl: string;
  fotoDepoisUrl: string;
  /** Soma das despesas reais dessa obra/fase (editável pelo utilizador). */
  custoReal: number;
  /** Duração real (dias) — das datas da obra/fase. */
  duracaoDias: number;
  valorizacaoEstimada?: number;
  descricao: string;
  /** Controla se aparece no perfil público (Rede) como prova de track record. */
  visibilidade: VisibilidadeComparacao;
  /** Aparece em primeiro no perfil e nos anúncios. */
  destaque: boolean;
  createdAt: string;
  criadoPor: string;
}

export type ComparacaoInput = Omit<Comparacao, "id" | "createdAt">;

/** "42 dias" → "6 semanas"; mantém dias quando não é múltiplo certo. */
export function duracaoLabel(dias: number): string {
  if (!dias || dias <= 0) return "—";
  if (dias % 7 === 0) {
    const s = dias / 7;
    return s === 1 ? "1 semana" : `${s} semanas`;
  }
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

// ───────────────────── Seeds ─────────────────────

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1100&q=70`;

const SEED: Comparacao[] = [
  {
    id: "g-seed-cozinha-principe",
    obraId: "o-principe-2",
    projectId: "principe-real",
    titulo: "Cozinha — Príncipe Real",
    divisao: "cozinha",
    fotoAntesUrl: IMG("1504307651254-35680f356dfd"),
    fotoDepoisUrl: IMG("1556911220-bff31c812dba"),
    custoReal: 12000,
    duracaoDias: 42,
    valorizacaoEstimada: 25000,
    descricao:
      "Cozinha totalmente nova no T2 do Príncipe Real: demolição, canalização e eletricidade novas, mobiliário lacado e bancada em pedra.",
    visibilidade: "partilhavel_na_rede",
    destaque: true,
    createdAt: "2026-06-20",
    criadoPor: CURRENT_USER_ID,
  },
  {
    id: "g-seed-wc-principe",
    obraId: "o-principe-3",
    projectId: "principe-real",
    titulo: "Casa de banho — Príncipe Real",
    divisao: "wc",
    fotoAntesUrl: IMG("1604014237800-1c9102c219da"),
    fotoDepoisUrl: IMG("1552321554-5fefe8c9ef14"),
    custoReal: 3700,
    duracaoDias: 21,
    valorizacaoEstimada: 8000,
    descricao:
      "Renovação integral da casa de banho: loiças suspensas, base de duche em resina e torneiras Hansgrohe. Obra concluída com 5 dias de desvio.",
    visibilidade: "partilhavel_na_rede",
    destaque: false,
    createdAt: "2026-05-14",
    criadoPor: CURRENT_USER_ID,
  },
  {
    id: "g-seed-sala-porto",
    obraId: "o-porto-3",
    projectId: "porto-flip",
    titulo: "Sala — Reabilitação Baixa do Porto",
    divisao: "sala",
    fotoAntesUrl: IMG("1503387762-592deb58ef4e"),
    fotoDepoisUrl: IMG("1586023492125-27b2c045efd7"),
    custoReal: 8500,
    duracaoDias: 35,
    valorizacaoEstimada: 18000,
    descricao:
      "Sala do piso 1 depois do reforço estrutural: pé-direito recuperado, pavimento de madeira restaurado e iluminação embutida.",
    visibilidade: "partilhavel_na_rede",
    destaque: true,
    createdAt: "2026-06-05",
    criadoPor: "joao-pereira",
  },
  {
    id: "g-seed-fachada-porto",
    obraId: "o-porto-1",
    projectId: "porto-flip",
    titulo: "Fachada — Reabilitação Baixa do Porto",
    divisao: "exterior",
    fotoAntesUrl: IMG("1517581177682-a085bb7ffb15"),
    fotoDepoisUrl: IMG("1512917774080-9991f1c4c750"),
    custoReal: 15000,
    duracaoDias: 56,
    descricao: "Recuperação da fachada com aprovação da câmara: reboco, caixilharia e cantarias limpas.",
    visibilidade: "privada",
    destaque: false,
    createdAt: "2026-06-28",
    criadoPor: "joao-pereira",
  },
  {
    id: "g-seed-quartos-coimbra",
    obraId: "o-coimbra-1",
    propertyId: "seed-coimbra",
    titulo: "Quartos — T3 Coimbra",
    divisao: "quarto",
    fotoAntesUrl: IMG("1560185127-6ed189bf02f4"),
    fotoDepoisUrl: IMG("1505693416388-ac5ce068fe85"),
    custoReal: 6200,
    duracaoDias: 28,
    descricao: "Dois quartos renovados para arrendamento a estudantes: pavimento flutuante, pintura e roupeiros novos.",
    visibilidade: "partilhavel_na_rede",
    destaque: false,
    createdAt: "2026-06-10",
    criadoPor: CURRENT_USER_ID,
  },
];

// ───────────────────── Store ─────────────────────

interface GaleriaState {
  comparacoes: Comparacao[];
  add: (input: ComparacaoInput) => string;
  update: (id: string, patch: Partial<Comparacao>) => void;
  remove: (id: string) => void;
  toggleDestaque: (id: string) => void;
  setVisibilidade: (id: string, v: VisibilidadeComparacao) => void;
  getById: (id: string) => Comparacao | undefined;
  /** Comparações partilháveis de um utilizador — prova de track record na Rede. */
  partilhaveisDe: (userId: string) => Comparacao[];
  byObra: (obraId: string) => Comparacao[];
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useGaleriaStore = create<GaleriaState>()(
  persist(
    (set, get) => ({
      comparacoes: SEED,
      add: (input) => {
        const id = uid();
        const c: Comparacao = { ...input, id, createdAt: new Date().toISOString().slice(0, 10) };
        set((s) => ({ comparacoes: [c, ...s.comparacoes] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ comparacoes: s.comparacoes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      remove: (id) => set((s) => ({ comparacoes: s.comparacoes.filter((c) => c.id !== id) })),
      toggleDestaque: (id) =>
        set((s) => ({ comparacoes: s.comparacoes.map((c) => (c.id === id ? { ...c, destaque: !c.destaque } : c)) })),
      setVisibilidade: (id, v) =>
        set((s) => ({ comparacoes: s.comparacoes.map((c) => (c.id === id ? { ...c, visibilidade: v } : c)) })),
      getById: (id) => get().comparacoes.find((c) => c.id === id),
      partilhaveisDe: (userId) =>
        get()
          .comparacoes.filter((c) => c.criadoPor === userId && c.visibilidade === "partilhavel_na_rede")
          .sort((a, b) => Number(b.destaque) - Number(a.destaque) || (a.createdAt < b.createdAt ? 1 : -1)),
      byObra: (obraId) => get().comparacoes.filter((c) => c.obraId === obraId),
      resetSeed: () => set({ comparacoes: SEED }),
    }),
    { name: "redegest-galeria", version: 1 }
  )
);
