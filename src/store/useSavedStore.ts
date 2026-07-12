import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Anúncios guardados pelo utilizador atual (privado — o anunciante não é notificado). */
interface SavedState {
  savedIds: string[];
  /** listingId → ISO datetime em que foi guardado. */
  savedAt: Record<string, string>;
  isSaved: (listingId: string) => boolean;
  toggle: (listingId: string) => boolean; // devolve o novo estado
}

// Shortlist de exemplo: Reabilitação Baixa do Porto, Cedência CPCV T2 Arroios, Studio Porto.
const SEED_IDS = ["reab-porto", "ced-cpcv-arroios", "arr-porto-al"];
const SEED_AT: Record<string, string> = {
  "reab-porto": "2026-06-20T10:00:00.000Z",
  "ced-cpcv-arroios": "2026-06-24T18:30:00.000Z",
  "arr-porto-al": "2026-06-28T09:15:00.000Z",
};

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      savedIds: SEED_IDS,
      savedAt: SEED_AT,
      isSaved: (listingId) => get().savedIds.includes(listingId),
      toggle: (listingId) => {
        const has = get().savedIds.includes(listingId);
        set((s) => {
          if (has) {
            const { [listingId]: _, ...rest } = s.savedAt;
            return { savedIds: s.savedIds.filter((id) => id !== listingId), savedAt: rest };
          }
          return {
            savedIds: [...s.savedIds, listingId],
            savedAt: { ...s.savedAt, [listingId]: new Date().toISOString() },
          };
        });
        return !has;
      },
    }),
    {
      name: "redegest-saved",
      version: 2,
      // v2: shortlist de exemplo + timestamps (mantém guardados do utilizador).
      migrate: (persisted: unknown, version: number) => {
        const s = (persisted ?? {}) as Partial<SavedState>;
        if (version < 2) {
          const ids = new Set([...(s.savedIds ?? []), ...SEED_IDS]);
          s.savedIds = [...ids];
          s.savedAt = { ...SEED_AT, ...(s.savedAt ?? {}) };
        }
        return s as SavedState;
      },
    }
  )
);
