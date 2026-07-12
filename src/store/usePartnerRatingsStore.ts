import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Avaliações entre parceiros — só entre quem partilhou um projeto (anti-fake). */
export interface PartnerRating {
  id: string;
  ratedUserId: string;
  raterUserId: string;
  raterName: string;
  projectName: string;
  rating: number; // 1..5
  testimonial: string;
  createdAt: string;
}

const SEED: PartnerRating[] = [
  {
    id: "pr1",
    ratedUserId: "joao-pereira",
    raterUserId: "carlos-mendes",
    raterName: "Carlos Mendes",
    projectName: "Compra e Revenda Rua de Santa Catarina",
    rating: 5,
    testimonial: "Transparência total nas contas e cumpriu prazos à risca. Voltaria a investir com o João sem hesitar.",
    createdAt: "2025-12-10",
  },
  {
    id: "pr2",
    ratedUserId: "joao-pereira",
    raterUserId: "mariana-sousa",
    raterName: "Mariana Sousa",
    projectName: "Prédio Bonjardim",
    rating: 4.5,
    testimonial: "Excelente execução de obra. Comunicação podia ser um pouco mais frequente, mas o resultado superou o esperado.",
    createdAt: "2025-08-02",
  },
  {
    id: "pr3",
    ratedUserId: "mariana-sousa",
    raterUserId: "joao-pereira",
    raterName: "João Pereira",
    projectName: "Cedência Alfama",
    rating: 5,
    testimonial: "Negócio limpo e rápido. Números exatamente como anunciados. Recomendo vivamente.",
    createdAt: "2026-01-15",
  },
  {
    id: "pr4",
    ratedUserId: "carlos-mendes",
    raterUserId: "me-daniel",
    raterName: "Daniel Silva",
    projectName: "Arrendamento T1 Benfica",
    rating: 5,
    testimonial: "Imóvel exatamente como descrito e arrendado em duas semanas. Profissional do início ao fim.",
    createdAt: "2025-10-20",
  },
  {
    id: "pr5",
    ratedUserId: "carlos-mendes",
    raterUserId: "mariana-sousa",
    raterName: "Mariana Sousa",
    projectName: "Quartos Coimbra",
    rating: 4.5,
    testimonial: "Grande conhecimento do mercado de arrendamento estudantil. Parceria muito sólida.",
    createdAt: "2025-07-11",
  },
];

interface PartnerRatingsState {
  ratings: PartnerRating[];
  getForUser: (userId: string) => PartnerRating[];
  resetSeed: () => void;
}

export const usePartnerRatingsStore = create<PartnerRatingsState>()(
  persist(
    (set, get) => ({
      ratings: SEED,
      getForUser: (userId) => get().ratings.filter((r) => r.ratedUserId === userId),
      resetSeed: () => set({ ratings: SEED }),
    }),
    { name: "redegest-partner-ratings", version: 1 }
  )
);
