import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PropType = "al" | "tradicional" | "estudantes" | "comercial";
export type PropStatus = "ocupado" | "disponivel" | "em_obras" | "inativo";

/** Foto de imóvel com legenda opcional. */
export interface PropertyPhoto {
  url: string;
  legenda?: string;
}

/** Normaliza fotos: aceita string[] (formato antigo) ou PropertyPhoto[] e devolve sempre PropertyPhoto[]. */
export function normalizePhotos(raw: unknown): PropertyPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) =>
    typeof p === "string" ? { url: p, legenda: undefined } : (p as PropertyPhoto)
  );
}

export type ClasseEnergetica = "A+" | "A" | "B" | "B-" | "C" | "D" | "E" | "F";
export type TipoRendaProposto = "arrendamento" | "al" | "estudantes" | "curta_duracao";
export type FrequenciaPagamento = "mensal" | "trimestral" | "semestral" | "anual";

export const CLASSE_ENERGETICA: ClasseEnergetica[] = ["A+", "A", "B", "B-", "C", "D", "E", "F"];

export const TIPO_RENDA_LABEL: Record<TipoRendaProposto, string> = {
  arrendamento: "Arrendamento tradicional (NRAU)",
  al: "Alojamento Local",
  estudantes: "Estudantes (ano letivo)",
  curta_duracao: "Curta duração",
};

export const FREQ_PAGAMENTO_LABEL: Record<FrequenciaPagamento, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export interface Property {
  id: string;
  /** userId do dono. Se omitido, assume-se o utilizador atual (retro-compat). */
  ownerId?: string;
  // A. Aquisição
  name: string;
  address: string;
  city: string;
  type: PropType;
  dataCompra: string; // YYYY-MM-DD
  valorCompra: number;
  entrada: number;
  financiado: number;
  prazoAnos: number;
  taxaJuro?: number; // %
  prestacaoMensal: number;
  // A.2 Morada detalhada (todos opcionais)
  morada2?: string;
  codigoPostal?: string;
  freguesia?: string;
  concelho?: string;
  distrito?: string;
  pais?: string;
  // A.3 Descrição física (todos opcionais)
  areaUtil?: number; // m²
  numDivisoes?: number;
  numQuartos?: number;
  numCasasBanho?: number;
  classeEnergetica?: ClasseEnergetica;
  descricao?: string;
  notaPrivada?: string;
  // B. Rendimentos
  rendaMensal: number;
  dataInicioArrendamento?: string;
  caucao?: number;
  tipoRendaProposto?: TipoRendaProposto;
  frequenciaPagamento?: FrequenciaPagamento;
  estadiaMinimaMeses?: number;
  estadiaMaximaMeses?: number;
  // C. Impostos
  irsPct: number; // 5/10/15/25/28
  // D. Despesas fixas
  imiAnual: number;
  seguroAnual: number;
  condominioMensal: number;
  outrasMensais: number;
  // E. Fotos
  photos: PropertyPhoto[];
  // estado
  status: PropStatus;
  createdAt: string;
}

export const PROP_TYPE_LABEL: Record<PropType, string> = {
  al: "Alojamento Local",
  tradicional: "Tradicional",
  estudantes: "Estudantes",
  comercial: "Comercial",
};

export const STATUS_LABEL: Record<PropStatus, string> = {
  ocupado: "Ocupado",
  disponivel: "Disponível",
  em_obras: "Em obras",
  inativo: "Inativo",
};

/**
 * Estado por defeito de um imóvel novo: Disponível.
 * Um imóvel só passa a "Ocupado" quando tem um inquilino associado
 * (sincronizado pelo useTenantsStore) — ter renda definida não ocupa nada.
 */
export function deriveStatus(_rendaMensal: number): PropStatus {
  return "disponivel";
}

export type PropertyInput = Omit<Property, "id" | "createdAt" | "status"> & {
  status?: PropStatus;
};

