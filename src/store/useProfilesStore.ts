import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Utilizador autenticado (andaime — futuro: auth real do Supabase). */
export const CURRENT_USER_ID = "me-daniel";

export interface Profile {
  id: string;
  fullName: string; // vem da conta — read-only no editor público
  avatarUrl?: string;
  coverUrl?: string;
  tagline: string;
  bio: string;
  city: string;
  isVerified: boolean; // selo ✔ = verificação de identidade (ganho-na-plataforma)
  verifiedAt?: string;
  availableForPartnership: boolean;
  // Track record (ganho-na-plataforma — não falsificável)
  projetosConcluidos: number;
  valorPortfolio: number;
  yieldMedio: number;
  rating: number;
  numAvaliacoes: number;
  // Fiabilidade
  respostaHoras?: number;
  taxaResposta?: number;
  // Auto-declarado (rotulado, sem selo)
  experienciaAutoDeclaradaAnos?: number;
  imoveisAutoDeclarados?: number;
  interesses: string[];
  createdAt: string;
}

const SEED: Profile[] = [
  {
    id: CURRENT_USER_ID,
    fullName: "Daniel Silva",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=70",
    tagline: "A construir um portefólio de arrendamento e flips",
    bio: "Investidor imobiliário focado em arrendamento tradicional e pequenas reabilitações no Grande Lisboa. Aberto a parcerias em projetos de revenda.",
    city: "Lisboa",
    isVerified: true,
    verifiedAt: "2025-11-02",
    availableForPartnership: true,
    projetosConcluidos: 2,
    valorPortfolio: 585000,
    yieldMedio: 4.6,
    rating: 4.7,
    numAvaliacoes: 3,
    respostaHoras: 3,
    taxaResposta: 92,
    interesses: ["Arrendamento", "Flip", "Lisboa"],
    createdAt: "2024-01-10",
  },
  {
    id: "joao-pereira",
    fullName: "João Pereira",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=70",
    tagline: "Reabilitação urbana no Grande Porto",
    bio: "Especialista em reabilitação de prédios no centro histórico do Porto. 4 projetos concluídos com retorno médio acima de 20%. Procuro parceiros de capital para escalar.",
    city: "Porto",
    isVerified: true,
    verifiedAt: "2025-03-14",
    availableForPartnership: true,
    projetosConcluidos: 4,
    valorPortfolio: 850000,
    yieldMedio: 6.2,
    rating: 4.8,
    numAvaliacoes: 6,
    respostaHoras: 2,
    taxaResposta: 96,
    imoveisAutoDeclarados: 6,
    interesses: ["Reabilitação", "Flip", "Centro histórico", "Porto"],
    createdAt: "2023-05-20",
  },
  {
    id: "mariana-sousa",
    fullName: "Mariana Sousa",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=70",
    tagline: "Cedências e oportunidades em Lisboa",
    bio: "Encontro oportunidades em fase de CPCV e cedo posições quando o capital não chega para a escritura. Transparência total nos números.",
    city: "Lisboa",
    isVerified: true,
    verifiedAt: "2025-09-01",
    availableForPartnership: true,
    projetosConcluidos: 1,
    valorPortfolio: 320000,
    yieldMedio: 5.5,
    rating: 5.0,
    numAvaliacoes: 2,
    respostaHoras: 5,
    taxaResposta: 88,
    imoveisAutoDeclarados: 2,
    interesses: ["Cedência de posição", "CPCV", "Lisboa"],
    createdAt: "2024-08-12",
  },
  {
    id: "carlos-mendes",
    fullName: "Carlos Mendes",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=70",
    tagline: "Arrendamento tradicional e estudantes",
    bio: "Portefólio de 7 imóveis de arrendamento em Lisboa e Coimbra. Partilho oportunidades já prontas a arrendar para quem quer rendimento passivo.",
    city: "Lisboa",
    isVerified: true,
    verifiedAt: "2024-06-18",
    availableForPartnership: false,
    projetosConcluidos: 7,
    valorPortfolio: 1450000,
    yieldMedio: 5.8,
    rating: 4.8,
    numAvaliacoes: 12,
    respostaHoras: 4,
    taxaResposta: 90,
    imoveisAutoDeclarados: 7,
    interesses: ["Arrendamento", "Estudantes", "Rendimento passivo"],
    createdAt: "2022-11-30",
  },
  {
    id: "rui-tavares",
    fullName: "Rui Tavares",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=70",
    tagline: "Investidor há 10 anos (auto-declarado)",
    bio: "Novo na decogest. Tenho experiência em reabilitação no Minho e quero encontrar parceiros locais.",
    city: "Braga",
    isVerified: false,
    availableForPartnership: true,
    projetosConcluidos: 0,
    valorPortfolio: 0,
    yieldMedio: 0,
    rating: 0,
    numAvaliacoes: 0,
    experienciaAutoDeclaradaAnos: 10,
    imoveisAutoDeclarados: 12,
    interesses: ["Reabilitação", "Minho"],
    createdAt: "2026-05-28",
  },
  // Sócios de co-gestão de obras (parceiros nos projetos #001 e #003)
  {
    id: "pedro-alves",
    fullName: "Pedro Alves",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=70",
    tagline: "Gestor de obra e parcerias de reabilitação",
    bio: "Coordeno obras no terreno e faço a ponte com empreiteiros. Sócio em vários projetos de flip e arrendamento partilhado.",
    city: "Porto",
    isVerified: true,
    verifiedAt: "2025-07-10",
    availableForPartnership: true,
    projetosConcluidos: 5,
    valorPortfolio: 720000,
    yieldMedio: 5.9,
    rating: 4.9,
    numAvaliacoes: 8,
    respostaHoras: 2,
    taxaResposta: 95,
    imoveisAutoDeclarados: 4,
    interesses: ["Reabilitação", "Gestão de obra", "Porto"],
    createdAt: "2024-02-18",
  },
  {
    id: "rita-santos",
    fullName: "Rita Santos",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=70",
    coverUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70",
    tagline: "Sócia investidora · capital + decisão",
    bio: "Entro com capital em projetos validados e acompanho de perto as decisões. Foco em transparência total nos números.",
    city: "Lisboa",
    isVerified: true,
    verifiedAt: "2025-04-22",
    availableForPartnership: true,
    projetosConcluidos: 3,
    valorPortfolio: 540000,
    yieldMedio: 5.4,
    rating: 4.8,
    numAvaliacoes: 5,
    respostaHoras: 6,
    taxaResposta: 90,
    imoveisAutoDeclarados: 3,
    interesses: ["Investimento", "Flip", "Lisboa"],
    createdAt: "2024-06-05",
  },
];

