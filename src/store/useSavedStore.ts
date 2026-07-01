import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Anúncios guardados pelo utilizador atual. */
interface SavedState {
  savedIds: string[];
  isSaved: (listingId: string) => boolean;
  toggle: (listingId: string) => boolean; // devolve o novo estado
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      savedIds: ["ced-lisboa"],
      isSaved: (listingId) => get().savedIds.includes(listingId),
      toggle: (listingId) => {
        const has = get().savedIds.includes(listingId);
        set((s) => ({
          savedIds: has ? s.savedIds.filter((id) => id !== listingId) : [...s.savedIds, listingId],
        }));
        return !has;
      },
    }),
    { name: "decogest-saved", version: 1 }
  )
);
