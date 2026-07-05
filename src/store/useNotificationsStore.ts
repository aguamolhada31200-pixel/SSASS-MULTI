import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

// ───────────────────────── Tipos ─────────────────────────

export type NotifTipo =
  | "socio_convidado"
  | "decisao_criada"
  | "decisao_voto"
  | "decisao_comentario"
  | "decisao_fechada"
  | "geral";

export interface Notificacao {
  id: string;
  /** Destinatário (nesta fase local só renderizamos as do utilizador atual). */
  userId: string;
  tipo: NotifTipo;
  titulo: string;
  descricao?: string;
  link?: string; // rota interna
  actorId?: string; // quem originou
  createdAt: string; // ISO
  lida: boolean;
}

export type NotificacaoInput = Omit<Notificacao, "id" | "createdAt" | "lida">;

// ───────────────────────── Seed ─────────────────────────

const SEED: Notificacao[] = [
  {
    id: "ntf-tinta-voto",
    userId: CURRENT_USER_ID,
    tipo: "decisao_comentario",
    titulo: "Mariana comentou a decisão «Tinta premium»",
    descricao: "«a diferença inclui a mão de obra ou é só material?»",
    link: "/comunidade/colaborativa/principe-real",
    actorId: "mariana-sousa",
    createdAt: "2026-07-02T14:40:00.000Z",
    lida: false,
  },
  {
    id: "ntf-bomba-fechada",
    userId: CURRENT_USER_ID,
    tipo: "decisao_fechada",
    titulo: "Decisão aprovada: «Substituir esquentador por bomba de calor»",
    descricao: "3 votos a favor · 100% do capital",
    link: "/comunidade/colaborativa/principe-real",
    actorId: "carlos-monteiro",
    createdAt: "2026-06-16T18:30:00.000Z",
    lida: false,
  },
  {
    id: "ntf-renda-junho",
    userId: CURRENT_USER_ID,
    tipo: "geral",
    titulo: "Renda de junho recebida · Príncipe Real",
    descricao: "1.850 € · Sofia Rocha",
    link: "/comunidade/colaborativa/principe-real",
    createdAt: "2026-06-08T09:00:00.000Z",
    lida: false,
  },
];

// ───────────────────────── Store ─────────────────────────

interface NotificationsState {
  notificacoes: Notificacao[];
  add: (input: NotificacaoInput) => void;
  /** Notifica vários destinatários de uma vez (ex.: todos os sócios). */
  broadcast: (userIds: string[], base: Omit<NotificacaoInput, "userId">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notificacoes: SEED,
      add: (input) =>
        set((s) => ({
          notificacoes: [
            { ...input, id: uid(), createdAt: new Date().toISOString(), lida: false },
            ...s.notificacoes,
          ],
        })),
      broadcast: (userIds, base) =>
        set((s) => ({
          notificacoes: [
            ...userIds.map((userId) => ({
              ...base,
              userId,
              id: uid(),
              createdAt: new Date().toISOString(),
              lida: false,
            })),
            ...s.notificacoes,
          ],
        })),
      markRead: (id) =>
        set((s) => ({ notificacoes: s.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)) })),
      markAllRead: () =>
        set((s) => ({
          notificacoes: s.notificacoes.map((n) => (n.userId === CURRENT_USER_ID ? { ...n, lida: true } : n)),
        })),
      remove: (id) => set((s) => ({ notificacoes: s.notificacoes.filter((n) => n.id !== id) })),
      resetSeed: () => set({ notificacoes: SEED }),
    }),
    { name: "decogest-notifications", version: 1 }
  )
);

/** Não lidas do utilizador atual (para o sino da Topbar). */
export function useUnreadCount(): number {
  return useNotificationsStore(
    (s) => s.notificacoes.filter((n) => n.userId === CURRENT_USER_ID && !n.lida).length
  );
}
