import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";
import type { Partner } from "./useCollabStore";

// ───────────────────────── Tipos ─────────────────────────

export type DecisaoTipo = "despesa" | "obra" | "venda" | "geral";
export type DecisaoEstado = "pendente" | "aprovada" | "rejeitada";
export type MaioriaRegra = "simples" | "qualificada" | "unanime";
export type VotoValor = "a_favor" | "contra" | "abstencao";

export const DECISAO_TIPO_LABEL: Record<DecisaoTipo, string> = {
  despesa: "Despesa",
  obra: "Obra",
  venda: "Venda",
  geral: "Geral",
};

export const MAIORIA_LABEL: Record<MaioriaRegra, string> = {
  simples: "Maioria simples (>50%)",
  qualificada: "Maioria qualificada (≥2/3)",
  unanime: "Unanimidade",
};

export const MAIORIA_LABEL_SHORT: Record<MaioriaRegra, string> = {
  simples: "Maioria simples",
  qualificada: "Qualificada 2/3",
  unanime: "Unanimidade",
};

export interface DecisaoVoto {
  userId: string;
  valor: VotoValor;
  ts: string; // ISO
}

export interface DecisaoComentario {
  id: string;
  userId: string;
  texto: string;
  ts: string; // ISO
}

/** Contexto da decisão — fonte única: decisões criadas nas obras são as mesmas da tab. */
export type DecisaoContexto = "geral" | "obra" | "financas" | "contrato";

export const DECISAO_CONTEXTO_LABEL: Record<DecisaoContexto, string> = {
  geral: "Geral",
  obra: "Obra",
  financas: "Finanças",
  contrato: "Contrato",
};

export interface Decisao {
  id: string;
  projectId: string;
  titulo: string;
  descricao: string;
  tipo: DecisaoTipo;
  /** Onde a decisão nasceu (default "geral"). */
  contexto?: DecisaoContexto;
  /** Id da entidade do contexto (ex.: obraId quando contexto === "obra"). */
  contextoId?: string;
  /** Rótulo visível do contexto (ex.: "Obra: Cozinha nova"). */
  contextoLabel?: string;
  valor?: number;
  prazo?: string; // YYYY-MM-DD
  maioria: MaioriaRegra;
  proposedBy: string; // userId
  createdAt: string; // ISO
  estado: DecisaoEstado;
  fechadaEm?: string; // ISO
  votos: DecisaoVoto[];
  comentarios: DecisaoComentario[];
  anexos?: { nome: string; url: string }[];
  /** Decisão de despesa/obra já convertida no objeto real. */
  aplicada?: boolean;
}

export type DecisaoInput = Omit<Decisao, "id" | "createdAt" | "estado" | "votos" | "comentarios" | "fechadaEm" | "aplicada">;

// ───────────────────────── Helpers de votação ─────────────────────────

/** Threshold (em % do peso total) exigido pela regra. */
export function thresholdMaioria(regra: MaioriaRegra): number {
  if (regra === "unanime") return 100;
  if (regra === "qualificada") return 66.67;
  return 50; // simples: precisa de ULTRAPASSAR 50
}

export interface ResumoVotos {
  pesoFavor: number;
  pesoContra: number;
  pesoAbstencao: number;
  pesoPendente: number;
  votantes: number;
  totalSocios: number;
  atingido: boolean;   // aprovação já garantida
  impossivel: boolean; // aprovação já impossível
}

/** Pesa os votos pela percentagem de cada sócio ativo. */
export function resumoVotos(d: Decisao, partners: Partner[]): ResumoVotos {
  const ativos = partners.filter((s) => (s.status ?? "ativo") === "ativo");
  const pesoDe = (userId: string) => ativos.find((s) => s.id === userId)?.pct ?? 0;
  const total = ativos.reduce((s, x) => s + x.pct, 0) || 100;

  let pesoFavor = 0, pesoContra = 0, pesoAbstencao = 0;
  d.votos.forEach((v) => {
    const w = pesoDe(v.userId);
    if (v.valor === "a_favor") pesoFavor += w;
    else if (v.valor === "contra") pesoContra += w;
    else pesoAbstencao += w;
  });
  const pesoPendente = Math.max(0, total - pesoFavor - pesoContra - pesoAbstencao);

  const th = thresholdMaioria(d.maioria);
  // Abstenções contam como "não a favor": na unanimidade bloqueiam, nas maiorias reduzem a base? Regra prática:
  // aprovação exige pesoFavor a atingir o threshold sobre o TOTAL (posição conservadora e simples de explicar).
  const atingido = d.maioria === "simples" ? pesoFavor > th : pesoFavor >= th;
  // impossível: mesmo que todo o pendente vote a favor, não chega.
  const maxPossivel = pesoFavor + pesoPendente;
  const impossivel = d.maioria === "simples" ? maxPossivel <= th : maxPossivel < th;

  return { pesoFavor, pesoContra, pesoAbstencao, pesoPendente, votantes: d.votos.length, totalSocios: ativos.length, atingido, impossivel };
}