const SEED: Property[] = [
  {
    id: "seed-arroios",
    name: "T2 Arroios",
    address: "Rua de Arroios 112",
    city: "Lisboa",
    type: "tradicional",
    dataCompra: "2022-04-12",
    valorCompra: 245000,
    entrada: 73500,
    financiado: 171500,
    prazoAnos: 35,
    taxaJuro: 3.4,
    prestacaoMensal: 445,
    rendaMensal: 1350,
    dataInicioArrendamento: "2022-06-01",
    irsPct: 25,
    imiAnual: 320,
    seguroAnual: 180,
    condominioMensal: 45,
    outrasMensais: 30,
    photos: [
      { url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70", legenda: "Sala" },
      { url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=70", legenda: "Cozinha" },
      { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=70", legenda: "Quarto principal" },
      { url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=70", legenda: "Quarto 2" },
      { url: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=70", legenda: "WC" },
      { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70", legenda: "Hall" },
      { url: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=70", legenda: "Varanda" },
      { url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=70" },
    ],
    status: "ocupado",
    createdAt: "2022-04-12T00:00:00.000Z",
  },
  {
    id: "seed-porto-al",
    name: "Studio AL Baixa",
    address: "Rua das Flores 58",
    city: "Porto",
    type: "al",
    dataCompra: "2023-02-20",
    valorCompra: 130000,
    entrada: 40000,
    financiado: 90000,
    prazoAnos: 30,
    taxaJuro: 3.6,
    prestacaoMensal: 320,
    rendaMensal: 1100,
    dataInicioArrendamento: "2023-04-01",
    irsPct: 25,
    imiAnual: 200,
    seguroAnual: 150,
    condominioMensal: 35,
    outrasMensais: 25,
    photos: [
      { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70", legenda: "Sala" },
      { url: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=70", legenda: "Cozinha" },
    ],
    status: "ocupado",
    createdAt: "2023-02-20T00:00:00.000Z",
  },
  {
    id: "seed-coimbra",
    name: "T3 a remodelar — Coimbra",
    address: "Rua Lourenço de Almeida 33",
    city: "Coimbra",
    type: "tradicional",
    dataCompra: "2026-04-15",
    valorCompra: 210000,
    entrada: 60000,
    financiado: 150000,
    prazoAnos: 35,
    taxaJuro: 3.5,
    prestacaoMensal: 520,
    rendaMensal: 0,
    irsPct: 25,
    imiAnual: 280,
    seguroAnual: 170,
    condominioMensal: 50,
    outrasMensais: 20,
    photos: [
      { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70", legenda: "Sala (a remodelar)" },
    ],
    status: "em_obras",
    createdAt: "2026-04-15T00:00:00.000Z",
  },
  // Imóvel subjacente ao projeto colaborativo "Príncipe Real partilhado" (#003).
  {
    id: "seed-principe-real",
    ownerId: "me-daniel",
    name: "Apartamento Príncipe Real",
    address: "Rua da Escola Politécnica 20, 2.º Esq.",
    city: "Lisboa",
    type: "tradicional",
    dataCompra: "2026-03-05",
    valorCompra: 380000,
    entrada: 114000,
    financiado: 266000,
    prazoAnos: 35,
    taxaJuro: 3.5,
    prestacaoMensal: 580,
    rendaMensal: 1850,
    dataInicioArrendamento: "2026-02-01",
    irsPct: 25,
    imiAnual: 420,
    seguroAnual: 220,
    condominioMensal: 80,
    outrasMensais: 0,
    photos: [
      { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70", legenda: "Sala" },
      { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70", legenda: "Cozinha" },
      { url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70", legenda: "Quarto" },
    ],
    status: "ocupado",
    createdAt: "2026-03-05T00:00:00.000Z",
  },
];

interface PropertiesState {
  properties: Property[];
  add: (data: PropertyInput) => string;
  update: (id: string, patch: Partial<Property>) => void;
  remove: (id: string) => void;
  getById: (id: string) => Property | undefined;
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => ({
      properties: SEED,
      add: (data) => {
        const id = uid();
        const property: Property = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
          status: data.status ?? deriveStatus(data.rendaMensal),
        };
        set((s) => ({ properties: [property, ...s.properties] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({
          properties: s.properties.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  // Alterar a renda não mexe na ocupação — só um patch explícito
                  // (ou a sincronização com inquilinos) muda o status.
                  status: patch.status ?? p.status,
                }
              : p
          ),
        })),
      remove: (id) => set((s) => ({ properties: s.properties.filter((p) => p.id !== id) })),
      getById: (id) => get().properties.find((p) => p.id === id),
      resetSeed: () => set({ properties: SEED }),
    }),
    {
      name: "decogest-properties",
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { properties?: Property[] } | undefined;
        if (state?.properties && version < 2) {
          // v1 guardava fotos como string[] — converter para PropertyPhoto[].
          state.properties = state.properties.map((p) => ({
            ...p,
            photos: normalizePhotos(p.photos as unknown),
          }));
        }
        if (state?.properties && version < 3) {
          // v3: imóvel subjacente ao projeto colaborativo Príncipe Real.
          const ids = new Set(state.properties.map((p) => p.id));
          SEED.forEach((s) => { if (!ids.has(s.id)) state.properties!.push(s); });
        }
        if (state?.properties && version < 4) {
          // v4: taxa especial cat. F é 25% desde 2023 — atualizar seeds a 28%.
          const seedIds = new Set(SEED.map((s) => s.id));
          state.properties = state.properties.map((p) =>
            seedIds.has(p.id) && p.irsPct === 28 ? { ...p, irsPct: 25 } : p
          );
        }
        return state as PropertiesState;
      },
    }
  )
);
