import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePropertiesStore } from "./usePropertiesStore";

export type TipoInquilino = "regular" | "estudante";
export type StatusInquilino = "ativo" | "expirado" | "sem_contrato";
export type DocTipo = "CC" | "Passaporte" | "Outro";

export interface DocIdentificacao {
  tipo: DocTipo;
  numero: string;
  validade: string; // YYYY-MM-DD
}

export interface Tenant {
  id: string;
  nomeCompleto: string;
  nif: string;
  email: string;
  telefone: string;
  nacionalidade: string;
  docIdentificacao: DocIdentificacao;
  // Regular
  entidadePatronal: string;
  rendimentoMensal: number;
  // Tipo
  tipoInquilino: TipoInquilino;
  // Estudante
  universidade?: string;
  curso?: string;
  anoLetivo?: string;
  // Associação
  propertyId?: string;
  contractId?: string;
  status: StatusInquilino;
  rendaMensal?: number;       // do contrato ativo
  dataInicioContrato?: string;
  dataFimContrato?: string;
  // Extras
  fotoUrl?: string;
  notas: string;
  createdAt: string;
}

export type TenantInput = Omit<Tenant, "id" | "createdAt">;

export const TIPO_LABEL: Record<TipoInquilino, string> = {
  regular: "Regular",
  estudante: "Estudante",
};

export const STATUS_LABEL: Record<StatusInquilino, string> = {
  ativo: "Ativo",
  expirado: "Expirado",
  sem_contrato: "Sem contrato",
};

const SEED: Tenant[] = [
  {
    id: "tenant-ana-martins",
    nomeCompleto: "Ana Martins",
    nif: "234567890",
    email: "ana@email.pt",
    telefone: "912 345 678",
    nacionalidade: "Portuguesa",
    docIdentificacao: { tipo: "CC", numero: "12345678", validade: "2031-08-12" },
    entidadePatronal: "Tech SA",
    rendimentoMensal: 1800,
    tipoInquilino: "regular",
    propertyId: "seed-arroios",
    contractId: "contrato-arroios",
    status: "ativo",
    rendaMensal: 1350,
    dataInicioContrato: "2024-05-01",
    dataFimContrato: "2027-04-30",
    fotoUrl: "https://i.pravatar.cc/200?img=47",
    notas: "Inquilina exemplar — paga sempre dentro do prazo.",
    createdAt: "2024-04-15T10:00:00.000Z",
  },
  {
    id: "tenant-tiago-nunes",
    nomeCompleto: "Tiago Nunes",
    nif: "501234567",
    email: "tiago.nunes@email.pt",
    telefone: "936 222 111",
    nacionalidade: "Portuguesa",
    docIdentificacao: { tipo: "CC", numero: "20987654", validade: "2028-04-20" },
    entidadePatronal: "Café Trindade Lda.",
    rendimentoMensal: 1450,
    tipoInquilino: "regular",
    propertyId: "seed-porto-al",
    contractId: "contrato-porto",
    status: "ativo",
    rendaMensal: 1100,
    dataInicioContrato: "2025-04-01",
    dataFimContrato: "2026-07-15",
    fotoUrl: "https://i.pravatar.cc/200?img=12",
    notas: "Contrato termina em julho — confirmar se renova.",
    createdAt: "2025-03-20T09:30:00.000Z",
  },
  {
    id: "tenant-ines-marques",
    nomeCompleto: "Inês Marques",
    nif: "278456901",
    email: "ines.marques@academico.pt",
    telefone: "924 999 333",
    nacionalidade: "Portuguesa",
    docIdentificacao: { tipo: "CC", numero: "33445566", validade: "2030-02-28" },
    entidadePatronal: "—",
    rendimentoMensal: 0,
    tipoInquilino: "estudante",
    universidade: "Universidade de Coimbra",
    curso: "Engenharia Informática",
    anoLetivo: "3.º ano",
    propertyId: "seed-coimbra",
    status: "sem_contrato",
    rendaMensal: 280,
    fotoUrl: "https://i.pravatar.cc/200?img=44",
    notas: "Pré-reserva quarto para o ano letivo 2026/2027.",
    createdAt: "2026-06-01T14:20:00.000Z",
  },
  {
    id: "tenant-pedro-costa",
    nomeCompleto: "Pedro Costa",
    nif: "489123564",
    email: "pedro.costa@academico.pt",
    telefone: "925 111 222",
    nacionalidade: "Portuguesa",
    docIdentificacao: { tipo: "CC", numero: "44556677", validade: "2029-11-10" },
    entidadePatronal: "—",
    rendimentoMensal: 0,
    tipoInquilino: "estudante",
    universidade: "Universidade de Coimbra",
    curso: "Medicina",
    anoLetivo: "2.º ano",
    propertyId: "seed-coimbra",
    contractId: "contrato-coimbra-q2",
    status: "ativo",
    rendaMensal: 320,
    dataInicioContrato: "2025-09-01",
    dataFimContrato: "2026-07-31",
    fotoUrl: "https://i.pravatar.cc/200?img=14",
    notas: "Quarto 2 · Apartamento Coimbra.",
    createdAt: "2025-08-25T11:00:00.000Z",
  },
  {
    id: "tenant-sofia-rocha",
    nomeCompleto: "Sofia Rocha",
    nif: "245678123",
    email: "sofia.rocha@email.pt",
    telefone: "913 555 210",
    nacionalidade: "Portuguesa",
    docIdentificacao: { tipo: "CC", numero: "55667788", validade: "2030-05-18" },
    entidadePatronal: "Consultora Vieira & Associados",
    rendimentoMensal: 2600,
    tipoInquilino: "regular",
    propertyId: "seed-principe-real",
    contractId: "contrato-principe-real",
    status: "ativo",
    rendaMensal: 1850,
    dataInicioContrato: "2026-02-01",
    dataFimContrato: "2029-01-31",
    fotoUrl: "https://i.pravatar.cc/200?img=32",
    notas: "Apartamento Príncipe Real partilhado — projeto colaborativo #003.",
    createdAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "tenant-rita-soares",
    nomeCompleto: "Rita Soares",
    nif: "612345789",
    email: "rita.soares@email.pt",
    telefone: "910 888 444",
    nacionalidade: "Brasileira",
    docIdentificacao: { tipo: "Passaporte", numero: "FA987654", validade: "2027-06-30" },
    entidadePatronal: "Freelancer · Design",
    rendimentoMensal: 1650,
    tipoInquilino: "regular",
    status: "expirado",
    rendaMensal: 850,
    dataInicioContrato: "2023-10-01",
    dataFimContrato: "2026-04-30",
    fotoUrl: "https://i.pravatar.cc/200?img=48",
    notas: "Contrato terminou — saiu em maio. Mantém ficha por histórico.",
    createdAt: "2023-09-15T08:00:00.000Z",
  },
];

