import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";
import { useNotificationsStore } from "./useNotificationsStore";
import type { Listing, ListingType } from "./useListingsStore";
import { capitalDoAnuncio, roiDoAnuncio } from "@/lib/calc/rede";

// Alertas de oportunidade — o utilizador guarda critérios de procura e é
// notificado quando surge um anúncio que os cumpre. Simples e local.

export type AlertCapital = "todos" | "ate25" | "25a50" | "50a100" | "mais100";

export const ALERT_CAPITAL_LABEL: Record<AlertCapital, string> = {
  todos: "Qualquer capital",
  ate25: "< 25.000 €",
  "25a50": "25 – 50.000 €",
  "50a100": "50 – 100.000 €",
  mais100: "> 100.000 €",
};

const CAPITAL_TEST: Record<AlertCapital, (v: number) => boolean> = {
  todos: () => true,
  ate25: (v) => v < 25000,
  "25a50": (v) => v >= 25000 && v <= 50000,
  "50a100": (v) => v > 50000 && v <= 100000,
  mais100: (v) => v > 100000,
};

export interface AlertCriterios {
  capital: AlertCapital;
  distrito: string; // "todos" ou nome
  cidade: string; // "todos" ou nome
  tipos: ListingType[]; // vazio = qualquer tipo
  roiMin: number; // 0 = qualquer
}

export interface Alerta {
  id: string;
  userId: string;
  nome: string;
  criterios: AlertCriterios;
  ativo: boolean;
  createdAt: string;
}

/** Um anúncio cumpre os critérios de um alerta? */
export function alertaMatch(l: Listing, c: AlertCriterios): boolean {
  if (c.tipos.length > 0 && !c.tipos.includes(l.type)) return false;
  if (c.distrito !== "todos" && l.district !== c.distrito) return false;
  if (c.cidade !== "todos" && l.city !== c.cidade) return false;
  if (!CAPITAL_TEST[c.capital](capitalDoAnuncio(l))) return false;
  if (c.roiMin > 0 && roiDoAnuncio(l) < c.roiMin) return false;
  return true;
}

const SEED: Alerta[] = [
  {
    id: "alerta-ced-porto",
    userId: CURRENT_USER_ID,
    nome: "Cedência até 50k no Porto",
    criterios: { capital: "25a50", distrito: "Porto", cidade: "todos", tipos: ["cedencia"], roiMin: 0 },
    ativo: true,
    createdAt: "2026-06-20T10:00:00.000Z",
  },
  {
    id: "alerta-flip-roi",
    userId: CURRENT_USER_ID,
    nome: "Flip com ROI acima de 20%",
    criterios: { capital: "todos", distrito: "todos", cidade: "todos", tipos: ["reabilitacao"], roiMin: 20 },
    ativo: true,
    createdAt: "2026-06-24T18:30:00.000Z",
  },
];

interface AlertsState {
  alertas: Alerta[];
  meus: () => Alerta[];
  add: (nome: string, criterios: AlertCriterios) => string;
  update: (id: string, patch: Partial<Pick<Alerta, "nome" | "criterios" | "ativo">>) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `alerta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alertas: SEED,
      meus: () => get().alertas.filter((a) => a.userId === CURRENT_USER_ID),
      add: (nome, criterios) => {
        const id = uid();
        set((s) => ({
          alertas: [
            { id, userId: CURRENT_USER_ID, nome: nome.trim() || "Alerta sem nome", criterios, ativo: true, createdAt: new Date().toISOString() },
            ...s.alertas,
          ],
        }));
        return id;
      },
      update: (id, patch) => set((s) => ({ alertas: s.alertas.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      toggle: (id) => set((s) => ({ alertas: s.alertas.map((a) => (a.id === id ? { ...a, ativo: !a.ativo } : a)) })),
      remove: (id) => set((s) => ({ alertas: s.alertas.filter((a) => a.id !== id) })),
    }),
    { name: "redegest-alerts", version: 1 }
  )
);

/**
 * Quando um anúncio novo é publicado, notifica os alertas ativos que o cumpram.
 * Chamado pelo modal de publicação (sem tocar na lógica dos anúncios).
 */
export function notificarAlertasComNovoAnuncio(l: Listing) {
  const alertas = useAlertsStore.getState().alertas.filter((a) => a.ativo);
  const add = useNotificationsStore.getState().add;
  for (const a of alertas) {
    if (alertaMatch(l, a.criterios)) {
      add({
        userId: a.userId,
        tipo: "geral",
        titulo: `Nova oportunidade para «${a.nome}»`,
        descricao: l.title,
        link: `/comunidade/rede/anuncio/${l.id}`,
      });
    }
  }
}