interface ProfilesState {
  profiles: Profile[];
  getById: (id: string) => Profile | undefined;
  update: (id: string, patch: Partial<Profile>) => void;
  resetSeed: () => void;
}

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: SEED,
      getById: (id) => get().profiles.find((p) => p.id === id),
      update: (id, patch) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      resetSeed: () => set({ profiles: SEED }),
    }),
    {
      name: "decogest-profiles",
      version: 3,
      // v2: sócios de co-gestão. v3: imoveisAutoDeclarados nos anunciantes.
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as { profiles?: Profile[] };
        if (state.profiles && version < 3) {
          const presentes = new Set(state.profiles.map((p) => p.id));
          SEED.forEach((s) => {
            if (!presentes.has(s.id)) state.profiles!.push(s);
          });
          // Preencher imoveisAutoDeclarados dos perfis existentes a partir do SEED atualizado.
          const seedMap = new Map(SEED.map((s) => [s.id, s.imoveisAutoDeclarados] as const));
          state.profiles = state.profiles.map((p) => {
            const seedVal = seedMap.get(p.id);
            if (seedVal != null && p.imoveisAutoDeclarados == null) {
              return { ...p, imoveisAutoDeclarados: seedVal };
            }
            return p;
          });
        }
        return state as ProfilesState;
      },
    }
  )
);

export function useCurrentUser(): Profile | undefined {
  return useProfilesStore((s) => s.profiles.find((p) => p.id === CURRENT_USER_ID));
}
