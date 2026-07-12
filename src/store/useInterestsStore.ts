import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

export interface Interest {
  id: string;
  listingId: string;
  userId: string;
  message?: string;
  /** O interessado partilhou o perfil de investidor com o anunciante. */
  perfilPartilhado?: boolean;
  createdAt: string;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `i-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Seeds ──
// O utilizador atual manifestou interesse na Reabilitação Baixa do Porto
// (originou a conversa com o João Pereira). O anúncio do próprio utilizador
// ("arr-campo-ourique") tem 3 interessados.
const SEED: Interest[] = [
  {
    id: "seed-int-me-reab",
    listingId: "reab-porto",
    userId: CURRENT_USER_ID,
    message: "Olá, tenho interesse em ser parceiro neste projeto. Podemos falar sobre os números e o split?",
    perfilPartilhado: true,
    createdAt: "2026-06-03T14:20:00.000Z",
  },
  {
    id: "seed-int-joao",
    listingId: "arr-campo-ourique",
    userId: "joao-pereira",
    message: "Olá Daniel, tenho interesse neste imóvel. O yield bate certo com o que procuro — ainda está disponível?",
    perfilPartilhado: true,
    createdAt: "2026-06-26T09:40:00.000Z",
  },
  {
    id: "seed-int-mariana",
    listingId: "arr-campo-ourique",
    userId: "mariana-sousa",
    message: "Olá! Interessa-me a rentabilidade sobre capital. Pode partilhar as despesas anuais detalhadas?",
    perfilPartilhado: true,
    createdAt: "2026-06-27T16:05:00.000Z",
  },
  {
    id: "seed-int-rui",
    listingId: "arr-campo-ourique",
    userId: "rui-tavares",
    message: "Boas, tenho interesse. Sou novo na rede mas invisto no Minho há 10 anos.",
    perfilPartilhado: false,
    createdAt: "2026-06-29T11:20:00.000Z",
  },
];

interface InterestsState {
  interests: Interest[];
  /** O utilizador atual já manifestou interesse neste anúncio? */
  hasInterest: (listingId: string) => boolean;
  /** Interesses recebidos num anúncio (vista do autor), mais recentes primeiro. */
  byListing: (listingId: string) => Interest[];
  add: (listingId: string, message?: string, perfilPartilhado?: boolean) => void;
}

export const useInterestsStore = create<InterestsState>()(
  persist(
    (set, get) => ({
      interests: SEED,
      hasInterest: (listingId) =>
        get().interests.some((i) => i.listingId === listingId && i.userId === CURRENT_USER_ID),
      byListing: (listingId) =>
        get()
          .interests.filter((i) => i.listingId === listingId)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      add: (listingId, message, perfilPartilhado = true) => {
        if (get().interests.some((i) => i.listingId === listingId && i.userId === CURRENT_USER_ID)) return;
        set((s) => ({
          interests: [
            {
              id: uid(),
              listingId,
              userId: CURRENT_USER_ID,
              message,
              perfilPartilhado,
              createdAt: new Date().toISOString(),
            },
            ...s.interests,
          ],
        }));
      },
    }),
    {
      name: "redegest-interests",
      version: 2,
      // v2: seeds de exemplo (interesse do utilizador + 3 interessados no anúncio próprio).
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as { interests?: Interest[] };
        if (version < 2) {
          const presentes = new Set((s.interests ?? []).map((i) => i.id));
          s.interests = [...SEED.filter((x) => !presentes.has(x.id)), ...(s.interests ?? [])];
        }
        return s as InterestsState;
      },
    }
  )
);
