import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AiAction } from "@/lib/ai/engine";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  actions?: AiAction[];
  chart?: { dados: { nome: string; valor: number }[] };
  followups?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
}

function uid(prefix = "msg"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const SEED: Conversation[] = [
  {
    id: "conv-portfolio",
    title: "Análise portfólio Q1 2026",
    createdAt: "2026-04-02T10:00:00.000Z",
    updatedAt: "2026-04-02T10:03:00.000Z",
    messages: [
      { id: "m1", role: "user", content: "Analisa a rentabilidade do meu portefólio.", createdAt: "2026-04-02T10:00:00.000Z" },
      {
        id: "m2",
        role: "assistant",
        createdAt: "2026-04-02T10:00:05.000Z",
        content: [
          "**Resumo do portefólio** (3 imóveis):",
          "",
          "| Imóvel | Renda/mês | Yield bruto |",
          "| --- | --- | --- |",
          "| T2 Arroios | 1.350 € | 6,6% |",
          "| Studio AL Baixa | 1.100 € | 10,2% |",
          "| T3 Coimbra | — | em remodelação |",
          "",
          "🏆 O **Studio AL Baixa** lidera em yield. O **T3 Coimbra** entra em rendimento após as obras.",
        ].join("\n"),
        actions: [{ label: "Abrir Contabilidade", to: "/financas/contabilidade", kind: "navigate" }],
      },
    ],
  },
  {
    id: "conv-contrato",
    title: "Contrato T3 Coimbra",
    createdAt: "2026-05-18T15:00:00.000Z",
    updatedAt: "2026-05-18T15:02:00.000Z",
    messages: [
      { id: "m1", role: "user", content: "Quero redigir um contrato de arrendamento para o T3 Coimbra (estudante).", createdAt: "2026-05-18T15:00:00.000Z" },
      {
        id: "m2",
        role: "assistant",
        createdAt: "2026-05-18T15:00:06.000Z",
        content: [
          "Para um **contrato de estudante** no T3 Coimbra, sugiro:",
          "",
          "1. Duração de **10 meses** (ano letivo)",
          "2. Renda por quarto + caução de 1–2 meses",
          "3. Cláusula de denúncia adaptada ao período letivo",
          "",
          "Depois de assinar, carregue o documento no separador Contratos do imóvel.",
        ].join("\n"),
        actions: [{ label: "Abrir os meus imóveis →", to: "/imoveis", kind: "navigate" }],
      },
    ],
  },
  {
    id: "conv-imt",
    title: "Dúvidas IMT",
    createdAt: "2026-06-10T09:30:00.000Z",
    updatedAt: "2026-06-10T09:31:00.000Z",
    messages: [
      { id: "m1", role: "user", content: "Quanto pago de IMT num imóvel de 250.000 € para habitação própria?", createdAt: "2026-06-10T09:30:00.000Z" },
      {
        id: "m2",
        role: "assistant",
        createdAt: "2026-06-10T09:30:07.000Z",
        content: [
          "**IMT** — imóvel de 250.000 € · Habitação Própria Permanente",
          "",
          "1. Base: **250.000 €**",
          "2. IMT (tabela HPP): **6.985 €**",
          "3. Imposto de Selo (0,8%): **2.000 €**",
          "",
          "💰 Total: **8.985 €**",
          "",
          "_Informação geral — confirme com o seu contabilista._",
        ].join("\n"),
        actions: [{ label: "Abrir Calculadora", to: "/financas/calculadora-rentabilidade", kind: "navigate" }],
      },
    ],
  },
];

interface AiState {
  conversations: Conversation[];
  create: (title?: string) => string;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  getById: (id: string) => Conversation | undefined;
  addMessage: (id: string, msg: Omit<AiMessage, "id" | "createdAt">) => void;
  resetSeed: () => void;
}

export const useAiConversationsStore = create<AiState>()(
  persist(
    (set, get) => ({
      conversations: SEED,
      create: (title = "Nova conversa") => {
        const id = uid("conv");
        const now = new Date().toISOString();
        set((s) => ({ conversations: [{ id, title, messages: [], createdAt: now, updatedAt: now }, ...s.conversations] }));
        return id;
      },
      rename: (id, title) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)) })),
      remove: (id) => set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
      getById: (id) => get().conversations.find((c) => c.id === id),
      addMessage: (id, msg) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messages: [...c.messages, { ...msg, id: uid(), createdAt: new Date().toISOString() }],
                  title:
                    c.messages.length === 0 && msg.role === "user"
                      ? msg.content.slice(0, 40) + (msg.content.length > 40 ? "…" : "")
                      : c.title,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        })),
      resetSeed: () => set({ conversations: SEED }),
    }),
    { name: "decogest-ai-conversations", version: 1 }
  )
);
