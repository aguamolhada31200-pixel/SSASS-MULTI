import { create } from "zustand";
import { persist } from "zustand/middleware";

// Diretório de EMPREITEIROS / técnicos — contacto vivo ligado às obras.
// Reutilizado no header da obra, nos modais (dropdown) e na sub-tab do nível 1.

export type Especialidade =
  | "canalizacao"
  | "eletricidade"
  | "pintura"
  | "cozinhas"
  | "carpintaria"
  | "estrutural"
  | "geral";

export const ESPECIALIDADE_LABEL: Record<Especialidade, string> = {
  canalizacao: "Canalização",
  eletricidade: "Eletricidade",
  pintura: "Pintura",
  cozinhas: "Cozinhas",
  carpintaria: "Carpintaria",
  estrutural: "Estrutural",
  geral: "Geral",
};

export interface Technician {
  id: string;
  nome: string;
  empresa?: string;
  especialidades: Especialidade[];
  telefone: string;
  email: string;
  nif?: string;
  zonas: string[];
  avaliacaoMedia: number;
  numTrabalhos: number;
  favorito: boolean;
  notas: string;
  ultimoTrabalho?: string; // ISO date
}

export type TechnicianInput = Omit<Technician, "id" | "avaliacaoMedia" | "numTrabalhos"> & {
  avaliacaoMedia?: number;
  numTrabalhos?: number;
};

const SEED: Technician[] = [
  {
    id: "tec-hidro-lisboa",
    nome: "Hidro Lisboa",
    empresa: "Hidro Lisboa Canalizações, Lda.",
    especialidades: ["canalizacao"],
    telefone: "+351 213 555 010",
    email: "geral@hidrolisboa.pt",
    nif: "504777111",
    zonas: ["Lisboa"],
    avaliacaoMedia: 4.0,
    numTrabalhos: 3,
    favorito: true,
    notas: "Resposta rápida. Bom em remodelações de WC.",
    ultimoTrabalho: "2026-05-05",
  },
  {
    id: "tec-cozinhas-lx",
    nome: "Cozinhas Modernas Lx",
    empresa: "Cozinhas Modernas, Unip. Lda.",
    especialidades: ["cozinhas", "carpintaria"],
    telefone: "+351 218 444 220",
    email: "orcamentos@cozinhasmodernas.pt",
    nif: "506222333",
    zonas: ["Lisboa", "Setúbal"],
    avaliacaoMedia: 4.6,
    numTrabalhos: 5,
    favorito: false,
    notas: "Projeto 3D incluído no orçamento.",
    ultimoTrabalho: "2026-06-01",
  },
  {
    id: "tec-pintor-joaquim",
    nome: "Pintor Joaquim",
    especialidades: ["pintura"],
    telefone: "+351 963 332 211",
    email: "joaquim.pintor@gmail.com",
    zonas: ["Lisboa"],
    avaliacaoMedia: 4.3,
    numTrabalhos: 7,
    favorito: false,
    notas: "Preço justo. Marcar com 2 semanas de antecedência.",
    ultimoTrabalho: "2026-05-10",
  },
  {
    id: "tec-electroporto",
    nome: "ElectroPorto",
    empresa: "ElectroPorto Instalações, Lda.",
    especialidades: ["eletricidade"],
    telefone: "+351 225 111 900",
    email: "geral@electroporto.pt",
    nif: "507888444",
    zonas: ["Porto"],
    avaliacaoMedia: 4.8,
    numTrabalhos: 2,
    favorito: false,
    notas: "Certificação ITED. Muito rigorosos.",
    ultimoTrabalho: "2026-04-20",
  },
];

interface TechniciansState {
  technicians: Technician[];
  add: (input: TechnicianInput) => string;
  update: (id: string, patch: Partial<Technician>) => void;
  remove: (id: string) => void;
  toggleFavorito: (id: string) => void;
  /** Regista uma avaliação (1–5): atualiza a média ponderada e o nº de trabalhos. */
  avaliar: (id: string, estrelas: number) => void;
  getById: (id: string) => Technician | undefined;
  /** Procura por NIF (para ligar a leitura da fatura ao empreiteiro). */
  byNif: (nif: string) => Technician | undefined;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useTechniciansStore = create<TechniciansState>()(
  persist(
    (set, get) => ({
      technicians: SEED,
      add: (input) => {
        const id = uid();
        set((s) => ({
          technicians: [
            {
              ...input,
              id,
              avaliacaoMedia: input.avaliacaoMedia ?? 0,
              numTrabalhos: input.numTrabalhos ?? 0,
            },
            ...s.technicians,
          ],
        }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ technicians: s.technicians.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      remove: (id) => set((s) => ({ technicians: s.technicians.filter((t) => t.id !== id) })),
      toggleFavorito: (id) =>
        set((s) => ({ technicians: s.technicians.map((t) => (t.id === id ? { ...t, favorito: !t.favorito } : t)) })),
      avaliar: (id, estrelas) =>
        set((s) => ({
          technicians: s.technicians.map((t) => {
            if (t.id !== id) return t;
            const n = t.numTrabalhos + 1;
            const media = (t.avaliacaoMedia * t.numTrabalhos + Math.max(1, Math.min(5, estrelas))) / n;
            return {
              ...t,
              numTrabalhos: n,
              avaliacaoMedia: Math.round(media * 10) / 10,
              ultimoTrabalho: new Date().toISOString().slice(0, 10),
            };
          }),
        })),
      getById: (id) => get().technicians.find((t) => t.id === id),
      byNif: (nif) => get().technicians.find((t) => t.nif === nif),
    }),
    { name: "redegest-technicians", version: 1 }
  )
);