/** Prazo já passou? */
export function prazoExpirado(d: Decisao): boolean {
  if (!d.prazo) return false;
  const fim = new Date(`${d.prazo}T23:59:59`);
  return Date.now() > fim.getTime();
}

/**
 * Estado que a decisão DEVE ter agora (auto-fecho por maioria atingida/impossível ou prazo).
 * Devolve o novo estado ou null se continua pendente.
 */
export function estadoDerivado(d: Decisao, partners: Partner[]): DecisaoEstado | null {
  if (d.estado !== "pendente") return null;
  const r = resumoVotos(d, partners);
  if (r.atingido) return "aprovada";
  if (r.impossivel) return "rejeitada";
  if (prazoExpirado(d)) return r.atingido ? "aprovada" : "rejeitada";
  return null;
}

// ───────────────────────── Seed ─────────────────────────

const SEED: Decisao[] = [
  // Criada A PARTIR DA OBRA "Cozinha nova" — aparece no bloco da obra e na tab com o chip "Obra: …"
  {
    id: "dec-eletro-encastre",
    projectId: "principe-real",
    titulo: "Upgrade dos eletrodomésticos para encastre (Cozinha nova)",
    descricao:
      "A bancada nova permite encastrar placa, forno e exaustor. Diferença face aos livres: +1.200 €. Valoriza o arrendamento e a revenda. Proponho aprovar o upgrade.",
    tipo: "despesa",
    contexto: "obra",
    contextoId: "o-principe-2",
    contextoLabel: "Obra: Cozinha nova",
    valor: 1200,
    prazo: "2026-07-28",
    maioria: "simples",
    proposedBy: "pedro-alves",
    createdAt: "2026-07-15T09:00:00.000Z",
    estado: "pendente",
    votos: [{ userId: "rita-santos", valor: "a_favor", ts: "2026-07-16T10:00:00.000Z" }],
    comentarios: [],
  },
  // Aberta — Príncipe Real (Pedro propôs 40% a favor... não: Rita 25% a favor, falta o voto do Daniel)
  {
    id: "dec-renovacao-contrato",
    projectId: "principe-real",
    titulo: "Renovar contrato da Sofia por mais 1 ano (renda 1.950 €)",
    descricao:
      "O contrato termina em janeiro. A Sofia quer renovar e aceita atualização da renda de 1.850 € para 1.950 € (+5,4%). Alternativa é ir a mercado com risco de 1–2 meses vazios. Proponho renovar.",
    tipo: "geral",
    prazo: "2026-07-25",
    maioria: "simples",
    proposedBy: "pedro-alves",
    createdAt: "2026-07-10T10:15:00.000Z",
    estado: "pendente",
    votos: [{ userId: "rita-santos", valor: "a_favor", ts: "2026-07-11T09:30:00.000Z" }],
    comentarios: [
      {
        id: "c-renov-1",
        userId: CURRENT_USER_ID,
        texto: "@Pedro a atualização já considera o coeficiente de 2026 ou é acordo direto?",
        ts: "2026-07-10T14:40:00.000Z",
      },
      {
        id: "c-renov-2",
        userId: "pedro-alves",
        texto: "@Daniel acordo direto, acima do coeficiente. Minuta na pasta de documentos.",
        ts: "2026-07-10T15:05:00.000Z",
      },
    ],
  },
  // Fechada — aprovada e aplicada
  {
    id: "dec-bomba-calor",
    projectId: "principe-real",
    titulo: "Substituir esquentador por bomba de calor",
    descricao:
      "Esquentador com 15 anos no fim de vida. Proposta Hidro Lisboa: bomba de calor A+++ por 2.300€ instalada. Sobe a classe energética e valoriza a renda.",
    tipo: "despesa",
    valor: 2300,
    prazo: "2026-06-20",
    maioria: "simples",
    proposedBy: "rita-santos",
    createdAt: "2026-06-14T09:00:00.000Z",
    estado: "aprovada",
    fechadaEm: "2026-06-16T18:30:00.000Z",
    aplicada: true,
    votos: [
      { userId: "rita-santos", valor: "a_favor", ts: "2026-06-14T09:01:00.000Z" },
      { userId: CURRENT_USER_ID, valor: "a_favor", ts: "2026-06-15T08:20:00.000Z" },
      { userId: "pedro-alves", valor: "a_favor", ts: "2026-06-16T18:30:00.000Z" },
    ],
    comentarios: [
      {
        id: "c-bomba-1",
        userId: "pedro-alves",
        texto: "Aprovado da minha parte — o certificado energético agradece.",
        ts: "2026-06-16T18:29:00.000Z",
      },
    ],
  },
];