interface TenantsState {
  tenants: Tenant[];
  add: (data: TenantInput) => string;
  update: (id: string, patch: Partial<Tenant>) => void;
  remove: (id: string) => void;
  getById: (id: string) => Tenant | undefined;
  byProperty: (propertyId: string) => Tenant[];
  resetSeed: () => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A ocupação do imóvel deriva dos inquilinos: com inquilino ativo associado →
 * "ocupado"; sem nenhum → "disponivel". Estados manuais (em_obras/inativo)
 * nunca são alterados por aqui.
 */
function sincronizarOcupacao(...propertyIds: (string | undefined)[]) {
  const props = usePropertiesStore.getState();
  for (const pid of propertyIds) {
    if (!pid) continue;
    const prop = props.properties.find((p) => p.id === pid);
    if (!prop || prop.status === "em_obras" || prop.status === "inativo") continue;
    const temInquilino = useTenantsStore
      .getState()
      .tenants.some((t) => t.propertyId === pid && t.status !== "expirado");
    const alvo = temInquilino ? "ocupado" : "disponivel";
    if (prop.status !== alvo) props.update(pid, { status: alvo });
  }
}

export const useTenantsStore = create<TenantsState>()(
  persist(
    (set, get) => ({
      tenants: SEED,
      add: (data) => {
        const id = uid();
        const tenant: Tenant = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ tenants: [tenant, ...s.tenants] }));
        sincronizarOcupacao(data.propertyId);
        return id;
      },
      update: (id, patch) => {
        const antes = get().tenants.find((t) => t.id === id)?.propertyId;
        set((s) => ({
          tenants: s.tenants.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
        sincronizarOcupacao(antes, patch.propertyId ?? get().tenants.find((t) => t.id === id)?.propertyId);
      },
      remove: (id) => {
        const antes = get().tenants.find((t) => t.id === id)?.propertyId;
        set((s) => ({ tenants: s.tenants.filter((t) => t.id !== id) }));
        sincronizarOcupacao(antes);
      },
      getById: (id) => get().tenants.find((t) => t.id === id),
      byProperty: (propertyId) => get().tenants.filter((t) => t.propertyId === propertyId),
      resetSeed: () => set({ tenants: SEED }),
    }),
    {
      name: "redegest-tenants",
      version: 3,
      // v2: limpa entradas de exemplo vazias/stray. v3: inquilino do Príncipe Real.
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as { tenants?: Tenant[] };
        if (state.tenants && version < 2) {
          const seedIds = new Set(SEED.map((t) => t.id));
          state.tenants = state.tenants.filter((t) => {
            if (seedIds.has(t.id)) return true;
            const nome = (t.nomeCompleto ?? "").trim();
            const semDados = nome.length < 3 || (!t.email && !t.telefone && !t.nif && !t.rendaMensal);
            return !semDados; // remove os vazios/stray
          });
          const presentes = new Set(state.tenants.map((t) => t.id));
          SEED.forEach((s) => { if (!presentes.has(s.id)) state.tenants!.unshift(s); });
        }
        if (state.tenants && version < 3) {
          const presentes = new Set(state.tenants.map((t) => t.id));
          SEED.forEach((s) => { if (!presentes.has(s.id)) state.tenants!.unshift(s); });
        }
        return state as TenantsState;
      },
    }
  )
);

// ───────────────────────── Helpers ─────────────────────────

export type UrgenciaContrato = "expirado" | "urgente" | "proximo" | "calmo" | "sem";

/** Urgência do fim do contrato a partir da data atual. */
export function urgenciaContrato(dataFim?: string): UrgenciaContrato {
  if (!dataFim) return "sem";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(`${dataFim}T00:00:00`);
  const diff = Math.round((fim.getTime() - hoje.getTime()) / 86400000);
  if (diff < 0) return "expirado";
  if (diff < 30) return "urgente";
  if (diff < 90) return "proximo";
  return "calmo";
}

export function diasAteFim(dataFim?: string): number | null {
  if (!dataFim) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(`${dataFim}T00:00:00`);
  return Math.round((fim.getTime() - hoje.getTime()) / 86400000);
}
