import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CURRENT_USER_ID } from "./useProfilesStore";

export interface Interest {
  id: string;
  listingId: string;
  userId: string;
  message?: string;
  createdAt: string;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `i-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface InterestsState {
  interests: Interest[];
  hasInterest: (listingId: string) => boolean;
  add: (listingId: string, message?: string) => void;
}

export const useInterestsStore = create<InterestsState>()(
  persist(
    (set, get) => ({
      interests: [],
      hasInterest: (listingId) =>
        get().interests.some((i) => i.listingId === listingId && i.userId === CURRENT_USER_ID),
      add: (listingId, message) => {
        if (get().interests.some((i) => i.listingId === listingId && i.userId === CURRENT_USER_ID)) return;
        set((s) => ({
          interests: [
            { id: uid(), listingId, userId: CURRENT_USER_ID, message, createdAt: new Date().toISOString() },
            ...s.interests,
          ],
        }));
      },
    }),
    { name: "decogest-interests", version: 1 }
  )
);
