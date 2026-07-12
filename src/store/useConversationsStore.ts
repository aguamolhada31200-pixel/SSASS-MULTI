import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

export type ContextType = "listing" | "direct" | "tenant";

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  contextType: ContextType;
  contextId?: string; // listingId / tenantId
  messages: Message[];
  createdAt: string;
}

function uid(prefix = "c"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SEED: Conversation[] = [
  {
    id: "conv-arroios",
    participantIds: [CURRENT_USER_ID, "carlos-mendes"],
    contextType: "listing",
    contextId: "arr-arroios",
    createdAt: "2026-06-08",
    messages: [
      { id: "m1", senderId: CURRENT_USER_ID, content: "Olá Carlos, o T2 de Arroios ainda está disponível? Interessa-me o rendimento.", createdAt: "2026-06-08T10:12:00", read: true },
      { id: "m2", senderId: "carlos-mendes", content: "Olá Daniel! Sim, ainda está. A renda de 1.100€ já está validada com 3 candidatos na zona.", createdAt: "2026-06-08T10:40:00", read: true },
      { id: "m3", senderId: CURRENT_USER_ID, content: "Perfeito. Podemos marcar uma visita esta semana?", createdAt: "2026-06-08T10:45:00", read: true },
      { id: "m4", senderId: "carlos-mendes", content: "Claro. Tenho disponibilidade quinta de manhã ou sexta à tarde. Envio-lhe a morada exata por aqui.", createdAt: "2026-06-09T09:05:00", read: false },
    ],
  },
  {
    id: "conv-porto",
    participantIds: [CURRENT_USER_ID, "joao-pereira"],
    contextType: "listing",
    contextId: "reab-porto",
    createdAt: "2026-06-03",
    messages: [
      { id: "m5", senderId: CURRENT_USER_ID, content: "João, o projeto no Porto parece muito interessante. Como funciona o split 50/50 na prática?", createdAt: "2026-06-03T14:20:00", read: true },
      { id: "m6", senderId: "joao-pereira", content: "Olá Daniel. O capital procurado (95k) cobre a obra e parte da aquisição; o lucro líquido divide-se 50/50 após venda. Posso enviar o dossier completo.", createdAt: "2026-06-03T15:00:00", read: true },
    ],
  },
];

interface ConversationsState {
  conversations: Conversation[];
  getById: (id: string) => Conversation | undefined;
  getOrCreate: (otherUserId: string, contextType: ContextType, contextId?: string) => string;
  sendMessage: (conversationId: string, content: string) => void;
  markRead: (conversationId: string) => void;
  unreadCount: () => number;
  resetSeed: () => void;
}

export const useConversationsStore = create<ConversationsState>()(
  persist(
    (set, get) => ({
      conversations: SEED,
      getById: (id) => get().conversations.find((c) => c.id === id),
      getOrCreate: (otherUserId, contextType, contextId) => {
        const existing = get().conversations.find(
          (c) =>
            c.participantIds.includes(otherUserId) &&
            c.participantIds.includes(CURRENT_USER_ID) &&
            c.contextType === contextType &&
            c.contextId === contextId
        );
        if (existing) return existing.id;
        const id = uid();
        const conv: Conversation = {
          id,
          participantIds: [CURRENT_USER_ID, otherUserId],
          contextType,
          contextId,
          messages: [],
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ conversations: [conv, ...s.conversations] }));
        return id;
      },
      sendMessage: (conversationId, content) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { id: uid("m"), senderId: CURRENT_USER_ID, content, createdAt: new Date().toISOString(), read: true },
                  ],
                }
              : c
          ),
        })),
      markRead: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: c.messages.map((m) => (m.senderId !== CURRENT_USER_ID ? { ...m, read: true } : m)) }
              : c
          ),
        })),
      unreadCount: () => {
        let n = 0;
        for (const c of get().conversations)
          for (const m of c.messages) if (m.senderId !== CURRENT_USER_ID && !m.read) n++;
        return n;
      },
      resetSeed: () => set({ conversations: SEED }),
    }),
    { name: "decogest-conversations", version: 1 }
  )
);