// ───────────────────────── Store ─────────────────────────

interface DecisionsState {
  decisoes: Decisao[];
  add: (input: DecisaoInput) => string;
  votar: (id: string, userId: string, valor: VotoValor, partners: Partner[]) => DecisaoEstado;
  comentar: (id: string, userId: string, texto: string) => void;
  fechar: (id: string, estado: DecisaoEstado) => void;
  marcarAplicada: (id: string) => void;
  /** Sincroniza o estado com o derivado (auto-fecho por prazo) — chamada ao abrir a tab. */
  syncEstados: (projectId: string, partners: Partner[]) => void;
  resetSeed: () => void;
}

function uid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useDecisionsStore = create<DecisionsState>()(
  persist(
    (set, get) => ({
      decisoes: SEED,
      add: (input) => {
        const id = uid("dec");
        const decisao: Decisao = {
          ...input,
          id,
          createdAt: new Date().toISOString(),
          estado: "pendente",
          votos: [],
          comentarios: [],
        };
        set((s) => ({ decisoes: [decisao, ...s.decisoes] }));
        return id;
      },
      votar: (id, userId, valor, partners) => {
        let novoEstado: DecisaoEstado = "pendente";
        set((s) => ({
          decisoes: s.decisoes.map((d) => {
            if (d.id !== id || d.estado !== "pendente") return d;
            const votos = [
              ...d.votos.filter((v) => v.userId !== userId),
              { userId, valor, ts: new Date().toISOString() },
            ];
            const next: Decisao = { ...d, votos };
            const derivado = estadoDerivado(next, partners);
            if (derivado) {
              next.estado = derivado;
              next.fechadaEm = new Date().toISOString();
            }
            novoEstado = next.estado;
            return next;
          }),
        }));
        return novoEstado;
      },
      comentar: (id, userId, texto) =>
        set((s) => ({
          decisoes: s.decisoes.map((d) =>
            d.id === id
              ? {
                  ...d,
                  comentarios: [
                    ...d.comentarios,
                    { id: uid("c"), userId, texto, ts: new Date().toISOString() },
                  ],
                }
              : d
          ),
        })),
      fechar: (id, estado) =>
        set((s) => ({
          decisoes: s.decisoes.map((d) =>
            d.id === id ? { ...d, estado, fechadaEm: new Date().toISOString() } : d
          ),
        })),
      marcarAplicada: (id) =>
        set((s) => ({ decisoes: s.decisoes.map((d) => (d.id === id ? { ...d, aplicada: true } : d)) })),
      syncEstados: (projectId, partners) =>
        set((s) => ({
          decisoes: s.decisoes.map((d) => {
            if (d.projectId !== projectId || d.estado !== "pendente") return d;
            const derivado = estadoDerivado(d, partners);
            return derivado ? { ...d, estado: derivado, fechadaEm: new Date().toISOString() } : d;
          }),
        })),
      resetSeed: () => set({ decisoes: SEED }),
    }),
    {
      name: "redegest-decisions",
      version: 3,
      // v2: sócios do Príncipe Real passaram a Pedro (gestor) / Daniel / Rita — re-semeia mantendo decisões do utilizador.
      // v3: contexto das decisões (obra/finanças/contrato) + decisão criada a partir da obra "Cozinha nova".
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as { decisoes?: Decisao[] };
        if (version < 3) {
          const antigas = new Set(["dec-tinta-premium", ...SEED.map((d) => d.id)]);
          state.decisoes = [...SEED, ...(state.decisoes ?? []).filter((d) => !antigas.has(d.id))];
        }
        return state as DecisionsState;
      },
    }
  )
);
